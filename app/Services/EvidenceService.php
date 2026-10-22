<?php

namespace App\Services;

use App\Enums\VendorStatus;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Lampiran bukti: disimpan privat di disk `local`, hanya diunduh lewat endpoint berotorisasi. */
class EvidenceService
{
    public function __construct(private VendorService $vendors) {}

    public function upload(User $user, Vendor $vendor, string $questionId, UploadedFile $file): array
    {
        return DB::transaction(function () use ($user, $vendor, $questionId, $file) {
            $v = $this->vendors->lock($vendor);
            abort_unless(in_array($v->status, VendorStatus::editable()), 409, __('portal.attachments_locked'));
            $id = (string) Str::uuid();
            $path = $file->store('evidence/'.$vendor->id, 'local');
            try {
                DB::table('evidence')->insert([
                    'id' => $id, 'vendor_id' => $v->id, 'question_id' => $questionId, 'uploaded_by' => $user->id,
                    'name' => mb_substr(basename($file->getClientOriginalName()), 0, 240), 'path' => $path,
                    'mime' => $file->getMimeType(), 'size' => $file->getSize(), 'created_at' => now(), 'updated_at' => now(),
                ]);
                $v->update(['draft_saved_at' => now()]);
                Portal::audit('evidence_uploaded', $v->id, ['id' => $id]);
            } catch (\Throwable $e) {
                Storage::disk('local')->delete($path);
                throw $e;
            }

            return ['id' => $id, 'name' => $file->getClientOriginalName(), 'size' => $file->getSize(), 'type' => $file->getMimeType()];
        });
    }

    public function destroy(User $user, string $id): array
    {
        $file = DB::table('evidence')->where('id', $id)->first();
        abort_unless($file, 404);
        $v = Vendor::findOrFail($file->vendor_id);
        $isOwner = $v->owner_id === $user->id;
        abort_unless($isOwner || $user->hasRole('admin'), 403, __('portal.delete_attachment_forbidden'));
        if ($isOwner) {
            abort_unless(in_array($v->status, VendorStatus::editable()), 409, __('portal.attachments_locked_after_submit'));
        }
        DB::transaction(fn () => DB::table('evidence')->where('id', $file->id)->delete());
        Storage::disk('local')->delete($file->path);
        Portal::audit('evidence_deleted', $file->vendor_id, ['id' => $file->id, 'question_id' => $file->question_id, 'name' => $file->name]);

        return ['ok' => true];
    }
}
