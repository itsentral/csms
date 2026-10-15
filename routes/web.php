<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PortalController;
Route::view('/','portal')->name('login');
Route::post('/api/login',[AuthController::class,'login'])->middleware('throttle:6,1');
Route::post('/api/register',[AuthController::class,'register'])->middleware('throttle:5,1');
Route::middleware(['auth','active'])->prefix('api')->group(function(){
 Route::get('/state',[PortalController::class,'state']);
 Route::post('/logout',[AuthController::class,'logout']);
 Route::put('/password',[AuthController::class,'password'])->middleware('throttle:6,1');
 Route::post('/vendors',[PortalController::class,'profile']);
 Route::put('/vendors/{vendor}',[PortalController::class,'profile']);
 Route::post('/vendors/{vendor}/answers',[PortalController::class,'answers']);
 Route::post('/vendors/{vendor}/evidence',[PortalController::class,'upload'])->middleware('throttle:120,1');
 Route::get('/evidence/{id}',[PortalController::class,'download']);
 Route::post('/vendors/{vendor}/assessments/{stage}',[PortalController::class,'assessment']);
 Route::post('/accounts',[PortalController::class,'account']);
 Route::put('/accounts/{user}/password',[PortalController::class,'resetPassword']);
 Route::delete('/accounts/{user}',[PortalController::class,'deactivate']);
 Route::get('/export',[PortalController::class,'export']);
});
