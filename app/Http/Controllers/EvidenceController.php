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
    /** File types a browser can show in a tab; everything else is downloaded. */
    private const INLINE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

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

        $headers = ['X-Content-Type-Options' => 'nosniff'];
        if (in_array($file->mime, self::INLINE_TYPES, true)) {
            // Shown in the browser tab (the UI opens attachments in a new tab). These types cannot run scripts, and the
            // response gets its own CSP because the app-wide one (object-src 'none') would stop a PDF viewer from loading.
            $headers['Content-Type'] = $file->mime;
            $headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'self'";

            return Storage::disk('local')->response($file->path, $file->name, $headers);
        }

        // Word and Excel files cannot be shown by a browser, so they are downloaded.
        return Storage::disk('local')->download($file->path, $file->name, $headers);
    }

    public function destroy(Request $r, string $id)
    {
        return $this->evidence->destroy($r->user(), $id);
    }
}
