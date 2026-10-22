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
            // Master yang sudah ada tidak ditimpa; hanya melengkapi terjemahan English yang masih kosong.
            DB::table('questions')->where('id', $q['id'])->whereNull('text_en')->update(['group_en' => $q['group_en'], 'text_en' => $q['text_en']]);
        }
    }
}
