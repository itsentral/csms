<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApplicationCriterion extends Model
{
    protected $fillable = ['application_id','criterion_id','vendor_answer','vendor_comment'];
    public function application(): BelongsTo { return $this->belongsTo(RchsemsApplication::class, 'application_id'); }
    public function criterion(): BelongsTo { return $this->belongsTo(Criterion::class); }
    public function documents(): HasMany { return $this->hasMany(EvidenceDocument::class, 'application_criterion_id'); }
    public function scores(): HasMany { return $this->hasMany(ReviewScore::class, 'application_criterion_id'); }
}
