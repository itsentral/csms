<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use Database\Seeders\QuestionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Unsaved form input is kept on the server per user and form, and is removed when the form is really saved. */
class DraftTest extends TestCase
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

    private function vendor(User $u, string $status): Vendor
    {
        return Vendor::create(['id' => 'RCH-'.uniqid(), 'owner_id' => $u->id, 'name' => 'PT Test', 'scope' => 'Pemeliharaan', 'status' => $status]);
    }

    private function scores(float $n): array
    {
        return DB::table('questions')->get()->map(fn ($q) => ['question_id' => $q->id, 'score' => $n, 'comment' => ''])->all();
    }

    private function profile(): array
    {
        return ['name' => 'PT Baru', 'nib' => '123', 'pic' => 'Budi', 'business' => 'Jasa', 'address' => 'Jakarta', 'scope' => 'Pemeliharaan', 'email' => 'pt@example.test'];
    }

    public function test_draft_is_stored_per_user_and_returned_with_the_state(): void
    {
        $r = $this->user('verifikator');
        $v = $this->vendor($this->user('vendor'), 'Menunggu Verifikasi Dokumen');
        $scope = 'review:'.$v->id;

        $this->actingAs($r)->putJson('/api/drafts/'.$scope, ['data' => ['evaluator' => 'Ani', 'comment:1.a' => 'Perlu cek ulang', 'review:1.a' => '0.5']])->assertOk();
        $this->actingAs($r)->putJson('/api/drafts/'.$scope, ['data' => ['evaluator' => 'Ani Lagi']])->assertOk();

        $this->assertDatabaseCount('form_drafts', 1);
        $this->actingAs($r)->getJson('/api/state')->assertJsonPath('drafts.'.$scope.'.data.evaluator', 'Ani Lagi');
        // Another verifier does not see it, and an empty list is an object, not an array.
        $this->actingAs($this->user('verifikator'))->getJson('/api/state')->assertOk()->assertJsonPath('drafts', []);
        $this->assertSame('{}', json_encode($this->actingAs($this->user('verifikator'))->getJson('/api/state')->json('drafts'), JSON_FORCE_OBJECT));

        $this->actingAs($r)->deleteJson('/api/drafts/'.$scope)->assertOk();
        $this->assertDatabaseCount('form_drafts', 0);
    }

    public function test_only_the_roles_that_can_save_a_form_can_keep_a_draft_of_it(): void
    {
        $owner = $this->user('vendor');
        $v = $this->vendor($owner, 'Menunggu Pengisian');
        $other = $this->user('vendor');

        $this->actingAs($owner)->putJson('/api/drafts/profile:'.$v->id, ['data' => ['name' => 'PT Ubah']])->assertOk();
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => ['name' => 'PT Lain']])->assertOk();
        $this->actingAs($other)->putJson('/api/drafts/profile:'.$v->id, ['data' => ['name' => 'x']])->assertForbidden();
        $this->actingAs($owner)->putJson('/api/drafts/review:'.$v->id, ['data' => ['evaluator' => 'x']])->assertForbidden();
        $this->actingAs($this->user('verifikator'))->putJson('/api/drafts/validation:'.$v->id, ['data' => ['validator' => 'x']])->assertForbidden();
        $this->actingAs($this->user('verifikator'))->putJson('/api/drafts/profile:new', ['data' => ['name' => 'x']])->assertForbidden();
    }

    public function test_guest_cannot_keep_a_draft(): void
    {
        $this->putJson('/api/drafts/profile:new', ['data' => ['name' => 'x']])->assertUnauthorized();
        $this->deleteJson('/api/drafts/profile:new')->assertUnauthorized();
    }

    public function test_draft_input_is_validated(): void
    {
        $owner = $this->user('vendor');
        $this->actingAs($owner)->putJson('/api/drafts/other:new', ['data' => ['a' => 'b']])->assertNotFound();
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => []])->assertUnprocessable();
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => ['a' => ['nested']]])->assertUnprocessable();
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => ['a' => str_repeat('x', 5001)]])->assertUnprocessable();
        $this->actingAs($owner)->putJson('/api/drafts/profile:RCH-TIDAK-ADA', ['data' => ['a' => 'b']])->assertNotFound();
        $this->assertDatabaseCount('form_drafts', 0);
    }

    public function test_saving_the_form_removes_its_draft(): void
    {
        $owner = $this->user('vendor');
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => ['name' => 'PT Baru']])->assertOk();
        $id = $this->actingAs($owner)->postJson('/api/vendors', $this->profile())->assertOk()->json('id');
        $this->assertDatabaseMissing('form_drafts', ['scope' => 'profile:new']);

        $this->actingAs($owner)->putJson('/api/drafts/profile:'.$id, ['data' => ['name' => 'PT Ubah']])->assertOk();
        $this->actingAs($owner)->putJson('/api/vendors/'.$id, $this->profile())->assertOk();
        $this->assertDatabaseCount('form_drafts', 0);

        $r = $this->user('verifikator');
        $v = $this->vendor($owner, 'Menunggu Verifikasi Dokumen');
        $this->actingAs($r)->putJson('/api/drafts/review:'.$v->id, ['data' => ['evaluator' => 'Ani']])->assertOk();
        $this->actingAs($r)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'save', 'scores' => $this->scores(.5)])->assertOk();
        $this->assertDatabaseCount('form_drafts', 0);

        // A rejected save (not every criterion rated) keeps the draft.
        $this->actingAs($r)->putJson('/api/drafts/review:'.$v->id, ['data' => ['evaluator' => 'Ani']])->assertOk();
        $this->actingAs($r)->postJson('/api/vendors/'.$v->id.'/assessments/review', ['action' => 'save', 'scores' => []])->assertUnprocessable();
        $this->assertDatabaseCount('form_drafts', 1);
    }

    public function test_drafts_follow_the_vendor_and_the_user_when_deleted(): void
    {
        $owner = $this->user('vendor');
        $v = $this->vendor($owner, 'Menunggu Verifikasi Dokumen');
        $r = $this->user('verifikator');
        $this->actingAs($r)->putJson('/api/drafts/review:'.$v->id, ['data' => ['evaluator' => 'Ani']])->assertOk();
        $this->actingAs($owner)->putJson('/api/drafts/profile:new', ['data' => ['name' => 'x']])->assertOk();

        $this->actingAs($this->user('admin'))->deleteJson('/api/vendors/'.$v->id)->assertOk();
        $this->assertDatabaseMissing('form_drafts', ['scope' => 'review:'.$v->id]);
        $this->assertDatabaseHas('form_drafts', ['scope' => 'profile:new']);
    }
}
