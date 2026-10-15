<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Vendor extends Model {
 public $incrementing=false;
 protected $keyType='string';
 protected $guarded=[];
 protected function casts(): array { return ['final_snapshot'=>'array']; }
}
