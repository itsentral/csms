<?php
namespace App\Http\Controllers;
use App\Models\Vendor;
use App\Models\User;
use App\Services\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
class PortalController extends Controller {
 public function state(Request $r){
  $q=Vendor::orderBy('created_at');if(!$r->user()->hasRole('verifikator','validator','pengadaan'))$q->where('owner_id',$r->user()->id);
  return ['session'=>$r->user()->publicData(),'vendors'=>$q->get()->map(fn($v)=>Portal::serialize($v)),'accounts'=>$r->user()->hasRole('admin')?User::where('active',true)->get()->map(fn($u)=>$u->publicData()):[]];
 }
 public function profile(Request $r, ?Vendor $vendor=null){
  Portal::role($r->user(),'vendor');
  $rules=[];foreach(['name','nib','pic','email','business','address','scope'] as $f)$rules[$f]='required|string|max:'.(in_array($f,['address','scope'])?5000:255);
  foreach(['npwp','phone','ossRisk','branch','notes'] as $f)$rules[$f]='nullable|string|max:'.($f==='notes'?5000:255);$rules['email']='required|email|max:255';
  $d=$r->validate($rules);
  return DB::transaction(function()use($r,$vendor,$d){
   if($vendor){$vendor=Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();Portal::authorize($r->user(),$vendor);abort_unless(in_array($vendor->status,['Menunggu Pengisian','Perlu Perbaikan']),409,'Profil sudah dikirim dan terkunci.');}
   else $vendor=new Vendor(['id'=>'RCH-'.date('Y').'-'.Str::upper(Str::random(12)),'owner_id'=>$r->user()->id,'status'=>'Menunggu Pengisian']);
   $vendor->fill(array_map(fn($x)=>$x??'',$d));$vendor->save();Portal::audit('vendor_saved',$vendor->id);return Portal::serialize($vendor);
  });
 }
 public function answers(Request $r,Vendor $vendor){
  Portal::role($r->user(),'vendor');Portal::authorize($r->user(),$vendor);
  $d=$r->validate(['answers'=>'required|array','answers.*.question_id'=>'required|distinct|exists:questions,id','answers.*.answer'=>['required',Rule::in(['Ya','Tidak'])],'answers.*.note'=>'nullable|string|max:5000']);
  abort_unless(count($d['answers'])===DB::table('questions')->count(),422,'Jawab semua pertanyaan sebelum mengirim.');
  return DB::transaction(function()use($vendor,$d){$v=Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();abort_unless(in_array($v->status,['Menunggu Pengisian','Perlu Perbaikan']),409,'Pengajuan sedang diproses atau sudah final.');
   foreach($d['answers'] as $a)DB::table('answers')->updateOrInsert(['vendor_id'=>$v->id,'question_id'=>$a['question_id']],['answer'=>$a['answer'],'note'=>$a['note']??'','updated_at'=>now(),'created_at'=>now()]);
   // Returned submissions start a fresh scoring round. Previous scores remain in audit history.
   if($v->status==='Perlu Perbaikan'){Portal::audit('previous_round_archived',$v->id,Portal::serialize($v));DB::table('assessments')->where('vendor_id',$v->id)->delete();}
   $v->update(['status'=>'Menunggu Verifikasi Dokumen']);Portal::audit('questionnaire_submitted',$v->id);return Portal::serialize($v);
  });
 }
 public function upload(Request $r,Vendor $vendor){
  Portal::role($r->user(),'vendor');Portal::authorize($r->user(),$vendor);
  $d=$r->validate(['question_id'=>'required|exists:questions,id','file'=>'required|file|max:15360|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|extensions:pdf,doc,docx,xls,xlsx,jpg,jpeg,png']);
  return DB::transaction(function()use($r,$vendor,$d){$v=Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();abort_unless(in_array($v->status,['Menunggu Pengisian','Perlu Perbaikan']),409,'Lampiran sudah terkunci.');
   $file=$r->file('file');$id=(string)Str::uuid();$path=$file->store('evidence/'.$vendor->id,'local');
   try{DB::table('evidence')->insert(['id'=>$id,'vendor_id'=>$v->id,'question_id'=>$d['question_id'],'uploaded_by'=>$r->user()->id,'name'=>mb_substr(basename($file->getClientOriginalName()),0,240),'path'=>$path,'mime'=>$file->getMimeType(),'size'=>$file->getSize(),'created_at'=>now(),'updated_at'=>now()]);Portal::audit('evidence_uploaded',$v->id,['id'=>$id]);}catch(\Throwable $e){Storage::disk('local')->delete($path);throw $e;}
   return ['id'=>$id,'name'=>$file->getClientOriginalName(),'size'=>$file->getSize(),'type'=>$file->getMimeType()];
  });
 }
 public function download(Request $r,string $id){$f=DB::table('evidence')->where('id',$id)->first();abort_unless($f,404);Portal::authorize($r->user(),Vendor::findOrFail($f->vendor_id));Portal::audit('evidence_downloaded',$f->vendor_id,['id'=>$id]);return Storage::disk('local')->download($f->path,$f->name,['X-Content-Type-Options'=>'nosniff']);}
 public function assessment(Request $r,Vendor $vendor,string $stage){
  abort_unless(in_array($stage,['review','validation']),404);Portal::role($r->user(),$stage==='review'?'verifikator':'validator');
  $d=$r->validate(['scores'=>'required|array','scores.*.question_id'=>'required|distinct|exists:questions,id','scores.*.score'=>['required','numeric',Rule::in([0,0.25,0.5,0.75,1])],'scores.*.comment'=>'nullable|string|max:5000','docDate'=>'nullable|date','fieldDate'=>'nullable|date','evaluator'=>'nullable|string|max:255','validator'=>'nullable|string|max:255','fieldLocation'=>'nullable|string|max:255','fieldResult'=>['nullable',Rule::in(['Belum dilakukan','Sesuai','Sesuai dengan catatan','Tidak sesuai'])],'action'=>['required',Rule::in(['save','advance','return','finalize'])]]);
  abort_unless(count($d['scores'])===DB::table('questions')->count(),422,'Seluruh kriteria wajib dinilai.');
  abort_if(($stage==='review'&&$d['action']==='finalize')||($stage==='validation'&&in_array($d['action'],['advance','return'])),422);
  return DB::transaction(function()use($r,$vendor,$stage,$d){
   $v=Vendor::whereKey($vendor->id)->lockForUpdate()->firstOrFail();$expected=$stage==='review'?'Menunggu Verifikasi Dokumen':'Menunggu Validasi Lapangan';abort_unless($v->status===$expected,409,'Tahap penilaian tidak sesuai atau sudah dikunci.');
   if($d['action']==='finalize')abort_unless(!empty($d['fieldDate'])&&!empty($d['fieldLocation'])&&($d['fieldResult']??'Belum dilakukan')!=='Belum dilakukan',422,'Lengkapi tanggal, lokasi, dan hasil validasi.');
   $metadata=array_intersect_key($d,array_flip($stage==='review'?['docDate','evaluator']:['fieldDate','validator','fieldLocation','fieldResult']));
   $key=['vendor_id'=>$v->id,'user_id'=>$r->user()->id,'stage'=>$stage];$a=DB::table('assessments')->where($key)->first();
   $values=['metadata'=>json_encode($metadata),'updated_at'=>now()];
   if($a){$aid=$a->id;DB::table('assessments')->where('id',$aid)->update($values);}else{$aid=DB::table('assessments')->insertGetId($key+$values+['created_at'=>now()]);}
   foreach($d['scores'] as $s)DB::table('assessment_scores')->updateOrInsert(['assessment_id'=>$aid,'question_id'=>$s['question_id']],['score'=>$s['score'],'comment'=>$s['comment']??'']);
   foreach($metadata as $k=>$val)$v->$k=$val??(in_array($k,['docDate','fieldDate'])?null:'');
   if($d['action']==='advance')$v->status='Menunggu Validasi Lapangan';
   if($d['action']==='return')$v->status='Perlu Perbaikan';
   if($d['action']==='finalize'){$v->status='Tervalidasi';$total=Portal::total($v->id,'validation');$v->finalRisk=Portal::category($total/565*100);$v->finalizedAt=now();$v->final_snapshot=['total'=>$total,'percentage'=>$total/565*100,'category'=>$v->finalRisk,'scope'=>$v->scope,'name'=>$v->name,'fieldDate'=>$v->fieldDate];}
   $v->save();Portal::audit($stage.'_'.$d['action'],$v->id,['assessment_id'=>$aid,'scores'=>$d['scores'],'metadata'=>$metadata]);return Portal::serialize($v);
  });
 }
 public function account(Request $r){Portal::role($r->user(),'admin');$d=$r->validate(['name'=>'required|string|max:255','username'=>'required|email|max:255|unique:users,email','password'=>'required|string|min:12|max:128','role'=>'required|array|min:1','role.*'=>['required',Rule::in(['admin','verifikator','validator','pengadaan'])]]);$u=User::create(['name'=>$d['name'],'email'=>strtolower($d['username']),'password'=>$d['password'],'roles'=>in_array('admin',$d['role'])?['admin']:array_values(array_unique($d['role']))]);Portal::audit('account_created',null,['user_id'=>$u->id]);return $u->publicData();}
 public function resetPassword(Request $r,User $user){Portal::role($r->user(),'admin');abort_if(in_array('vendor',$user->roles??[]),403);$d=$r->validate(['password'=>'required|string|min:12|max:128']);$user->update($d);DB::table('sessions')->where('user_id',$user->id)->delete();Portal::audit('account_password_reset',null,['user_id'=>$user->id]);return ['ok'=>true];}
 public function deactivate(Request $r,User $user){Portal::role($r->user(),'admin');abort_if($user->id===$r->user()->id || in_array('admin',$user->roles??[]) || in_array('vendor',$user->roles??[]),422,'Akun sendiri/admin/vendor tidak dapat dihapus dari menu internal.');$user->update(['active'=>false]);DB::table('sessions')->where('user_id',$user->id)->delete();Portal::audit('account_deactivated',null,['user_id'=>$user->id]);return ['ok'=>true];}
 public function export(Request $r){Portal::audit('export');return response()->json($this->state($r)['vendors'])->header('Content-Disposition','attachment; filename="rchsems-vendors.json"');}
}
