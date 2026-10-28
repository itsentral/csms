<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use App\Notifications\VendorStatusChanged;
use App\Services\Totp;
use Database\Seeders\QuestionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SecurityFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(QuestionSeeder::class);
    }

    private function user(string $role): User
    {
        return User::create(['name' => $role, 'email' => uniqid().'@example.test', 'password' => 'Testing12345!', 'roles' => [$role]]);
    }

    private function enableMfa(User $user): string
    {
        $secret = $this->actingAs($user)->postJson('/api/mfa/setup')->assertOk()->json('secret');
        $this->actingAs($user)->postJson('/api/mfa/confirm', ['code' => Totp::code($secret, intdiv(time(), 30))])->assertOk();

        return $secret;
    }

    public function test_totp_matches_rfc_6238_vector_and_rejects_replay(): void
    {
        $secret = Totp::base32Encode('12345678901234567890');
        $this->assertSame('287082', Totp::code($secret, intdiv(59, 30)));
        $this->assertSame(1, Totp::verify($secret, '287082', null, 1, 59));
        $this->assertNull(Totp::verify($secret, '287082', 1, 1, 59), 'kode pada langkah yang sudah dipakai harus ditolak');
        $this->assertNull(Totp::verify($secret, '123456', null, 1, 59));
        $this->assertNull(Totp::verify($secret, 'abc', null, 1, 59));
    }

    public function test_mfa_setup_login_challenge_and_recovery_codes(): void
    {
        $user = $this->user('verifikator');
        $secret = $this->actingAs($user)->postJson('/api/mfa/setup')->assertOk()->json('secret');
        $this->assertFalse($user->fresh()->hasMfa(), 'belum aktif sebelum dikonfirmasi');
        $this->actingAs($user)->postJson('/api/mfa/confirm', ['code' => '000000'])->assertUnprocessable();

        $step = intdiv(time(), 30);
        $codes = $this->actingAs($user)->postJson('/api/mfa/confirm', ['code' => Totp::code($secret, $step)])->assertOk()->json('recovery_codes');
        $this->assertCount(8, $codes);
        $this->assertTrue($user->fresh()->hasMfa());

        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->postJson('/api/login', ['username' => $user->email, 'password' => 'Testing12345!'])->assertStatus(202)->assertJson(['mfa' => true]);
        $this->getJson('/api/state')->assertUnauthorized();
        $this->postJson('/api/login/mfa', ['code' => '000000'])->assertUnprocessable();
        $this->postJson('/api/login/mfa', ['code' => Totp::code($secret, $step)])->assertUnprocessable(); // the step was already used during confirmation
        $this->postJson('/api/login/mfa', ['code' => Totp::code($secret, $step + 1)])->assertOk()->assertJsonPath('username', $user->email);
        $this->getJson('/api/state')->assertOk();

        // Recovery code: valid once.
        $this->postJson('/api/logout');
        $this->flushSession();
        $this->postJson('/api/login', ['username' => $user->email, 'password' => 'Testing12345!'])->assertStatus(202);
        $this->postJson('/api/login/mfa', ['code' => $codes[0]])->assertOk();
        $this->postJson('/api/logout');
        $this->flushSession();
        $this->postJson('/api/login', ['username' => $user->email, 'password' => 'Testing12345!'])->assertStatus(202);
        $this->postJson('/api/login/mfa', ['code' => $codes[0]])->assertUnprocessable();
    }

    public function test_mfa_is_for_internal_accounts_and_admin_can_reset_it(): void
    {
        $vendor = $this->user('vendor');
        $this->actingAs($vendor)->postJson('/api/mfa/setup')->assertForbidden();

        $reviewer = $this->user('verifikator');
        $this->enableMfa($reviewer);
        $this->actingAs($reviewer)->postJson('/api/mfa/disable', ['current_password' => 'wrong'])->assertUnprocessable();
        $this->actingAs($this->user('validator'))->deleteJson('/api/accounts/'.$reviewer->id.'/mfa')->assertForbidden();
        $this->actingAs($this->user('admin'))->deleteJson('/api/accounts/'.$reviewer->id.'/mfa')->assertOk();
        $this->assertFalse($reviewer->fresh()->hasMfa());
    }

    public function test_required_mfa_blocks_internal_accounts_until_setup(): void
    {
        config(['rchsems.mfa_required' => true]);
        $admin = $this->user('admin');
        $this->actingAs($admin)->getJson('/api/state')->assertOk()->assertJsonPath('session.mfaSetupRequired', true);
        $this->actingAs($admin)->get('/api/export')->assertForbidden()->assertJsonPath('code', 'mfa_setup_required');
        $this->enableMfa($admin);
        $this->actingAs($admin->fresh())->get('/api/export')->assertOk();
        $this->actingAs($admin->fresh())->postJson('/api/mfa/disable', ['current_password' => 'Testing12345!'])->assertUnprocessable();
        // Vendors are not required to.
        $this->actingAs($this->user('vendor'))->getJson('/api/state')->assertOk()->assertJsonPath('session.mfaSetupRequired', false);
    }

    public function test_forgot_and_reset_password(): void
    {
        Notification::fake();
        $user = $this->user('vendor');
        $this->postJson('/api/password/forgot', ['username' => 'ghost@example.test'])->assertStatus(202);
        Notification::assertNothingSent();
        $this->postJson('/api/password/forgot', ['username' => strtoupper($user->email)])->assertStatus(202);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($n) use (&$token) {
            $token = $n->token;

            return true;
        });
        DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $user->id, 'payload' => 'x', 'last_activity' => time()]);

        $this->postJson('/api/password/reset', ['username' => $user->email, 'token' => 'bad-token', 'password' => 'NewPassword12345!'])->assertUnprocessable();
        $this->postJson('/api/password/reset', ['username' => $user->email, 'token' => $token, 'password' => 'short'])->assertUnprocessable();
        $this->postJson('/api/password/reset', ['username' => $user->email, 'token' => $token, 'password' => 'NewPassword12345!'])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'old-session']);
        $this->postJson('/api/password/reset', ['username' => $user->email, 'token' => $token, 'password' => 'AnotherPassword123!'])->assertUnprocessable(); // single-use token
        $this->postJson('/api/login', ['username' => $user->email, 'password' => 'NewPassword12345!'])->assertOk();
    }

    public function test_deactivated_accounts_cannot_request_a_reset(): void
    {
        Notification::fake();
        $user = $this->user('vendor');
        $user->update(['active' => false]);
        $this->postJson('/api/password/forgot', ['username' => $user->email])->assertStatus(202);
        Notification::assertNothingSent();
    }

    public function test_status_change_notifications_go_to_the_right_people(): void
    {
        Notification::fake();
        $owner = $this->user('vendor');
        $verifier = $this->user('verifikator');
        $validator = $this->user('validator');
        $procurement = $this->user('pengadaan');
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => ''])->all();
        $scores = fn (float $n) => DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'score' => $n, 'comment' => ''])->all();
        $vendor = Vendor::create(['id' => 'RCH-N1', 'owner_id' => $owner->id, 'name' => 'PT Notif', 'scope' => 'x', 'status' => 'Menunggu Pengisian']);

        // Off by default.
        $this->actingAs($owner)->postJson('/api/vendors/RCH-N1/answers', ['answers' => $answers])->assertOk();
        $this->actingAs($owner)->postJson('/api/vendors/RCH-N1/submit')->assertOk();
        Notification::assertNothingSent();

        config(['rchsems.notify_email' => true]);
        $vendor->update(['status' => 'Perlu Perbaikan']);
        $this->actingAs($owner)->postJson('/api/vendors/RCH-N1/submit')->assertOk();
        Notification::assertSentTo($verifier, VendorStatusChanged::class, fn ($n) => $n->event === 'submitted');
        Notification::assertNotSentTo($validator, VendorStatusChanged::class);

        $this->actingAs($verifier)->postJson('/api/vendors/RCH-N1/assessments/review', ['action' => 'advance', 'scores' => $scores(1)])->assertOk();
        Notification::assertSentTo($validator, VendorStatusChanged::class, fn ($n) => $n->event === 'advanced');

        $this->actingAs($validator)->postJson('/api/vendors/RCH-N1/assessments/validation', ['action' => 'finalize', 'scores' => $scores(1), 'fieldDate' => '2026-10-14', 'fieldLocation' => 'Jakarta', 'fieldResult' => 'Sesuai'])->assertOk();
        Notification::assertSentTo($owner, VendorStatusChanged::class, fn ($n) => $n->event === 'finalized');
        Notification::assertSentTo($procurement, VendorStatusChanged::class, fn ($n) => $n->event === 'finalized');
    }

    public function test_returning_a_submission_notifies_the_owner(): void
    {
        Notification::fake();
        config(['rchsems.notify_email' => true]);
        $owner = $this->user('vendor');
        $vendor = Vendor::create(['id' => 'RCH-N2', 'owner_id' => $owner->id, 'name' => 'PT Kembali', 'scope' => 'x', 'status' => 'Menunggu Verifikasi Dokumen']);
        $scores = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'score' => 0.25, 'comment' => ''])->all();
        $this->actingAs($this->user('verifikator'))->postJson('/api/vendors/'.$vendor->id.'/assessments/review', ['action' => 'return', 'scores' => $scores])->assertOk();
        Notification::assertSentTo($owner, VendorStatusChanged::class, fn ($n) => $n->event === 'returned');
    }

    public function test_artisan_command_resets_mfa(): void
    {
        $user = $this->user('admin');
        $this->enableMfa($user);
        $this->assertTrue($user->fresh()->hasMfa());
        $this->artisan('rchsems:reset-mfa', ['email' => strtoupper($user->email)])->assertSuccessful();
        $this->assertFalse($user->fresh()->hasMfa());
        $this->artisan('rchsems:reset-mfa', ['email' => 'ghost@example.test'])->assertFailed();
    }
}
