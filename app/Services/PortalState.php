<?php

namespace App\Services;

use App\Enums\VendorStatus;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;

/** Data loaded by the client: the session, the vendors the user may see, and (for admins) the account list. */
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
            // A questionnaire that was never submitted is a draft: its content is visible only to admins and its owner.
            if ($isInternal && Portal::isHiddenDraft($viewer, $v)) {
                $data['answers'] = new \stdClass;
            }

            return $data;
        });

        return [
            'session' => $viewer->publicData(),
            'statuses' => VendorStatus::map(),
            // Question master: the single source for the interface (Indonesian and English text).
            'questions' => DB::table('questions')->orderBy('position')->get(['id', 'group', 'group_en', 'text', 'text_en', 'max']),
            'vendors' => $vendors,
            'accounts' => $isAdmin ? User::where('active', true)->get()->map(fn (User $u) => $u->publicData()) : [],
        ];
    }
}
