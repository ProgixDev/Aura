<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    
      /**
     * Afficher la liste des clients avec pagination
     */
    public function index(Request $request)
    {
        // Pagination par 10 clients par page
        $perPage = $request->get('per_page', 10);
        $clients = Client::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $clients->items(),
            'pagination' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
                'next_page_url' => $clients->nextPageUrl(),
                'prev_page_url' => $clients->previousPageUrl(),
            ]
        ], 200);
    }
    
}
