<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rchsems_applications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('vendor_profile_id')->constrained()->cascadeOnDelete();
            $t->string('registration_number')->unique();
            $t->string('scope');
            $t->string('status')->default('draft')->index();
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('validated_at')->nullable();
            $t->decimal('final_score', 7, 2)->nullable();
            $t->string('risk_category')->nullable();
            $t->date('certificate_expires_at')->nullable();
            $t->timestamps();
        });
        Schema::create('criteria', function (Blueprint $t) {
            $t->id();
            $t->string('group_name');
            $t->string('code')->unique();
            $t->string('title');
            $t->text('description')->nullable();
            $t->decimal('max_weight', 7, 2)->default(0);
            $t->unsignedInteger('sort_order')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('application_criteria', function (Blueprint $t) {
            $t->id();
            $t->foreignId('application_id')->constrained('rchsems_applications')->cascadeOnDelete();
            $t->foreignId('criterion_id')->constrained()->restrictOnDelete();
            $t->longText('vendor_answer')->nullable();
            $t->text('vendor_comment')->nullable();
            $t->timestamps();
            $t->unique(['application_id', 'criterion_id']);
        });
        Schema::create('evidence_documents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('application_criterion_id')->constrained()->cascadeOnDelete();
            $t->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $t->string('original_name');
            $t->string('storage_path');
            $t->string('mime_type')->nullable();
            $t->unsignedBigInteger('size_bytes');
            $t->timestamps();
        });
        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->foreignId('application_id')->constrained('rchsems_applications')->cascadeOnDelete();
            $t->foreignId('reviewer_id')->constrained('users')->restrictOnDelete();
            $t->enum('type', ['verification', 'validation']);
            $t->string('status')->default('draft');
            $t->text('overall_comment')->nullable();
            $t->timestamp('submitted_at')->nullable();
            $t->timestamps();
            $t->unique(['application_id', 'reviewer_id', 'type']);
        });
        Schema::create('review_scores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('review_id')->constrained()->cascadeOnDelete();
            $t->foreignId('application_criterion_id')->constrained()->cascadeOnDelete();
            $t->decimal('score_factor', 4, 2);
            $t->decimal('weighted_score', 7, 2);
            $t->text('comment')->nullable();
            $t->timestamps();
            $t->unique(['review_id', 'application_criterion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_scores');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('evidence_documents');
        Schema::dropIfExists('application_criteria');
        Schema::dropIfExists('criteria');
        Schema::dropIfExists('rchsems_applications');
    }
};
