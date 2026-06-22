<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Cercle;

class CercleController extends Controller
{
    
          /**
     * Afficher la liste des cercles avec pagination
     */
    public function index(Request $request)
    {

        $perPage = $request->get('per_page', 10);
        $cercles = Cercle::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $cercles->items(),
            'pagination' => [
                'current_page' => $cercles->currentPage(),
                'last_page' => $cercles->lastPage(),
                'per_page' => $cercles->perPage(),
                'total' => $cercles->total(),
                'next_page_url' => $cercles->nextPageUrl(),
                'prev_page_url' => $cercles->previousPageUrl(),
            ]
        ], 200);
    }

      /**
     * Créer un nouveau cercle
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'nom' => 'required|string|max:255|unique:cercles,nom',
                'description' => 'nullable|string',
                'color' => 'nullable|string|max:50|regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
                'animateur' => 'nullable|string|max:255'
            ]);

            $cercle = Cercle::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Cercle créé avec succès',
                'data' => $cercle
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Une erreur est survenue lors de la création du cercle',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}
