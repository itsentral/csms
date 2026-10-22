<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadEvidenceRequest;
use App\Models\Vendor;
use App\Services\EvidenceService;
use App\Services\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EvidenceController extends Controller
{
    public function __construct(private EvidenceService $evidence) {}

    public function upload(UploadEvidenceRequest $r, Vendor $vendor)
    {
        return $this->evidence->upload($r->user(), $vendor, $r->validated()['question_id'], $r->file('file'));
    }

    public function download(Request $r, string $id)
    {
        $file = DB::table('evidence')->where('id', $id)->first();
        abort_unless($file, 404);
        $vendor = Vendor::findOrFail($file->vendor_id);
        Portal::authorize($r->user(), $vendor);
        abort_if(Portal::isHiddenDraft($r->user(), $vendor), 403, __('portal.draft_attachment_forbidden'));
        Portal::audit('evidence_downloaded', $file->vendor_id, ['id' => $id]);

        return Storage::disk('local')->download($file->path, $file->name, ['X-Content-Type-Options' => 'nosniff']);
    }

    public function destroy(Request $r, string $id)
    {
        return $this->evidence->destroy($r->user(), $id);
    }
}
