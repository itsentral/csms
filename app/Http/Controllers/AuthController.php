<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Services\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
class AuthController extends Controller {
 public function login(Request $r){$d=$r->validate(['username'=>'required|email','password'=>'required|string']);abort_unless(Auth::attempt(['email'=>strtolower($d['username']),'password'=>$d['password'],'active'=>true]),422,'Email atau password tidak sesuai.');$r->session()->regenerate();Portal::audit('login');return response()->json($r->user()->publicData());}
 public function register(Request $r){$d=$r->validate(['username'=>'required|email|max:255|unique:users,email','password'=>'required|string|min:12|max:128','name'=>'required|string|max:255']);$u=User::create(['email'=>strtolower($d['username']),'password'=>$d['password'],'name'=>$d['name'],'roles'=>['vendor']]);Auth::login($u);$r->session()->regenerate();Portal::audit('register');return response()->json($u->publicData(),201);}
 public function logout(Request $r){Portal::audit('logout');Auth::logout();$r->session()->invalidate();$r->session()->regenerateToken();return response()->json(['ok'=>true]);}
 public function password(Request $r){$d=$r->validate(['current_password'=>'required|current_password','password'=>'required|string|min:12|max:128']);$r->user()->update(['password'=>$d['password']]);$r->session()->regenerate();Portal::audit('password_changed');return ['ok'=>true];}
}
