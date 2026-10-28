<?php

namespace App\Services;

use App\Enums\VendorStatus;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Vendor profile, answers, submission, and deletion. Every change locks its row (lockForUpdate). */
class VendorService
{
    public function saveProfile(User $user, ?Vendor $vendor, array $data): array
    {
        return DB::transaction(function () use ($user, $vendor, $data) {
            if ($vendor) {
                $vendor = Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();
                Portal::authorize($user, $vendor);
                abort_unless(in_array($vendor->status, VendorStatus::editable()), 409, __('portal.profile_locked'));
            } else {
                $vendor = new Vendor(['id' => 'RCH-'.date('Y').'-'.Str::upper(Str::random(12)), 'owner_id' => $user->id, 'status' => VendorStatus::AwaitingFill->value]);
            }
            $vendor->fill(array_map(fn ($x) => $x ?? '', $data));
            $vendor->save();
            Portal::audit('vendor_saved', $vendor->id);

            return Portal::serialize($vendor);
        });
    }

    public function saveAnswers(Vendor $vendor, array $answers): array
    {
        return DB::transaction(function () use ($vendor, $answers) {
            $v = $this->lock($vendor);
            abort_unless(in_array($v->status, VendorStatus::editable()), 409, __('portal.submission_locked'));
            $rows = [];
            foreach ($answers as $a) {
                $rows[] = ['vendor_id' => $v->id, 'question_id' => $a['question_id'], 'answer' => $a['answer'] ?? '', 'note' => $a['note'] ?? '', 'updated_at' => now(), 'created_at' => now()];
            }
            if ($rows) {
                DB::table('answers')->upsert($rows, ['vendor_id', 'question_id'], ['answer', 'note', 'updated_at']);
            }
            $v->update(['draft_saved_at' => now()]);

            return ['ok' => true, 'answered' => $this->answeredCount($v->id), 'total' => DB::table('questions')->count(), 'draft_saved_at' => $v->draft_saved_at?->toIso8601String()];
        });
    }

    public function submit(Vendor $vendor): array
    {
        $out = DB::transaction(function () use ($vendor) {
            $v = $this->lock($vendor);
            abort_unless(in_array($v->status, VendorStatus::editable()), 409, __('portal.submission_locked'));
            $total = DB::table('questions')->count();
            $answered = $this->answeredCount($v->id);
            if ($answered !== $total) {
                $done = DB::table('answers')->where('vendor_id', $v->id)->whereIn('answer', ['Ya', 'Tidak'])->pluck('question_id')->all();
                $missing = DB::table('questions')->orderBy('position')->pluck('id')->reject(fn ($id) => in_array($id, $done, true))->values()->all();
                throw new HttpResponseException(response()->json(['message' => __('portal.incomplete', ['total' => $total]), 'missing' => $missing, 'answered' => $answered, 'total' => $total], 422));
            }
            // Resubmitting after a correction starts a new assessment round; the old scores remain in the audit log.
            if ($v->status === VendorStatus::NeedsRevision->value) {
                Portal::audit('previous_round_archived', $v->id, Portal::serialize($v));
                DB::table('assessments')->where('vendor_id', $v->id)->delete();
            }
            $v->update(['status' => VendorStatus::AwaitingVerification->value, 'draft_saved_at' => now()]);
            Portal::audit('questionnaire_submitted', $v->id);

            return [$v, Portal::serialize($v)];
        });
        Portal::notify($out[0], 'submitted');

        return $out[1];
    }

    /** Deletes a vendor together with all its data and attachment files. */
    public function destroy(Vendor $vendor): array
    {
        $out = DB::transaction(function () use ($vendor) {
            $v = $this->lock($vendor);
            $assessmentIds = DB::table('assessments')->where('vendor_id', $v->id)->pluck('id');
            $paths = DB::table('evidence')->where('vendor_id', $v->id)->pluck('path');
            $counts = [
                'name' => $v->name,
                'answers' => DB::table('answers')->where('vendor_id', $v->id)->count(),
                'evidence' => $paths->count(),
                'assessments' => $assessmentIds->count(),
                'scores' => DB::table('assessment_scores')->whereIn('assessment_id', $assessmentIds)->count(),
            ];
            DB::table('assessment_scores')->whereIn('assessment_id', $assessmentIds)->delete();
            DB::table('assessments')->where('vendor_id', $v->id)->delete();
            DB::table('evidence')->where('vendor_id', $v->id)->delete();
            DB::table('answers')->where('vendor_id', $v->id)->delete();
            $v->delete();

            return ['paths' => $paths, 'counts' => $counts];
        });
        // Files are deleted after the database rows are saved, so a rollback never deletes files.
        foreach ($out['paths'] as $path) {
            Storage::disk('local')->delete($path);
        }
        Storage::disk('local')->deleteDirectory('evidence/'.$vendor->id);
        Portal::audit('vendor_deleted', $vendor->id, $out['counts']);

        return ['ok' => true, 'deleted' => $out['counts']];
    }

    public function lock(Vendor $vendor): Vendor
    {
        return Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();
    }

    public function answeredCount(string $vendorId): int
    {
        return DB::table('answers')->where('vendor_id', $vendorId)->whereIn('answer', ['Ya', 'Tidak'])->distinct('question_id')->count('question_id');
    }
}
