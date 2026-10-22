<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EvidenceController;
use App\Http\Controllers\MfaController;
use App\Http\Controllers\VendorController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'portal')->name('login');

// Publik (dibatasi laju)
Route::post('/api/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/api/login/mfa', [MfaController::class, 'verifyLogin'])->middleware('throttle:mfa');
Route::post('/api/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/api/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot');
Route::post('/api/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:reset');

Route::middleware(['auth', 'active', 'mfa.setup'])->prefix('api')->group(function () {
    Route::get('/state', [VendorController::class, 'state']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/password', [AuthController::class, 'password'])->middleware('throttle:password');
    Route::get('/export', [VendorController::class, 'export']);

    Route::post('/vendors', [VendorController::class, 'profile']);
    Route::put('/vendors/{vendor}', [VendorController::class, 'profile']);
    Route::delete('/vendors/{vendor}', [VendorController::class, 'destroy']);
    Route::post('/vendors/{vendor}/answers', [VendorController::class, 'answers']);
    Route::post('/vendors/{vendor}/submit', [VendorController::class, 'submit']);
    Route::post('/vendors/{vendor}/assessments/{stage}', [AssessmentController::class, 'store']);

    Route::post('/vendors/{vendor}/evidence', [EvidenceController::class, 'upload'])->middleware('throttle:120,1');
    Route::get('/evidence/{id}', [EvidenceController::class, 'download']);
    Route::delete('/evidence/{id}', [EvidenceController::class, 'destroy']);

    Route::post('/accounts', [AccountController::class, 'store']);
    Route::put('/accounts/{user}/password', [AccountController::class, 'resetPassword']);
    Route::delete('/accounts/{user}', [AccountController::class, 'deactivate']);
    Route::delete('/accounts/{user}/mfa', [MfaController::class, 'adminReset']);

    Route::post('/mfa/setup', [MfaController::class, 'setup']);
    Route::post('/mfa/confirm', [MfaController::class, 'confirm']);
    Route::post('/mfa/recovery', [MfaController::class, 'regenerateRecovery']);
    Route::post('/mfa/disable', [MfaController::class, 'disable']);
});
