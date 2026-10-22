<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/** Menyusun data ekspor vendor menjadi sheet XLSX. Header mengikuti bahasa antarmuka (id/en). */
class VendorExport
{
    private const L = [
        'id' => [
            'vendors' => 'Vendor', 'answers' => 'Jawaban', 'scores' => 'Penilaian',
            'v' => ['ID Vendor', 'Perusahaan', 'NIB', 'NPWP', 'Tingkat Risiko OSS', 'Penanggung Jawab HSE', 'Email', 'Telepon', 'Bidang Usaha', 'Cabang/Unit', 'Alamat', 'Lingkup Pekerjaan', 'Status', 'Tanggal Verifikasi Dokumen', 'Evaluator', 'Tanggal Validasi Lapangan', 'Validator', 'Lokasi Validasi', 'Hasil Tinjauan', 'Nilai Verifikasi', 'Nilai Validasi', 'Persentase Validasi (%)', 'Kategori Risiko', 'Ditetapkan Pada', 'Dibuat'],
            'a' => ['ID Vendor', 'Perusahaan', 'Proses', 'No.', 'Pertanyaan', 'Jawaban', 'Keterangan', 'Jumlah Lampiran'],
            's' => ['ID Vendor', 'Perusahaan', 'No.', 'Pertanyaan', 'Bobot', 'Rata-rata Matriks Verifikasi', 'Nilai Verifikasi', 'Rata-rata Matriks Validasi', 'Nilai Validasi'],
        ],
        'en' => [
            'vendors' => 'Vendors', 'answers' => 'Answers', 'scores' => 'Scores',
            'v' => ['Vendor ID', 'Company', 'NIB', 'Tax ID (NPWP)', 'OSS Risk Level', 'HSE Person in Charge', 'Email', 'Phone', 'Line of Business', 'Branch/Unit', 'Address', 'Requested Scope of Work', 'Status', 'Document Verification Date', 'Evaluator', 'Field Validation Date', 'Validator', 'Validation Location', 'Review Result', 'Verification Score', 'Validation Score', 'Validation Percentage (%)', 'Risk Category', 'Determined At', 'Created'],
            'a' => ['Vendor ID', 'Company', 'Process', 'No.', 'Question', 'Answer', 'Note', 'Attachments'],
            's' => ['Vendor ID', 'Company', 'No.', 'Question', 'Weight', 'Avg Verification Matrix', 'Verification Score', 'Avg Validation Matrix', 'Validation Score'],
        ],
    ];

    /** @param iterable<array> $vendors hasil Portal::serializeMany */
    public static function build(iterable $vendors, string $lang, string $path): void
    {
        $l = self::L[$lang] ?? self::L['id'];
        $questions = DB::table('questions')->orderBy('position')->get();
        $max = max(1.0, Portal::maxTotal());
        $en = $lang === 'en';
        $qText = fn ($q) => $en ? ($q->text_en ?: $q->text) : $q->text;
        $qGroup = fn ($q) => $en ? ($q->group_en ?: $q->group) : $q->group;
        $vRows = [$l['v']];
        $aRows = [$l['a']];
        $sRows = [$l['s']];
        foreach ($vendors as $v) {
            $done = ($v['status'] ?? '') === 'Tervalidasi';
            $vRows[] = [$v['id'], $v['name'] ?? '', $v['nib'] ?? '', $v['npwp'] ?? '', $v['ossRisk'] ?? '', $v['pic'] ?? '', $v['email'] ?? '', $v['phone'] ?? '', $v['business'] ?? '', $v['branch'] ?? '', $v['address'] ?? '', $v['scope'] ?? '', $v['status'] ?? '', $v['docDate'] ?? '', $v['evaluator'] ?? '', $v['fieldDate'] ?? '', $v['validator'] ?? '', $v['fieldLocation'] ?? '', $v['fieldResult'] ?? '', round((float) ($v['totals']['review'] ?? 0), 2), round((float) ($v['totals']['validation'] ?? 0), 2), $done ? round((float) $v['totals']['validation'] / $max * 100, 2) : '', $v['finalRisk'] ?? '', $v['finalizedAt'] ?? '', $v['created'] ?? ''];
            $answers = (array) ($v['answers'] ?? []);
            $byStage = [];
            foreach (['review' => 'reviewByUser', 'validation' => 'validationByUser'] as $stage => $key) {
                foreach ((array) ($v[$key] ?? []) as $record) {
                    foreach ((array) ($record['scores'] ?? []) as $qid => $s) {
                        $byStage[$stage][$qid][] = (float) $s['score'];
                    }
                }
            }
            foreach ($questions as $q) {
                $a = (array) ($answers[$q->id] ?? []);
                if (($a['answer'] ?? '') !== '' || ! empty($a['files'])) {
                    $aRows[] = [$v['id'], $v['name'] ?? '', $qGroup($q), $q->id, $qText($q), $a['answer'] ?? '', $a['note'] ?? '', count($a['files'] ?? [])];
                }
                $rv = $byStage['review'][$q->id] ?? null;
                $vl = $byStage['validation'][$q->id] ?? null;
                if ($rv || $vl) {
                    $ra = $rv ? array_sum($rv) / count($rv) : null;
                    $va = $vl ? array_sum($vl) / count($vl) : null;
                    $sRows[] = [$v['id'], $v['name'] ?? '', $q->id, $qText($q), (int) $q->max, $ra !== null ? round($ra, 2) : '', $ra !== null ? round($ra * $q->max, 2) : '', $va !== null ? round($va, 2) : '', $va !== null ? round($va * $q->max, 2) : ''];
                }
            }
        }
        XlsxWriter::write([$l['vendors'] => $vRows, $l['answers'] => $aRows, $l['scores'] => $sRows], $path);
    }
}
