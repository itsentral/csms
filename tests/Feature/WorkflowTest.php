<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use App\Services\Portal;
use Database\Seeders\QuestionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkflowTest extends TestCase
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

    private function vendor(User $u, string $status = 'Menunggu Pengisian'): Vendor
    {
        return Vendor::create(['id' => 'RCH-'.uniqid(), 'owner_id' => $u->id, 'name' => 'PT Test', 'scope' => 'Pemeliharaan', 'status' => $status]);
    }

    private function scores(float $n): array
    {
        return DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'score' => $n, 'comment' => 'Bukti diperiksa'])->all();
    }

    public function test_master_matches_mockup(): void
    {
        $this->assertEquals(49, DB::table('questions')->count());
        $this->assertEquals(565, DB::table('questions')->sum('max'));
        $this->seed(QuestionSeeder::class);
        $this->assertEquals(49, DB::table('questions')->count());
    }

    public function test_registration_does_not_allow_role_escalation(): void
    {
        $this->postJson('/api/register', ['name' => 'Vendor', 'username' => 'new@example.test', 'password' => 'Testing12345!', 'role' => ['admin']])->assertCreated()->assertJsonPath('role.0', 'vendor');
        $this->postJson('/api/accounts', [])->assertForbidden();
    }

    public function test_vendor_isolation_and_role_permissions(): void
    {
        $one = $this->user('vendor');
        $two = $this->user('vendor');
        $v = $this->vendor($one);
        $this->actingAs($two)->getJson('/api/state')->assertJsonCount(0, 'vendors');
        $this->actingAs($two)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => []])->assertForbidden();
        $this->actingAs($two)->postJson('/api/vendors/'.$v->id.'/assessments/review', [])->assertForbidden();
    }

    public function test_complete_workflow_multi_reviewer_average_and_lock(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => 'Bukti'])->all();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $answers])->assertOk()->assertJsonPath('answered', 49);
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk()->assertJsonPath('status', 'Menunggu Verifikasi Dokumen');
        $r1 = $this->user('verifikator');
        $r2 = $this->user('verifikator');
        $this->actingAs($r1)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'save', 'scores' => $this->scores(1)])->assertOk();
        $this->actingAs($r2)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'advance', 'scores' => $this->scores(.5)])->assertOk()->assertJsonPath('totals.review', 423.75);
        $this->actingAs($r1)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'advance', 'scores' => $this->scores(0)])->assertConflict();
        $this->actingAs($r1)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'save', 'scores' => $this->scores(.5)])->assertOk()->assertJsonPath('totals.review', 282.5);
        $a = $this->user('validator');
        $b = $this->user('validator');
        $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation', ['action' => 'save', 'scores' => $this->scores(.5)])->assertOk();
        $this->actingAs($b)->postJson('/api/vendors/'.$v->id.'/assessments/validation', ['action' => 'finalize', 'scores' => $this->scores(1), 'fieldDate' => '2026-10-14', 'fieldLocation' => 'Jakarta', 'fieldResult' => 'Sesuai'])->assertOk()->assertJsonPath('status', 'Tervalidasi')->assertJsonPath('finalRisk', 'Risiko Tinggi')->assertJsonPath('totals.validation', 423.75);
        $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation', ['action' => 'save', 'scores' => $this->scores(0)])->assertConflict();
        $this->assertNotNull($v->fresh()->final_snapshot);
        $this->assertDatabaseHas('audit_logs', ['action' => 'validation_finalize', 'vendor_id' => $v->id]);
    }

    public function test_invalid_score_and_wrong_stage_rejected(): void
    {
        $v = $this->vendor($this->user('vendor'));
        $a = $this->user('validator');
        $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation', ['action' => 'save', 'scores' => $this->scores(.5)])->assertConflict();
        $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation', ['action' => 'save', 'scores' => $this->scores(.7)])->assertUnprocessable();
    }

    public function test_correction_starts_fresh_assessment_round(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u, 'Menunggu Verifikasi Dokumen');
        $this->actingAs($this->user('verifikator'))->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'return', 'scores' => $this->scores(.25)])->assertOk();
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Tidak'])->all();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $answers])->assertOk();
        $this->assertDatabaseCount('assessments', 1);
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk();
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseHas('audit_logs', ['action' => 'previous_round_archived']);
    }

    public function test_evidence_is_private_and_downloadable(): void
    {
        Storage::fake('local');
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $file = UploadedFile::fake()->createWithContent('bukti.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NvEAAAAASUVORK5CYII='));
        $r = $this->actingAs($u)->post('/api/vendors/'.$v->id.'/evidence', ['question_id' => '1.a', 'file' => $file], ['Accept' => 'application/json'])->assertOk();
        $id = $r->json('id');
        $this->actingAs($this->user('vendor'))->get('/api/evidence/'.$id)->assertForbidden();
        $this->actingAs($this->user('verifikator'))->get('/api/evidence/'.$id)->assertForbidden();
        $this->actingAs($this->user('admin'))->get('/api/evidence/'.$id)->assertOk();
        $v->update(['status' => 'Menunggu Verifikasi Dokumen']);
        $this->actingAs($this->user('verifikator'))->get('/api/evidence/'.$id)->assertOk();
    }

    public function test_state_query_count_does_not_grow_with_vendor_count(): void
    {
        $admin = $this->user('admin');
        $count = function () use ($admin) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($admin)->getJson('/api/state')->assertOk();

            return count(DB::getQueryLog());
        };
        $this->vendor($this->user('vendor'));
        $one = $count();
        foreach (range(1, 4) as $i) {
            $this->vendor($this->user('vendor'));
        }$this->assertSame($one, $count());
    }

    public function test_password_change_ends_other_sessions(): void
    {
        $u = $this->user('vendor');
        DB::table('sessions')->insert(['id' => 'other-session', 'user_id' => $u->id, 'payload' => 'x', 'last_activity' => time()]);
        $this->actingAs($u)->putJson('/api/password', ['current_password' => 'Testing12345!', 'password' => 'NewPassword12345!'])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'other-session']);
    }

    public function test_guest_and_inactive_user_are_blocked(): void
    {
        $this->getJson('/api/state')->assertUnauthorized();
        $u = $this->user('vendor');
        $u->update(['active' => false]);
        $this->actingAs($u)->getJson('/api/state')->assertForbidden();
    }

    public function test_internal_account_multi_roles_and_safe_deactivation(): void
    {
        $admin = $this->user('admin');
        $this->actingAs($admin)->postJson('/api/accounts', ['username' => 'both@example.test', 'name' => 'Penilai', 'password' => 'Testing12345!', 'role' => ['verifikator', 'validator']])->assertOk()->assertJsonCount(2, 'role');
        $u = User::where('email', 'both@example.test')->first();
        $this->deleteJson('/api/accounts/'.$u->id)->assertOk();
        $this->assertFalse($u->fresh()->active);
        $this->deleteJson('/api/accounts/'.$admin->id)->assertUnprocessable();
    }

    public function test_risk_thresholds(): void
    {
        foreach ([[0, 'Tidak Lulus'], [34.99, 'Tidak Lulus'], [35, 'Risiko Rendah'], [50, 'Risiko Menengah'], [70, 'Risiko Tinggi'], [100, 'Risiko Tinggi']] as [$n,$category]) {
            $this->assertSame($category, Portal::category($n));
        }
    }

    public function test_draft_can_be_saved_partially_and_resumed(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $r = $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => [['question_id' => '1.a', 'answer' => 'Ya', 'note' => 'Dokumen A'], ['question_id' => '2.b', 'answer' => 'Tidak', 'note' => '']]]);
        $r->assertOk()->assertJsonPath('answered', 2)->assertJsonPath('total', 49);
        $v->refresh();
        $this->assertSame('Menunggu Pengisian', $v->status, 'Penyimpanan draft tidak boleh mengubah status pengajuan.');
        $this->assertNotNull($v->draft_saved_at);
        $this->assertDatabaseHas('answers', ['vendor_id' => $v->id, 'question_id' => '1.a', 'answer' => 'Ya']);
        $this->assertDatabaseHas('answers', ['vendor_id' => $v->id, 'question_id' => '2.b', 'answer' => 'Tidak']);
        // The draft survives a reload and can be continued.
        $state = $this->actingAs($u)->getJson('/api/state')->json('vendors.0');
        $this->assertSame(2, $state['answered']);
        $this->assertSame('Ya', $state['answers']['1.a']['answer']);
        $this->assertNotNull($state['draft_saved_at']);
    }

    public function test_submit_requires_every_question_and_reports_the_missing_ones(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $partial = DB::table('questions')->limit(48)->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => ''])->all();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $partial])->assertOk();
        $r = $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit');
        $r->assertStatus(422)->assertJsonPath('answered', 48)->assertJsonPath('total', 49);
        $this->assertCount(1, $r->json('missing'));
        $this->assertSame('Menunggu Pengisian', $v->fresh()->status);
        $missing = $r->json('missing')[0];
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => [['question_id' => $missing, 'answer' => 'Ya', 'note' => '']]])->assertOk();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk()->assertJsonPath('status', 'Menunggu Verifikasi Dokumen');
        $this->assertDatabaseHas('audit_logs', ['action' => 'questionnaire_submitted', 'vendor_id' => $v->id]);
    }

    public function test_draft_is_locked_once_the_submission_is_sent(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => ''])->all();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $answers])->assertOk();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => [['question_id' => '1.a', 'answer' => 'Tidak', 'note' => '']]])->assertConflict();
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/submit')->assertConflict();
        $this->assertSame('Ya', DB::table('answers')->where('vendor_id', $v->id)->where('question_id', '1.a')->value('answer'));
    }

    public function test_draft_content_is_visible_to_admin_only(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u);
        $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => [['question_id' => '1.a', 'answer' => 'Ya', 'note' => 'Rahasia draft']]])->assertOk();
        $admin = $this->actingAs($this->user('admin'))->getJson('/api/state')->json('vendors.0');
        $this->assertSame('Ya', $admin['answers']['1.a']['answer']);
        $this->assertSame('Rahasia draft', $admin['answers']['1.a']['note']);
        foreach (['verifikator', 'validator', 'pengadaan'] as $role) {
            $seen = $this->actingAs($this->user($role))->getJson('/api/state')->json('vendors.0');
            $this->assertSame([], (array) $seen['answers'], 'Draft tidak boleh terlihat oleh '.$role.'.');
            $this->assertSame(1, $seen['answered'], 'Metadata kelengkapan tetap terlihat oleh '.$role.'.');
        }
    }

    public function test_owner_can_delete_draft_evidence_but_not_after_submission(): void
    {
        Storage::fake('local');
        $owner = $this->user('vendor');
        $v = $this->vendor($owner);
        $file = UploadedFile::fake()->createWithContent('bukti.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NvEAAAAASUVORK5CYII='));
        $id = $this->actingAs($owner)->post('/api/vendors/'.$v->id.'/evidence', ['question_id' => '1.a', 'file' => $file], ['Accept' => 'application/json'])->assertOk()->json('id');
        $this->assertCount(1, Storage::disk('local')->files('evidence/'.$v->id));
        // Hanya pemilik vendor atau admin yang dapat menghapus lampiran.
        $this->actingAs($this->user('verifikator'))->deleteJson('/api/evidence/'.$id)->assertForbidden();
        $this->actingAs($owner)->deleteJson('/api/evidence/'.$id)->assertOk();
        $this->assertDatabaseMissing('evidence', ['id' => $id]);
        $this->assertEmpty(Storage::disk('local')->files('evidence/'.$v->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'evidence_deleted', 'vendor_id' => $v->id]);
        // Setelah pengajuan dikirim, lampiran terkunci.
        $id2 = $this->actingAs($owner)->post('/api/vendors/'.$v->id.'/evidence', ['question_id' => '1.b', 'file' => UploadedFile::fake()->createWithContent('bukti2.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NvEAAAAASUVORK5CYII='))], ['Accept' => 'application/json'])->assertOk()->json('id');
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => ''])->all();
        $this->actingAs($owner)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $answers])->assertOk();
        $this->actingAs($owner)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk();
        $this->actingAs($owner)->deleteJson('/api/evidence/'.$id2)->assertConflict();
        $this->actingAs($this->user('admin'))->deleteJson('/api/evidence/'.$id2)->assertOk();
    }

    public function test_admin_can_delete_vendor_together_with_its_files(): void
    {
        Storage::fake('local');
        $owner = $this->user('vendor');
        $v = $this->vendor($owner);
        $file = UploadedFile::fake()->createWithContent('bukti.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NvEAAAAASUVORK5CYII='));
        $this->actingAs($owner)->post('/api/vendors/'.$v->id.'/evidence', ['question_id' => '1.a', 'file' => $file], ['Accept' => 'application/json'])->assertOk();
        $answers = DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'answer' => 'Ya', 'note' => 'Bukti'])->all();
        $this->actingAs($owner)->postJson('/api/vendors/'.$v->id.'/answers', ['answers' => $answers])->assertOk();
        $this->actingAs($owner)->postJson('/api/vendors/'.$v->id.'/submit')->assertOk();
        $this->actingAs($this->user('verifikator'))->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'save', 'scores' => $this->scores(.5)])->assertOk();
        $this->assertCount(1, Storage::disk('local')->files('evidence/'.$v->id));
        // Only administrators may delete a vendor.
        $this->actingAs($owner)->deleteJson('/api/vendors/'.$v->id)->assertForbidden();
        $this->actingAs($this->user('verifikator'))->deleteJson('/api/vendors/'.$v->id)->assertForbidden();
        $this->actingAs($this->user('admin'))->deleteJson('/api/vendors/'.$v->id)->assertOk();
        $this->assertDatabaseMissing('vendors', ['id' => $v->id]);
        $this->assertDatabaseCount('answers', 0);
        $this->assertDatabaseCount('evidence', 0);
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('assessment_scores', 0);
        $this->assertEmpty(Storage::disk('local')->files('evidence/'.$v->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'vendor_deleted', 'vendor_id' => $v->id]);
    }

    public function test_owner_account_survives_vendor_deletion(): void
    {
        $owner = $this->user('vendor');
        $v = $this->vendor($owner);
        $this->actingAs($this->user('admin'))->deleteJson('/api/vendors/'.$v->id)->assertOk();
        $this->assertNotNull($owner->fresh());
        $this->actingAs($owner)->getJson('/api/state')->assertOk();
    }

    public function test_export_is_a_valid_xlsx_with_three_sheets(): void
    {
        $u = $this->user('vendor');
        $v = $this->vendor($u, 'Tervalidasi');
        $v->update(['name' => 'PT Ekspor =1+1']);
        DB::table('answers')->insert(['vendor_id' => $v->id, 'question_id' => '1.a', 'answer' => 'Ya', 'note' => 'Bukti & <ok>', 'created_at' => now(), 'updated_at' => now()]);
        $res = $this->actingAs($this->user('admin'))->get('/api/export?lang=en')->assertOk();
        $this->assertStringContainsString('spreadsheetml.sheet', $res->headers->get('Content-Type'));
        $file = $res->baseResponse->getFile()->getPathname();
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($file) === true);
        $wb = $zip->getFromName('xl/workbook.xml');
        foreach (['Vendors', 'Answers', 'Scores'] as $name) {
            $this->assertStringContainsString('name="'.$name.'"', $wb);
        }
        $sheet1 = $zip->getFromName('xl/worksheets/sheet1.xml');
        $this->assertStringContainsString('PT Ekspor =1+1', $sheet1);
        $this->assertStringContainsString('Bukti &amp; &lt;ok&gt;', $zip->getFromName('xl/worksheets/sheet2.xml'));
        $this->assertStringContainsString('Does the company identify internal and external issues', $zip->getFromName('xl/worksheets/sheet2.xml'));
        foreach (['sheet1', 'sheet2', 'sheet3'] as $n) {
            $this->assertNotFalse(simplexml_load_string($zip->getFromName('xl/worksheets/'.$n.'.xml')));
        }
        $zip->close();
    }

    public function test_state_exposes_question_master_and_status_constants(): void
    {
        $state = $this->actingAs($this->user('vendor'))->getJson('/api/state')->assertOk();
        $state->assertJsonCount(49, 'questions')
            ->assertJsonPath('questions.0.id', '1.a')
            ->assertJsonPath('statuses.validated', 'Tervalidasi')
            ->assertJsonPath('statuses.awaitingFill', 'Menunggu Pengisian');
        $this->assertNotEmpty($state->json('questions.0.text_en'));
        $this->assertNotEmpty($state->json('questions.48.group_en'));
    }
}
