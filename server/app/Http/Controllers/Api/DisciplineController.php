<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Discipline;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DisciplineController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $disciplines = Discipline::all();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Disciplines récupérées avec succès',
            'data' => $disciplines
        ], 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:disciplines,nom',
            'tonalite' => 'required|string|max:255',
            'glyphe' => 'required|string|max:255',
            'accroche' => 'required|string|max:255'
        ]);

        // Générer le slug à partir du nom
        $validated['slug'] = Str::slug($validated['nom']);

        $discipline = Discipline::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Discipline créée avec succès',
            'data' => $discipline
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $discipline = Discipline::find($id);

        if (!$discipline) {
            return response()->json([
                'status' => 'error',
                'message' => 'Discipline non trouvée'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Discipline récupérée avec succès',
            'data' => $discipline
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $discipline = Discipline::find($id);

        if (!$discipline) {
            return response()->json([
                'status' => 'error',
                'message' => 'Discipline non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'nom' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('disciplines')->ignore($discipline->id)
            ],
            'tonalite' => 'sometimes|string|max:255',
            'glyphe' => 'sometimes|string|max:255',
            'accroche' => 'sometimes|string|max:255'
        ]);

        // Mettre à jour le slug si le nom change
        if (isset($validated['nom'])) {
            $validated['slug'] = Str::slug($validated['nom']);
        }

        $discipline->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Discipline mise à jour avec succès',
            'data' => $discipline
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $discipline = Discipline::find($id);

        if (!$discipline) {
            return response()->json([
                'status' => 'error',
                'message' => 'Discipline non trouvée'
            ], 404);
        }

        $discipline->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Discipline supprimée avec succès'
        ], 200);
    }

    /**
     * Search disciplines by name or slug
     */
    public function search(Request $request)
    {
        $query = $request->get('q');
        
        $disciplines = Discipline::where('nom', 'LIKE', "%{$query}%")
            ->orWhere('slug', 'LIKE', "%{$query}%")
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Résultats de recherche',
            'data' => $disciplines
        ], 200);
    }
}