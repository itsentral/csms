<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::table('users',function(Blueprint $t){$t->json('roles')->nullable();$t->boolean('active')->default(true);});
  Schema::create('questions',function(Blueprint $t){$t->string('id',8)->primary();$t->string('group');$t->text('text');$t->unsignedSmallInteger('max');$t->unsignedSmallInteger('position');});
  Schema::create('vendors',function(Blueprint $t){
   $t->string('id',48)->primary();$t->foreignId('owner_id')->constrained('users')->restrictOnDelete();
   foreach(['name','nib','npwp','pic','email','phone','business','ossRisk','branch','evaluator','validator','fieldLocation','fieldResult'] as $c)$t->string($c)->default('');
   foreach(['address','scope','notes'] as $c)$t->text($c)->nullable();
   $t->string('status')->default('Menunggu Pengisian')->index();$t->date('docDate')->nullable();$t->date('fieldDate')->nullable();
   $t->string('finalRisk')->nullable();$t->timestamp('finalizedAt')->nullable();$t->json('final_snapshot')->nullable();$t->timestamps();
  });
  Schema::create('answers',function(Blueprint $t){$t->id();$t->string('vendor_id',48);$t->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();$t->string('question_id',8);$t->foreign('question_id')->references('id')->on('questions');$t->string('answer')->default('');$t->text('note')->nullable();$t->timestamps();$t->unique(['vendor_id','question_id']);});
  Schema::create('evidence',function(Blueprint $t){$t->uuid('id')->primary();$t->string('vendor_id',48);$t->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();$t->string('question_id',8);$t->foreign('question_id')->references('id')->on('questions');$t->foreignId('uploaded_by')->constrained('users');$t->string('name');$t->string('path');$t->string('mime');$t->unsignedBigInteger('size');$t->timestamps();});
  Schema::create('assessments',function(Blueprint $t){$t->id();$t->string('vendor_id',48);$t->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();$t->foreignId('user_id')->constrained('users')->restrictOnDelete();$t->string('stage',20);$t->json('metadata');$t->timestamps();$t->unique(['vendor_id','user_id','stage']);});
  Schema::create('assessment_scores',function(Blueprint $t){$t->id();$t->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();$t->string('question_id',8);$t->foreign('question_id')->references('id')->on('questions');$t->decimal('score',3,2);$t->text('comment')->nullable();$t->unique(['assessment_id','question_id']);});
  Schema::create('audit_logs',function(Blueprint $t){$t->id();$t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();$t->string('vendor_id',48)->nullable()->index();$t->string('action');$t->json('details')->nullable();$t->string('ip',45)->nullable();$t->timestamp('created_at')->useCurrent();});
 }
 public function down(): void {foreach(['audit_logs','assessment_scores','assessments','evidence','answers','vendors','questions'] as $table)Schema::dropIfExists($table);Schema::table('users',fn(Blueprint $t)=>$t->dropColumn(['roles','active']));}
};
