<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidenceDocument extends Model
{
    protected $fillable = ['application_criterion_id','uploaded_by','original_name','storage_path','mime_type','size_bytes'];
    public function applicationCriterion(): BelongsTo { return $this->belongsTo(ApplicationCriterion::class, 'application_criterion_id'); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
