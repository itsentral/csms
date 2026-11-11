<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Scoring rubric per question: five criteria for matrix 0, 0.25, 0.5, 0.75, and 1 (LAMPIRAN 3-A), in Indonesian and English. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $t) {
            $t->json('rubric')->nullable();
            $t->json('rubric_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $t) {
            $t->dropColumn(['rubric', 'rubric_en']);
        });
    }
};
