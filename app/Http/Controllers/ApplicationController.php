<?php

namespace App\Http\Controllers;

use App\Models\ApplicationCriterion;
use App\Models\Criterion;
use App\Models\EvidenceDocument;
use App\Models\RchsemsApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $q = RchsemsApplication::with('vendor.user')->latest();
        if ($request->user()->hasRole('vendor')) {
            $q->whereHas('vendor', fn ($v) => $v->where('user_id', $request->user()->id));
        }

        return view('applications.index', ['applications' => $q->paginate(15)]);
    }

    public function create()
    {
        abort_unless(auth()->user()->hasRole('vendor') && auth()->user()->vendorProfile, 403);

        return view('applications.create');
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasRole('vendor') && $request->user()->vendorProfile, 403);
        $data = $request->validate(['scope' => 'required|string|max:255']);
        $application = DB::transaction(function () use ($request, $data) {
            $app = RchsemsApplication::create([
                'vendor_profile_id' => $request->user()->vendorProfile->id,
                'registration_number' => 'RCH-'.now()->format('Ymd').'-'.strtoupper(Str::random(5)),
                'scope' => $data['scope'], 'status' => 'draft',
            ]);
            foreach (Criterion::where('is_active', true)->orderBy('sort_order')->get() as $criterion) {
                ApplicationCriterion::create(['application_id' => $app->id, 'criterion_id' => $criterion->id]);
            }

            return $app;
        });

        return redirect()->route('applications.edit', $application)->with('status', 'Pengajuan dibuat. Lengkapi jawaban dan lampiran.');
    }

    public function edit(Request $request, RchsemsApplication $application)
    {
        $this->authorizeApplication($request, $application);
        $application->load('criteria.criterion', 'criteria.documents');

        return view('applications.edit', compact('application'));
    }

    public function saveCriterion(Request $request, RchsemsApplication $application, ApplicationCriterion $applicationCriterion)
    {
        $this->authorizeApplication($request, $application);
        abort_unless($applicationCriterion->application_id === $application->id, 404);
        abort_unless($application->status === 'draft', 403, 'Pengajuan sudah dikirim dan tidak dapat diubah vendor.');
        $data = $request->validate(['vendor_answer' => 'nullable|string|max:10000', 'vendor_comment' => 'nullable|string|max:3000']);
        $applicationCriterion->update($data);
        if ($request->hasFile('documents')) {
            $request->validate(['documents' => 'array', 'documents.*' => 'file|max:15360|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png']);
            foreach ($request->file('documents') as $file) {
                $path = $file->store('evidence/'.$application->id, 'local');
                $applicationCriterion->documents()->create([
                    'uploaded_by' => $request->user()->id, 'original_name' => $file->getClientOriginalName(),
                    'storage_path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(),
                ]);
            }
        }

        return back()->with('status', 'Jawaban dan dokumen disimpan.');
    }

    public function submit(Request $request, RchsemsApplication $application)
    {
        $this->authorizeApplication($request, $application);
        abort_unless($application->status === 'draft', 403);
        $application->update(['status' => 'submitted', 'submitted_at' => now()]);

        return redirect()->route('applications.index')->with('status', 'Pengajuan dikirim untuk verifikasi.');
    }

    public function downloadDocument(Request $request, EvidenceDocument $document)
    {
        $application = $document->applicationCriterion->application;
        $user = $request->user();
        $isOwner = $user->hasRole('vendor') && $application->vendor->user_id === $user->id;
        abort_unless($isOwner || $user->hasAnyRole(['admin', 'verifikator', 'validator', 'pengadaan']), 403);
        abort_unless(Storage::disk('local')->exists($document->storage_path), 404);

        return Storage::disk('local')->download($document->storage_path, $document->original_name);
    }

    private function authorizeApplication(Request $request, RchsemsApplication $application): void
    {
        $user = $request->user();
        abort_unless($user->hasRole('admin') || ($user->hasRole('vendor') && $application->vendor->user_id === $user->id) || $user->hasAnyRole(['verifikator', 'validator', 'pengadaan']), 403);
    }
}
