<?php

namespace App\Http\Controllers;

use App\Models\RchsemsApplication;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = RchsemsApplication::with('vendor.user')->latest();
        if ($user->hasRole('vendor')) {
            $query->whereHas('vendor', fn($q) => $q->where('user_id', $user->id));
        }
        return view('dashboard', [
            'applications'=>$query->take(20)->get(),
            'vendorCount'=>\App\Models\VendorProfile::count(),
            'applicationCount'=>RchsemsApplication::count(),
            'internalCount'=>User::whereHas('roles', fn($q)=>$q->whereIn('slug',['verifikator','validator','pengadaan']))->count()
        ]);
    }
}
