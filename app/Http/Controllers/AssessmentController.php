<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveAssessmentRequest;
use App\Models\Vendor;
use App\Services\AssessmentService;

class AssessmentController extends Controller
{
    public function __construct(private AssessmentService $assessments) {}

    public function store(SaveAssessmentRequest $r, Vendor $vendor, string $stage)
    {
        return $this->assessments->save($r->user(), $vendor, $stage, $r->validated());
    }
}
