<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'username' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:12|max:128',
            'role' => 'required|array|min:1',
            'role.*' => ['required', Rule::in(['admin', 'verifikator', 'validator', 'pengadaan'])],
        ];
    }
}
