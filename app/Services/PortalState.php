<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vendor;

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
            'vendors' => $vendors,
            'accounts' => $isAdmin ? User::where('active', true)->get()->map(fn (User $u) => $u->publicData()) : [],
        ];
    }
}
