<?php

namespace App\Http\Requests;

use App\Models\Vendor;
use App\Services\Portal;
use Illuminate\Foundation\Http\FormRequest;

class UploadEvidenceRequest extends FormRequest
{
    public const EXTENSIONS = 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png';

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
            'question_id' => 'required|exists:questions,id',
            'file' => 'required|file|max:15360|mimes:'.self::EXTENSIONS.'|extensions:'.self::EXTENSIONS,
        ];
    }
}
