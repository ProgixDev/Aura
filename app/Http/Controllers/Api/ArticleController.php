<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;


class ArticleController extends Controller
{
    
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $status = $request->get('status');
        $categorie = $request->get('categorie');

        $query = Article::query();

        if ($status) {
            $query->where('status', $status);
        }

        if ($categorie) {
            $query->where('categorie', $categorie);
        }

        $articles = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $articles->items(),
            'pagination' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
                'next_page_url' => $articles->nextPageUrl(),
                'prev_page_url' => $articles->previousPageUrl(),
            ]
        ], 200);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'titre' => 'required|string|max:255',
                'categorie' => 'required|string|max:100',
                'tonalite' => 'required|string|max:50',
                'extrait' => 'required|string|max:500',
                'corps' => 'required|string',
                'status' => 'required|in:brouillon,en_revue,publié,archivé',
                'auteur' => 'required|string|max:255',
                'auteur_id' => 'nullable|exists:users,id',
                'temps_lecture' => 'required|integer|min:1',
                'image_couverture' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string|max:255',
                'mot_clef' => 'nullable|string|max:255',
                'date_publication' => 'nullable|date'
            ]);

            // Générer le slug
            $validated['slug'] = Str::slug($validated['titre']);

            // Vérifier l'unicité du slug
            if (Article::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $validated['slug'] . '-' . uniqid();
            }

            $article = Article::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Article créé avec succès',
                'data' => $article
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
            $article = Article::findOrFail($id);
            
            // Incrémenter les vues
            $article->incrementViews();

            return response()->json([
                'status' => 'success',
                'data' => $article
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article non trouvé'
            ], 404);
        }
    }

    public function showBySlug($slug)
    {
        try {
            $article = Article::where('slug', $slug)->firstOrFail();
            
            // Incrémenter les vues
            $article->incrementViews();

            return response()->json([
                'status' => 'success',
                'data' => $article
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article non trouvé'
            ], 404);
        }
    }


    public function update(Request $request, $id)
    {
        try {
            $article = Article::findOrFail($id);

            $validated = $request->validate([
                'titre' => 'sometimes|string|max:255',
                'categorie' => 'sometimes|string|max:100',
                'tonalite' => 'sometimes|string|max:50',
                'extrait' => 'sometimes|string|max:500',
                'corps' => 'sometimes|string',
                'status' => 'sometimes|in:brouillon,en_revue,publié,archivé',
                'auteur' => 'sometimes|string|max:255',
                'auteur_id' => 'nullable|exists:users,id',
                'temps_lecture' => 'sometimes|integer|min:1',
                'image_couverture' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string|max:255',
                'mot_clef' => 'nullable|string|max:255',
                'date_publication' => 'nullable|date'
            ]);

            // Mettre à jour le slug si le titre change
            if (isset($validated['titre']) && $validated['titre'] !== $article->titre) {
                $validated['slug'] = Str::slug($validated['titre']);
                // Vérifier l'unicité du nouveau slug
                if (Article::where('slug', $validated['slug'])->where('id', '!=', $id)->exists()) {
                    $validated['slug'] = $validated['slug'] . '-' . uniqid();
                }
            }

            $article->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Article mis à jour avec succès',
                'data' => $article
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
                'message' => 'Article non trouvé ou erreur'
            ], 404);
        }
    }

    public function destroy($id)
    {
        try {
            $article = Article::findOrFail($id);
            $article->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Article supprimé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article non trouvé'
            ], 404);
        }
    }

    public function publish($id)
    {
        try {
            $article = Article::findOrFail($id);
            $article->update([
                'status' => 'publié',
                'date_publication' => now()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Article publié avec succès',
                'data' => $article
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article non trouvé'
            ], 404);
        }
    }

    public function archive($id)
    {
        try {
            $article = Article::findOrFail($id);
            $article->update(['status' => 'archivé']);

            return response()->json([
                'status' => 'success',
                'message' => 'Article archivé avec succès',
                'data' => $article
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Article non trouvé'
            ], 404);
        }
    }
    
}
