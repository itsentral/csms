<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the tables of the first implementation (roles, vendor profiles, applications, criteria, reviews).
 * Their create migrations were deleted, so fresh installs never create them; databases that already ran
 * those migrations drop them here. Nothing in the application reads or writes these tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Children first, so foreign keys never block a drop.
        foreach (['review_scores', 'reviews', 'evidence_documents', 'application_criteria', 'criteria', 'rchsems_applications', 'vendor_profiles', 'role_user', 'roles'] as $table) {
            Schema::dropIfExists($table);
        }
    }

    public function down(): void
    {
        // Intentionally empty: the legacy schema is not restored.
    }
};
