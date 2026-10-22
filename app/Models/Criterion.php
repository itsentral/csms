<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Criterion extends Model
{
    protected $fillable = ['group_name', 'code', 'title', 'description', 'max_weight', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['max_weight' => 'decimal:2', 'is_active' => 'boolean'];
    }
}
