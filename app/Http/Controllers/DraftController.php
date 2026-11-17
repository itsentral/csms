<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveDraftRequest;
use App\Services\Drafts;
use Illuminate\Http\Request;

class DraftController extends Controller
{
    public function put(SaveDraftRequest $r, string $scope)
    {
        Drafts::put($r->user(), $scope, $r->validated()['data']);

        return ['ok' => true];
    }

    public function destroy(Request $r, string $scope)
    {
        Drafts::forget($r->user(), $scope);

        return ['ok' => true];
    }
}
