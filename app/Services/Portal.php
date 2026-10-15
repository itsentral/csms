<?php
namespace App\Services;
use App\Models\Vendor;
use App\Models\User;
use Illuminate\Support\Facades\DB;
class Portal {
 public static function authorize(User $u, Vendor $v): void {abort_unless($u->hasRole('verifikator','validator','pengadaan') || ($u->hasRole('vendor') && $v->owner_id===$u->id),403);}
 public static function role(User $u,string ...$roles): void {abort_unless($u->hasRole(...$roles),403);}
 public static function audit(string $action, ?string $vendor=null,array $details=[]): void {DB::table('audit_logs')->insert(['user_id'=>auth()->id(),'vendor_id'=>$vendor,'action'=>$action,'details'=>json_encode($details),'ip'=>request()->ip(),'created_at'=>now()]);}
 public static function category(float $n): string {return $n>=70?'Risiko Tinggi':($n>=50?'Risiko Menengah':($n>=35?'Risiko Rendah':'Tidak Lulus'));}
 public static function serialize(Vendor $v): array {
  $data=$v->toArray();unset($data['owner_id'],$data['final_snapshot']);$data['created']=substr($v->created_at,0,10);
  $data['answers']=[];$data['docs']=new \stdClass;$data['review']=new \stdClass;$data['validation']=new \stdClass;
  foreach(DB::table('answers')->where('vendor_id',$v->id)->get() as $a)$data['answers'][$a->question_id]=['answer'=>$a->answer,'note'=>$a->note,'files'=>[]];
  foreach(DB::table('evidence')->where('vendor_id',$v->id)->get() as $f){$data['answers'][$f->question_id]??=['answer'=>'','note'=>'','files'=>[]];$data['answers'][$f->question_id]['files'][]=['id'=>$f->id,'name'=>$f->name,'size'=>$f->size,'type'=>$f->mime];}
  foreach(['review','validation'] as $stage){
   $records=[];
   foreach(DB::table('assessments')->join('users','users.id','=','assessments.user_id')->where('vendor_id',$v->id)->where('stage',$stage)->select('assessments.*','users.email','users.name')->get() as $a){
    $scores=[];foreach(DB::table('assessment_scores')->where('assessment_id',$a->id)->get() as $s)$scores[$s->question_id]=['score'=>(float)$s->score,'comment'=>$s->comment];
    $records[$a->email]=['name'=>$a->name,'date'=>$a->updated_at,'scores'=>(object)$scores];
   }
   $data[$stage.'ByUser']=(object)$records;
  }
  $data['answers']=(object)$data['answers'];
  $data['totals']=['review'=>self::total($v->id,'review'),'validation'=>self::total($v->id,'validation')];
  return $data;
 }
 public static function total(string $id,string $stage): float {
  return (float) DB::query()->fromSub(DB::table('assessment_scores as s')->join('assessments as a','a.id','=','s.assessment_id')->join('questions as q','q.id','=','s.question_id')->where('a.vendor_id',$id)->where('a.stage',$stage)->groupBy('s.question_id','q.max')->selectRaw('AVG(s.score) * q.max as weighted'),'totals')->sum('weighted');
 }
}
