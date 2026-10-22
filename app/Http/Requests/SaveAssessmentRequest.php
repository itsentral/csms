<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $stage = $this->route('stage');
        abort_unless(in_array($stage, ['review', 'validation'], true), 404);

        return (bool) $this->user()?->hasRole($stage === 'review' ? 'verifikator' : 'validator');
    }

    public function rules(): array
    {
        return [
            'scores' => 'required|array',
            'scores.*.question_id' => 'required|distinct|exists:questions,id',
            'scores.*.score' => ['required', 'numeric', Rule::in([0, 0.25, 0.5, 0.75, 1])],
            'scores.*.comment' => 'nullable|string|max:5000',
            'docDate' => 'nullable|date',
            'fieldDate' => 'nullable|date',
            'evaluator' => 'nullable|string|max:255',
            'validator' => 'nullable|string|max:255',
            'fieldLocation' => 'nullable|string|max:255',
            'fieldResult' => ['nullable', Rule::in(['Belum dilakukan', 'Sesuai', 'Sesuai dengan catatan', 'Tidak sesuai'])],
            'action' => ['required', Rule::in(['save', 'advance', 'return', 'finalize'])],
        ];
    }
}
