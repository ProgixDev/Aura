<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Praticien;

class PraticienController extends Controller
{
    
       /**
     * Afficher la liste des praticiens avec pagination
     */
    public function index(Request $request)
    {
   
        $perPage = $request->get('per_page', 10);
        $praticiens = Praticien::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $praticiens->items(),
            'pagination' => [
                'current_page' => $praticiens->currentPage(),
                'last_page' => $praticiens->lastPage(),
                'per_page' => $praticiens->perPage(),
                'total' => $praticiens->total(),
                'next_page_url' => $praticiens->nextPageUrl(),
                'prev_page_url' => $praticiens->previousPageUrl(),
            ]
        ], 200);
    }

}
