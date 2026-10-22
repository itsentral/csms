<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vendor;
use App\Notifications\VendorStatusChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class Portal
{
    public static function authorize(User $u, Vendor $v): void
    {
        abort_unless($u->hasRole('verifikator', 'validator', 'pengadaan') || ($u->hasRole('vendor') && $v->owner_id === $u->id), 403);
    }

    public static function role(User $u, string ...$roles): void
    {
        abort_unless($u->hasRole(...$roles), 403);
    }

    public static function audit(string $action, ?string $vendor = null, array $details = []): void
    {
        DB::table('audit_logs')->insert(['user_id' => auth()->id(), 'vendor_id' => $vendor, 'action' => $action, 'details' => json_encode($details), 'ip' => request()->ip(), 'created_at' => now()]);
    }

    public static function isHiddenDraft(User $u, Vendor $v): bool
    {
        return $v->status === 'Menunggu Pengisian' && $v->owner_id !== $u->id && ! $u->hasRole('admin');
    }

    public static function maxTotal(): float
    {
        return (float) DB::table('questions')->sum('max');
    }

    /** Email notifikasi perubahan status (bila NOTIFY_EMAIL aktif). Kegagalan kirim tidak boleh menggagalkan alur kerja. */
    public static function notify(Vendor $v, string $event): void
    {
        if (! config('rchsems.notify_email')) {
            return;
        }
        try {
            $byRole = fn (string $role) => User::where('active', true)->whereJsonContains('roles', $role)->get();
            $owner = User::where('active', true)->whereKey($v->owner_id)->get();
            $recipients = match ($event) {
                'submitted' => $byRole('verifikator'),'advanced' => $byRole('validator'),'returned' => $owner,'finalized' => $owner->merge($byRole('pengadaan')),default => collect()
            };
            if ($recipients->isEmpty()) {
                return;
            }
            Notification::send($recipients->unique('id'), (new VendorStatusChanged($v->name ?: $v->id, $event))->locale(config('app.locale')));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public static function category(float $n): string
    {
        return $n >= 70 ? 'Risiko Tinggi' : ($n >= 50 ? 'Risiko Menengah' : ($n >= 35 ? 'Risiko Rendah' : 'Tidak Lulus'));
    }

    public static function serialize(Vendor $v): array
    {
        return self::serializeMany([$v])[$v->id];
    }

    /** Serialize many vendors with a fixed number of queries; returns payloads keyed by vendor id. */
    public static function serializeMany(iterable $vendors): array
    {
        $vendors = collect($vendors);
        $ids = $vendors->pluck('id')->all();
        if (! $ids) {
            return [];
        }
        $max = DB::table('questions')->pluck('max', 'id');
        $totalQuestions = $max->count();
        $answers = DB::table('answers')->whereIn('vendor_id', $ids)->get()->groupBy('vendor_id');
        $evidence = DB::table('evidence')->whereIn('vendor_id', $ids)->get()->groupBy('vendor_id');
        $assessments = DB::table('assessments')->join('users', 'users.id', '=', 'assessments.user_id')->whereIn('assessments.vendor_id', $ids)->select('assessments.*', 'users.email', 'users.name')->get()->groupBy('vendor_id');
        $scores = DB::table('assessment_scores')->whereIn('assessment_id', $assessments->flatten(1)->pluck('id')->all())->get()->groupBy('assessment_id');
        $out = [];
        foreach ($vendors as $v) {
            $data = $v->toArray();
            unset($data['owner_id'],$data['final_snapshot']);
            $data['created'] = substr($v->created_at, 0, 10);
            $list = [];
            $answered = 0;
            foreach ($answers[$v->id] ?? [] as $a) {
                $list[$a->question_id] = ['answer' => $a->answer, 'note' => $a->note, 'files' => []];
                if ($a->answer === 'Ya' || $a->answer === 'Tidak') {
                    $answered++;
                }
            }
            foreach ($evidence[$v->id] ?? [] as $f) {
                $list[$f->question_id] ??= ['answer' => '', 'note' => '', 'files' => []];
                $list[$f->question_id]['files'][] = ['id' => $f->id, 'name' => $f->name, 'size' => $f->size, 'type' => $f->mime];
            }
            $data['docs'] = new \stdClass;
            $data['review'] = new \stdClass;
            $data['validation'] = new \stdClass;
            $totals = [];
            foreach (['review', 'validation'] as $stage) {
                $records = [];
                $perQuestion = [];
                foreach (($assessments[$v->id] ?? collect())->where('stage', $stage) as $a) {
                    $byQuestion = [];
                    foreach ($scores[$a->id] ?? [] as $s) {
                        $byQuestion[$s->question_id] = ['score' => (float) $s->score, 'comment' => $s->comment];
                        $perQuestion[$s->question_id][] = (float) $s->score;
                    }
                    $records[$a->email] = ['name' => $a->name, 'date' => $a->updated_at, 'scores' => (object) $byQuestion];
                }
                $data[$stage.'ByUser'] = (object) $records;
                $sum = 0.0;
                foreach ($perQuestion as $qid => $values) {
                    $sum += array_sum($values) / count($values) * (float) ($max[$qid] ?? 0);
                }
                $totals[$stage] = $sum;
            }
            $data['answers'] = (object) $list;
            $data['totals'] = $totals;
            $data['answered'] = $answered;
            $data['total'] = $totalQuestions;
            $data['draft_saved_at'] = $v->draft_saved_at?->toIso8601String();
            $out[$v->id] = $data;
        }

        return $out;
    }

    public static function total(string $id, string $stage): float
    {
        return (float) DB::query()->fromSub(DB::table('assessment_scores as s')->join('assessments as a', 'a.id', '=', 's.assessment_id')->join('questions as q', 'q.id', '=', 's.question_id')->where('a.vendor_id', $id)->where('a.stage',$stage)->groupBy('s.question_id','q.max')->selectRaw('AVG(s.score) * q.max as weighted'), 'totals')->sum('weighted');
    }
}
