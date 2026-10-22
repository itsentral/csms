<?php

namespace App\Enums;

/** Status alur vendor. Nilai disimpan apa adanya di `vendors.status` dan juga dikirim ke klien (lihat `map()`). */
enum VendorStatus: string
{
    case AwaitingFill = 'Menunggu Pengisian';
    case NeedsRevision = 'Perlu Perbaikan';
    case AwaitingVerification = 'Menunggu Verifikasi Dokumen';
    case AwaitingValidation = 'Menunggu Validasi Lapangan';
    case Validated = 'Tervalidasi';

    /** Status saat vendor masih boleh mengisi atau mengubah pengajuan. @return list<string> */
    public static function editable(): array
    {
        return [self::AwaitingFill->value, self::NeedsRevision->value];
    }

    /** Peta nama (camelCase) => nilai, dipakai klien sebagai konstanta `STATUS`. @return array<string,string> */
    public static function map(): array
    {
        $map = [];
        foreach (self::cases() as $case) {
            $map[lcfirst($case->name)] = $case->value;
        }

        return $map;
    }
}
