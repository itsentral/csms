<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
class User extends Authenticatable {
 use Notifiable;
 protected $guarded=['id'];
 protected $attributes=['active'=>true];
 protected $hidden=['password','remember_token'];
 protected function casts(): array { return ['roles'=>'array','password'=>'hashed','active'=>'boolean']; }
 public function hasRole(string ...$roles): bool { return $this->active && (in_array('admin',$this->roles ?? []) || count(array_intersect($roles,$this->roles ?? []))>0); }
 public function publicData(): array { return ['id'=>$this->id,'username'=>$this->email,'name'=>$this->name,'role'=>$this->roles]; }
}
