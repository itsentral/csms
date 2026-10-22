<?php

namespace App\Http\Controllers;

use App\Models\ApplicationCriterion;
use App\Models\RchsemsApplication;
use App\Models\Review;
use App\Models\ReviewScore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function index(Request $request, string $type)
    {
        abort_unless(in_array($type, ['verification', 'validation'], true), 404);
        $role = $type === 'verification' ? 'verifikator' : 'validator';
        abort_unless($request->user()->hasAnyRole(['admin', $role]), 403);
        $applications = RchsemsApplication::with('vendor.user')->whereIn('status',
            $type === 'verification' ? ['submitted', 'verification', 'validation', 'completed'] : ['validation', 'completed']
        )->latest()->paginate(20);

        return view('reviews.index', compact('applications', 'type'));
    }

    public function show(Request $request, RchsemsApplication $application, string $type)
    {
        abort_unless(in_array($type, ['verification', 'validation'], true), 404);
        $role = $type === 'verification' ? 'verifikator' : 'validator';
        abort_unless($request->user()->hasAnyRole(['admin', $role]), 403);
        $application->load(['vendor.user', 'criteria.criterion', 'criteria.documents', 'criteria.scores.review.reviewer.roles']);
        $myReview = $application->reviews()->where('reviewer_id', $request->user()->id)->where('type', $type)->with('scores')->first();
        $allReviews = $application->reviews()->where('type', $type)->with(['reviewer', 'scores'])->get();

        return view('reviews.show', compact('application', 'type', 'myReview', 'allReviews'));
    }

    public function save(Request $request, RchsemsApplication $application, string $type)
    {
        abort_unless(in_array($type, ['verification', 'validation'], true), 404);
        $role = $type === 'verification' ? 'verifikator' : 'validator';
        abort_unless($request->user()->hasAnyRole(['admin', $role]), 403);
        $data = $request->validate([
            'scores' => 'required|array', 'scores.*.factor' => 'required|numeric|in:0,0.25,0.5,0.75,1',
            'scores.*.comment' => 'nullable|string|max:3000', 'overall_comment' => 'nullable|string|max:5000',
        ]);
        DB::transaction(function () use ($request, $application, $type, $data) {
            $review = Review::firstOrNew(['application_id' => $application->id, 'reviewer_id' => $request->user()->id, 'type' => $type]);
            $review->status = 'submitted';
            $review->overall_comment = $data['overall_comment'] ?? null;
            $review->submitted_at = now();
            $review->save();
            foreach ($data['scores'] as $criterionId => $score) {
                $ac = ApplicationCriterion::where('application_id', $application->id)->where('id', $criterionId)->with('criterion')->firstOrFail();
                ReviewScore::updateOrCreate(
                    ['review_id' => $review->id, 'application_criterion_id' => $ac->id],
                    ['score_factor' => $score['factor'], 'weighted_score' => round((float) $ac->criterion->max_weight * (float) $score['factor'], 2), 'comment' => $score['comment'] ?? null]
                );
            }
            if ($type === 'verification' && $application->status === 'submitted') {
                $application->update(['status' => 'verification']);
            }
            if ($type === 'validation') {
                $application->update(['status' => 'validation']);
            }
        });

        return redirect()->route('reviews.show', [$application, $type])->with('status', 'Penilaian disimpan. Nilai penilai lain tetap tersimpan dan dapat dilihat pada halaman ini.');
    }
}
