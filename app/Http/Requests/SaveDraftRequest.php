<?php

namespace App\Http\Requests;

use App\Models\Vendor;
use App\Services\Portal;
use Illuminate\Foundation\Http\FormRequest;

class SaveDraftRequest extends FormRequest
{
    /** Form scopes: `<form>:<vendor id>`, or `profile:new` for a vendor that is not registered yet. */
    public const SCOPE = '(profile|review|validation):[A-Za-z0-9_-]{1,60}';

    public function authorize(): bool
    {
        $user = $this->user();
        [$form, $id] = explode(':', (string) $this->route('scope'), 2) + [1 => ''];
        // Same roles that may save the form itself.
        $role = ['profile' => 'vendor', 'review' => 'verifikator', 'validation' => 'validator'][$form] ?? null;
        if (! $user || ! $role || ! $user->hasRole($role)) {
            return false;
        }
        if ($id !== 'new') {
            Portal::authorize($user, Vendor::findOrFail($id));
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'data' => 'required|array|max:150',
            // Field values only (text, dates, scores as text); nothing nested.
            'data.*' => 'nullable|string|max:5000',
        ];
    }
}
