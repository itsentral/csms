<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (json_decode(file_get_contents(database_path('data/questions.json')), true) as $i => $q) {
            $rubric = isset($q['rubric']) ? json_encode($q['rubric'], JSON_UNESCAPED_UNICODE) : null;
            $rubricEn = isset($q['rubric_en']) ? json_encode($q['rubric_en'], JSON_UNESCAPED_UNICODE) : null;
            DB::table('questions')->insertOrIgnore(['position' => $i, 'rubric' => $rubric, 'rubric_en' => $rubricEn] + $q);
            // An existing master is not overwritten (weights and text stay as they are); only missing translations and
            // missing scoring rubrics are filled in.
            DB::table('questions')->where('id', $q['id'])->whereNull('text_en')->update(['group_en' => $q['group_en'], 'text_en' => $q['text_en']]);
            DB::table('questions')->where('id', $q['id'])->whereNull('rubric')->update(['rubric' => $rubric]);
            DB::table('questions')->where('id', $q['id'])->whereNull('rubric_en')->update(['rubric_en' => $rubricEn]);
        }
    }
}
