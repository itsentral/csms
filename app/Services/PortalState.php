<?php

namespace App\Services;

use App\Enums\VendorStatus;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;

/** Data yang dimuat klien: sesi, vendor yang boleh dilihat pengguna, dan (untuk admin) daftar akun. */
class PortalState
{
    public static function for(User $viewer): array
    {
        $isAdmin = $viewer->hasRole('admin');
        $isInternal = $viewer->hasRole('verifikator', 'validator', 'pengadaan', 'admin');
        $query = Vendor::orderBy('created_at');
        if (! $viewer->hasRole('verifikator', 'validator', 'pengadaan')) {
            $query->where('owner_id', $viewer->id);
        }
        $list = $query->get();
        $serialized = Portal::serializeMany($list);

        $vendors = $list->map(function (Vendor $v) use ($isInternal, $viewer, $serialized) {
            $data = $serialized[$v->id];
            // Kuesioner yang belum pernah dikirim adalah draft: isinya hanya terlihat oleh admin dan pemiliknya.
            if ($isInternal && Portal::isHiddenDraft($viewer, $v)) {
                $data['answers'] = new \stdClass;
            }

            return $data;
        });

        return [
            'session' => $viewer->publicData(),
            'statuses' => VendorStatus::map(),
            // Master pertanyaan: satu-satunya sumber untuk antarmuka (teks Indonesia dan English).
            'questions' => DB::table('questions')->orderBy('position')->get(['id', 'group', 'group_en', 'text', 'text_en', 'max']),
            'vendors' => $vendors,
            'accounts' => $isAdmin ? User::where('active', true)->get()->map(fn (User $u) => $u->publicData()) : [],
        ];
    }
}
