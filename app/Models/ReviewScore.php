<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewScore extends Model
{
    protected $fillable = ['review_id','application_criterion_id','score_factor','weighted_score','comment'];
    protected function casts(): array { return ['score_factor'=>'decimal:2','weighted_score'=>'decimal:2']; }
    public function review(): BelongsTo { return $this->belongsTo(Review::class); }
    public function applicationCriterion(): BelongsTo { return $this->belongsTo(ApplicationCriterion::class, 'application_criterion_id'); }
}
