<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Unsaved form input (vendor profile, verification and validation scores), kept per user so closing the page
        // by accident loses nothing. One row per user and form (`scope`, e.g. "review:RCH-2026-ABC").
        Schema::create('form_drafts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('scope', 80);
            $t->json('data');
            $t->timestamps();
            $t->unique(['user_id', 'scope']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_drafts');
    }
};
