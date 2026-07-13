<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Reservation;

class ReservationController extends Controller
{
    
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $reservations = Reservation::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $reservations->items(),
            'pagination' => [
                'current_page' => $reservations->currentPage(),
                'last_page' => $reservations->lastPage(),
                'per_page' => $reservations->perPage(),
                'total' => $reservations->total(),
                'next_page_url' => $reservations->nextPageUrl(),
                'prev_page_url' => $reservations->previousPageUrl(),
            ]
        ], 200);
    }

}
