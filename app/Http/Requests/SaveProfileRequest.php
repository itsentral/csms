<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasRole('vendor');
    }

    public function rules(): array
    {
        $required = ['name', 'nib', 'pic', 'business', 'address', 'scope'];
        $rules = [];
        foreach ($required as $field) {
            $rules[$field] = 'required|string|max:'.(in_array($field, ['address', 'scope']) ? 5000 : 255);
        }
        foreach (['npwp', 'phone', 'ossRisk', 'branch', 'notes'] as $field) {
            $rules[$field] = 'nullable|string|max:'.($field === 'notes' ? 5000 : 255);
        }
        $rules['email'] = 'required|email|max:255';

        return $rules;
    }
}
