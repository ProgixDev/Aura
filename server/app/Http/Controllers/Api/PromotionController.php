<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Promotion;
use Illuminate\Validation\ValidationException;


class PromotionController extends Controller
{
    

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $promotions = Promotion::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $promotions->items(),
            'pagination' => [
                'current_page' => $promotions->currentPage(),
                'last_page' => $promotions->lastPage(),
                'per_page' => $promotions->perPage(),
                'total' => $promotions->total(),
                'next_page_url' => $promotions->nextPageUrl(),
                'prev_page_url' => $promotions->previousPageUrl(),
            ]
        ], 200);
    }


    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'code' => 'required|string|max:50|unique:promotions,code',
                'type' => 'required|in:pourcentage,fixe',
                'valeur' => 'required|numeric|min:0',
                'date_expiration' => 'required|date|after:today'
            ]);

            $promotion = Promotion::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Promotion créée avec succès',
                'data' => $promotion
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
                'message' => 'Une erreur est survenue',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function show($id)
    {
        try {
            $promotion = Promotion::findOrFail($id);
            
            return response()->json([
                'status' => 'success',
                'data' => $promotion
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Promotion non trouvée'
            ], 404);
        }
    }

    /**
     * Mettre à jour une promotion
     */
    public function update(Request $request, $id)
    {
        try {
            $promotion = Promotion::findOrFail($id);

            $validated = $request->validate([
                'code' => 'sometimes|string|max:50|unique:promotions,code,' . $id,
                'type' => 'sometimes|in:pourcentage,fixe',
                'valeur' => 'sometimes|numeric|min:0',
                'date_expiration' => 'sometimes|date|after:today'
            ]);

            $promotion->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Promotion mise à jour avec succès',
                'data' => $promotion
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Promotion non trouvée ou erreur'
            ], 404);
        }
    }

    /**
     * Supprimer une promotion
     */
    public function destroy($id)
    {
        try {
            $promotion = Promotion::findOrFail($id);
            $promotion->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Promotion supprimée avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Promotion non trouvée'
            ], 404);
        }
    }



}
