<?php

namespace App\Services;

use App\Enums\VendorStatus;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;

/** Verifier (stage `review`) and validator (stage `validation`) assessments, with their status transitions. */
class AssessmentService
{
    private const EVENTS = ['advance' => 'advanced', 'return' => 'returned', 'finalize' => 'finalized'];

    public function __construct(private VendorService $vendors) {}

    public function save(User $user, Vendor $vendor, string $stage, array $d): array
    {
        abort_unless(count($d['scores']) === DB::table('questions')->count(), 422, __('portal.all_criteria'));
        abort_if(($stage === 'review' && $d['action'] === 'finalize') || ($stage === 'validation' && in_array($d['action'], ['advance', 'return'])), 422);

        $out = DB::transaction(function () use ($user, $vendor, $stage, $d) {
            $v = $this->vendors->lock($vendor);
            // Verification scores may still be saved after another verifier has forwarded the vendor; only advance/return
            // require the verification stage.
            $allowed = $stage === 'review'
                ? ($d['action'] === 'save' ? [VendorStatus::AwaitingVerification->value, VendorStatus::AwaitingValidation->value] : [VendorStatus::AwaitingVerification->value])
                : [VendorStatus::AwaitingValidation->value];
            abort_unless(in_array($v->status, $allowed, true), 409, __('portal.stage_mismatch'));
            if ($d['action'] === 'finalize') {
                abort_unless(! empty($d['fieldDate']) && ! empty($d['fieldLocation']) && ($d['fieldResult'] ?? 'Belum dilakukan') !== 'Belum dilakukan', 422, __('portal.field_validation_incomplete'));
            }

            $metadata = array_intersect_key($d, array_flip($stage === 'review' ? ['docDate', 'evaluator'] : ['fieldDate', 'validator', 'fieldLocation', 'fieldResult']));
            $assessmentId = $this->storeScores($user, $v, $stage, $metadata, $d['scores']);
            foreach ($metadata as $key => $value) {
                $v->$key = $value ?? (in_array($key, ['docDate', 'fieldDate']) ? null : '');
            }
            $this->transition($v, $d['action']);
            $v->save();
            Portal::audit($stage.'_'.$d['action'], $v->id, ['assessment_id' => $assessmentId, 'scores' => $d['scores'], 'metadata' => $metadata]);

            return [$v, Portal::serialize($v)];
        });

        if ($event = self::EVENTS[$d['action']] ?? null) {
            Portal::notify($out[0], $event);
        }

        return $out[1];
    }

    private function storeScores(User $user, Vendor $v, string $stage, array $metadata, array $scores): int
    {
        $key = ['vendor_id' => $v->id, 'user_id' => $user->id, 'stage' => $stage];
        $values = ['metadata' => json_encode($metadata), 'updated_at' => now()];
        $existing = DB::table('assessments')->where($key)->first();
        if ($existing) {
            $id = $existing->id;
            DB::table('assessments')->where('id', $id)->update($values);
        } else {
            $id = DB::table('assessments')->insertGetId($key + $values + ['created_at' => now()]);
        }
        foreach ($scores as $s) {
            DB::table('assessment_scores')->updateOrInsert(['assessment_id' => $id, 'question_id' => $s['question_id']], ['score' => $s['score'], 'comment' => $s['comment'] ?? '']);
        }

        return $id;
    }

    private function transition(Vendor $v, string $action): void
    {
        if ($action === 'advance') {
            $v->status = VendorStatus::AwaitingValidation->value;
        } elseif ($action === 'return') {
            $v->status = VendorStatus::NeedsRevision->value;
        } elseif ($action === 'finalize') {
            $v->status = VendorStatus::Validated->value;
            $total = Portal::total($v->id, 'validation');
            $max = Portal::maxTotal();
            $v->finalRisk = Portal::category($total / $max * 100);
            $v->finalizedAt = now();
            $v->final_snapshot = ['total' => $total, 'percentage' => $total / $max * 100, 'category' => $v->finalRisk, 'scope' => $v->scope, 'name' => $v->name, 'fieldDate' => $v->fieldDate];
        }
    }
}
