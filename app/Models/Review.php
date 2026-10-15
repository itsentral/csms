<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    protected $fillable = ['application_id','reviewer_id','type','status','overall_comment','submitted_at'];
    protected function casts(): array { return ['submitted_at'=>'datetime']; }
    public function application(): BelongsTo { return $this->belongsTo(RchsemsApplication::class, 'application_id'); }
    public function reviewer(): BelongsTo { return $this->belongsTo(User::class, 'reviewer_id'); }
    public function scores(): HasMany { return $this->hasMany(ReviewScore::class); }
}
