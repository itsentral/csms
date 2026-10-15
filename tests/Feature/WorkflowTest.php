<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use App\Models\User;
use App\Models\Vendor;
use App\Services\Portal;
use Database\Seeders\QuestionSeeder;
class WorkflowTest extends TestCase {
 use RefreshDatabase;
 protected function setUp(): void {parent::setUp();$this->seed(QuestionSeeder::class);}
 private function user(string $role): User{return User::create(['name'=>$role,'email'=>uniqid().'@example.test','password'=>'Testing12345!','roles'=>[$role]]);}
 private function vendor(User $u,string $status='Menunggu Pengisian'): Vendor{return Vendor::create(['id'=>'RCH-'.uniqid(),'owner_id'=>$u->id,'name'=>'PT Test','scope'=>'Pemeliharaan','status'=>$status]);}
 private function scores(float $n): array {return DB::table('questions')->get()->map(fn($q)=>['question_id'=>$q->id,'score'=>$n,'comment'=>'Bukti diperiksa'])->all();}
 public function test_master_matches_mockup(): void {$this->assertEquals(49,DB::table('questions')->count());$this->assertEquals(565,DB::table('questions')->sum('max'));$this->seed(QuestionSeeder::class);$this->assertEquals(49,DB::table('questions')->count());}
 public function test_registration_does_not_allow_role_escalation(): void {$this->postJson('/api/register',['name'=>'Vendor','username'=>'new@example.test','password'=>'Testing12345!','role'=>['admin']])->assertCreated()->assertJsonPath('role.0','vendor');$this->postJson('/api/accounts',[])->assertForbidden();}
 public function test_vendor_isolation_and_role_permissions(): void {$one=$this->user('vendor');$two=$this->user('vendor');$v=$this->vendor($one);$this->actingAs($two)->getJson('/api/state')->assertJsonCount(0,'vendors');$this->actingAs($two)->postJson('/api/vendors/'.$v->id.'/answers',['answers'=>[]])->assertForbidden();$this->actingAs($two)->postJson('/api/vendors/'.$v->id.'/assessments/review',[])->assertForbidden();}
 public function test_complete_workflow_multi_reviewer_average_and_lock(): void {
  $u=$this->user('vendor');$v=$this->vendor($u);$answers=DB::table('questions')->get()->map(fn($q)=>['question_id'=>$q->id,'answer'=>'Ya','note'=>'Bukti'])->all();
  $this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers',['answers'=>$answers])->assertOk()->assertJsonPath('status','Menunggu Verifikasi Dokumen');
  $r1=$this->user('verifikator');$r2=$this->user('verifikator');
  $this->actingAs($r1)->postJson('/api/vendors/'.$v->id.'/assessments/review',['action'=>'save','scores'=>$this->scores(1)])->assertOk();
  $this->actingAs($r2)->postJson('/api/vendors/'.$v->id.'/assessments/review',['action'=>'advance','scores'=>$this->scores(.5)])->assertOk()->assertJsonPath('totals.review',423.75);
  $this->actingAs($r1)->postJson('/api/vendors/'.$v->id.'/assessments/review',['action'=>'save','scores'=>$this->scores(0)])->assertConflict();
  $a=$this->user('validator');$b=$this->user('validator');
  $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation',['action'=>'save','scores'=>$this->scores(.5)])->assertOk();
  $this->actingAs($b)->postJson('/api/vendors/'.$v->id.'/assessments/validation',['action'=>'finalize','scores'=>$this->scores(1),'fieldDate'=>'2026-10-14','fieldLocation'=>'Jakarta','fieldResult'=>'Sesuai'])->assertOk()->assertJsonPath('status','Tervalidasi')->assertJsonPath('finalRisk','Risiko Tinggi')->assertJsonPath('totals.validation',423.75);
  $this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation',['action'=>'save','scores'=>$this->scores(0)])->assertConflict();
  $this->assertNotNull($v->fresh()->final_snapshot);$this->assertDatabaseHas('audit_logs',['action'=>'validation_finalize','vendor_id'=>$v->id]);
 }
 public function test_invalid_score_and_wrong_stage_rejected(): void {$v=$this->vendor($this->user('vendor'));$a=$this->user('validator');$this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation',['action'=>'save','scores'=>$this->scores(.5)])->assertConflict();$this->actingAs($a)->postJson('/api/vendors/'.$v->id.'/assessments/validation',['action'=>'save','scores'=>$this->scores(.7)])->assertUnprocessable();}
 public function test_correction_starts_fresh_assessment_round(): void {$u=$this->user('vendor');$v=$this->vendor($u,'Menunggu Verifikasi Dokumen');$this->actingAs($this->user('verifikator'))->postJson('/api/vendors/'.$v->id.'/assessments/review',['action'=>'return','scores'=>$this->scores(.25)])->assertOk();$answers=DB::table('questions')->get()->map(fn($q)=>['question_id'=>$q->id,'answer'=>'Tidak'])->all();$this->actingAs($u)->postJson('/api/vendors/'.$v->id.'/answers',['answers'=>$answers])->assertOk();$this->assertDatabaseCount('assessments',0);$this->assertDatabaseHas('audit_logs',['action'=>'previous_round_archived']);}
 public function test_evidence_is_private_and_downloadable(): void {Storage::fake('local');$u=$this->user('vendor');$v=$this->vendor($u);$file=UploadedFile::fake()->createWithContent('bukti.png',base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NvEAAAAASUVORK5CYII='));$r=$this->actingAs($u)->post('/api/vendors/'.$v->id.'/evidence',['question_id'=>'1.a','file'=>$file],['Accept'=>'application/json'])->assertOk();$id=$r->json('id');$this->actingAs($this->user('vendor'))->get('/api/evidence/'.$id)->assertForbidden();$this->actingAs($this->user('verifikator'))->get('/api/evidence/'.$id)->assertOk();}
 public function test_guest_and_inactive_user_are_blocked(): void {$this->getJson('/api/state')->assertUnauthorized();$u=$this->user('vendor');$u->update(['active'=>false]);$this->actingAs($u)->getJson('/api/state')->assertForbidden();}
 public function test_internal_account_multi_roles_and_safe_deactivation(): void {$admin=$this->user('admin');$this->actingAs($admin)->postJson('/api/accounts',['username'=>'both@example.test','name'=>'Penilai','password'=>'Testing12345!','role'=>['verifikator','validator']])->assertOk()->assertJsonCount(2,'role');$u=User::where('email','both@example.test')->first();$this->deleteJson('/api/accounts/'.$u->id)->assertOk();$this->assertFalse($u->fresh()->active);$this->deleteJson('/api/accounts/'.$admin->id)->assertUnprocessable();}
 public function test_risk_thresholds(): void {foreach([[0,'Tidak Lulus'],[34.99,'Tidak Lulus'],[35,'Risiko Rendah'],[50,'Risiko Menengah'],[70,'Risiko Tinggi'],[100,'Risiko Tinggi']] as [$n,$category])$this->assertSame($category,Portal::category($n));}
}
