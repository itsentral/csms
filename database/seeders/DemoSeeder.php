<?php
namespace Database\Seeders;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class DemoSeeder extends Seeder {
 public function run(): void {
  if(!app()->environment(['local','testing']))throw new \RuntimeException('DemoSeeder hanya untuk local/testing.');
  $this->call(QuestionSeeder::class);
  foreach(['admin','vendor','verifikator','validator','pengadaan'] as $role)User::firstOrCreate(['email'=>$role.'@example.test'],['name'=>ucfirst($role).' Demo','password'=>'LocalDemo2026!','roles'=>[$role]]);
  $u=User::where('email','vendor@example.test')->first();
  Vendor::firstOrCreate(['id'=>'RCH-DEMO-001'],['owner_id'=>$u->id,'name'=>'PT Vendor Contoh (Demo)','nib'=>'1234567890123','email'=>$u->email,'pic'=>'PIC Demo','business'=>'Pemeliharaan','scope'=>'Pemeliharaan fasilitas','address'=>'Jakarta','status'=>'Menunggu Pengisian']);
 }
}
