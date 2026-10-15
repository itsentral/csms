<?php

namespace App\Http\Controllers;

use App\Models\RchsemsApplication;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    public function show(Request $request, RchsemsApplication $application)
    {
        abort_unless($request->user()->hasAnyRole(['admin','pengadaan','verifikator','validator']),403);
        $application->load(['vendor.user','criteria.criterion','criteria.scores.review']);
        $criteria=$application->criteria;
        $totalWeight=(float)$criteria->sum(fn($c)=>(float)$c->criterion->max_weight);
        $final=0;
        foreach($criteria as $c) {
            $validationScores=$c->scores->filter(fn($s)=>$s->review->type==='validation' && $s->review->status==='submitted');
            $avg=$validationScores->count() ? $validationScores->avg('weighted_score') : 0;
            $final += $avg;
        }
        $percent=$totalWeight>0 ? round($final/$totalWeight*100,2) : 0;
        $category=$percent>=70?'Tinggi':($percent>=50?'Menengah':($percent>=35?'Rendah':'Tidak Lulus'));
        return view('certificates.show',compact('application','percent','category'));
    }
}
