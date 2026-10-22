<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveAnswersRequest;
use App\Http\Requests\SaveProfileRequest;
use App\Models\Vendor;
use App\Services\Portal;
use App\Services\PortalState;
use App\Services\VendorExport;
use App\Services\VendorService;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function __construct(private VendorService $vendors) {}

    public function state(Request $r)
    {
        return PortalState::for($r->user());
    }

    public function profile(SaveProfileRequest $r, ?Vendor $vendor = null)
    {
        return $this->vendors->saveProfile($r->user(), $vendor, $r->validated());
    }

    public function answers(SaveAnswersRequest $r, Vendor $vendor)
    {
        return $this->vendors->saveAnswers($vendor, $r->validated()['answers']);
    }

    public function submit(Request $r, Vendor $vendor)
    {
        Portal::role($r->user(), 'vendor');
        Portal::authorize($r->user(), $vendor);

        return $this->vendors->submit($vendor);
    }

    public function destroy(Request $r, Vendor $vendor)
    {
        Portal::role($r->user(), 'admin');

        return $this->vendors->destroy($vendor);
    }

    public function export(Request $r)
    {
        Portal::audit('export');
        $lang = $r->query('lang') === 'en' ? 'en' : 'id';
        $path = tempnam(sys_get_temp_dir(), 'rchx');
        try {
            VendorExport::build(PortalState::for($r->user())['vendors'], $lang, $path);
        } catch (\Throwable $e) {
            @unlink($path);
            throw $e;
        }

        return response()->download($path, 'csms-vendors-'.date('Ymd').'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend(true);
    }
}
