<?php

namespace App\Enums;

/** Vendor workflow status. Values are stored as-is in `vendors.status` and also sent to the client (see `map()`). */
enum VendorStatus: string
{
    case AwaitingFill = 'Menunggu Pengisian';
    case NeedsRevision = 'Perlu Perbaikan';
    case AwaitingVerification = 'Menunggu Verifikasi Dokumen';
    case AwaitingValidation = 'Menunggu Validasi Lapangan';
    case Validated = 'Tervalidasi';

    /** Statuses in which the vendor may still fill in or change the submission. @return list<string> */
    public static function editable(): array
    {
        return [self::AwaitingFill->value, self::NeedsRevision->value];
    }

    /** Map of name (camelCase) => value, used by the client as the `STATUS` constant. @return array<string,string> */
    public static function map(): array
    {
        $map = [];
        foreach (self::cases() as $case) {
            $map[lcfirst($case->name)] = $case->value;
        }

        return $map;
    }
}
