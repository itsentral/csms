<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (json_decode(file_get_contents(database_path('data/questions.json')), true) as $i => $q) {
            $q['position'] = $i;
            DB::table('questions')->insertOrIgnore($q);
            // An existing master is not overwritten; only missing English translations are filled in.
            DB::table('questions')->where('id', $q['id'])->whereNull('text_en')->update(['group_en' => $q['group_en'], 'text_en' => $q['text_en']]);
        }
    }
}
