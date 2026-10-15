<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('roles', function(Blueprint $t){$t->id();$t->string('name');$t->string('slug')->unique();$t->timestamps();});
        Schema::create('role_user', function(Blueprint $t){$t->id();$t->foreignId('role_id')->constrained()->cascadeOnDelete();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->timestamps();$t->unique(['role_id','user_id']);});
        Schema::create('vendor_profiles', function(Blueprint $t){
            $t->id();$t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();$t->string('company_name');
            $t->string('branch_name')->nullable();$t->string('business_scope');$t->text('business_address');$t->string('phone',40);
            $t->string('tax_id')->nullable();$t->timestamps();
        });
    }
    public function down(): void {Schema::dropIfExists('vendor_profiles');Schema::dropIfExists('role_user');Schema::dropIfExists('roles');}
};
