<?php

namespace App\Http\Requests;

use App\Models\Vendor;
use App\Services\Portal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAnswersRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user || ! $user->hasRole('vendor')) {
            return false;
        }
        Portal::authorize($user, $this->route('vendor') instanceof Vendor ? $this->route('vendor') : Vendor::findOrFail($this->route('vendor')));

        return true;
    }

    public function rules(): array
    {
        return [
            'answers' => 'required|array|max:64',
            'answers.*.question_id' => 'required|distinct|exists:questions,id',
            'answers.*.answer' => ['nullable', Rule::in(['Ya', 'Tidak', ''])],
            'answers.*.note' => 'nullable|string|max:5000',
        ];
    }
}
