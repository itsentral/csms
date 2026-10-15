<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RchsemsApplication extends Model
{
    protected $fillable = ['vendor_profile_id','registration_number','scope','status','submitted_at','validated_at','final_score','risk_category','certificate_expires_at'];
    protected function casts(): array { return ['submitted_at'=>'datetime','validated_at'=>'datetime','certificate_expires_at'=>'date','final_score'=>'decimal:2']; }
    public function vendor(): BelongsTo { return $this->belongsTo(VendorProfile::class, 'vendor_profile_id'); }
    public function criteria(): HasMany { return $this->hasMany(ApplicationCriterion::class, 'application_id'); }
    public function reviews(): HasMany { return $this->hasMany(Review::class, 'application_id'); }
}
