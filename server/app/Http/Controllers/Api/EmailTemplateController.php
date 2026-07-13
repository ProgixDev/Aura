<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class EmailTemplateController extends Controller
{
    /**
     * Lister tous les modèles d'emails
     */
    public function index(Request $request)
    {
        try {
            $query = EmailTemplate::with(['createdBy']);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('nom', 'LIKE', "%{$search}%")
                      ->orWhere('objet', 'LIKE', "%{$search}%")
                      ->orWhere('corps', 'LIKE', "%{$search}%");
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $templates = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $templates->items(),
                'pagination' => [
                    'current_page' => $templates->currentPage(),
                    'last_page' => $templates->lastPage(),
                    'per_page' => $templates->perPage(),
                    'total' => $templates->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des modèles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouveau modèle d'email
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'nom' => 'required|string|max:255|unique:email_templates,nom',
                'objet' => 'required|string|max:255',
                'corps' => 'required|string',
                'statut' => 'sometimes|string|in:actif,inactif,archive',
                'variables' => 'nullable|array'
            ]);

            $template = EmailTemplate::create([
                'nom' => $validated['nom'],
                'objet' => $validated['objet'],
                'corps' => $validated['corps'],
                'statut' => $validated['statut'] ?? 'actif',
                'variables' => $validated['variables'] ?? $this->extractVariables($validated['corps']),
                'created_by' => auth()->id()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Modèle créé avec succès',
                'data' => $template->load('createdBy')
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
                'message' => 'Erreur lors de la création du modèle',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un modèle spécifique
     */
    public function show($id)
    {
        try {
            $template = EmailTemplate::with(['createdBy'])->find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $template
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un modèle
     */
    public function update(Request $request, $id)
    {
        try {
            $template = EmailTemplate::find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $validated = $request->validate([
                'nom' => [
                    'sometimes',
                    'string',
                    'max:255',
                    Rule::unique('email_templates')->ignore($template->id)
                ],
                'objet' => 'sometimes|string|max:255',
                'corps' => 'sometimes|string',
                'statut' => 'sometimes|string|in:actif,inactif,archive',
                'variables' => 'nullable|array'
            ]);

            // Extraire les variables si le corps change
            if (isset($validated['corps'])) {
                $validated['variables'] = $this->extractVariables($validated['corps']);
            }

            $template->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Modèle mis à jour avec succès',
                'data' => $template->load('createdBy')
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
                'message' => 'Erreur lors de la mise à jour',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un modèle
     */
    public function destroy($id)
    {
        try {
            $template = EmailTemplate::find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $template->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Modèle supprimé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la suppression',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restaurer un modèle supprimé
     */
    public function restore($id)
    {
        try {
            $template = EmailTemplate::onlyTrashed()->find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $template->restore();

            return response()->json([
                'status' => 'success',
                'message' => 'Modèle restauré avec succès',
                'data' => $template->load('createdBy')
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la restauration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dupliquer un modèle
     */
    public function duplicate($id)
    {
        try {
            $original = EmailTemplate::find($id);

            if (!$original) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $duplicate = $original->replicate();
            $duplicate->nom = $original->nom . ' (copie)';
            $duplicate->statut = 'inactif';
            $duplicate->created_by = auth()->id();
            $duplicate->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Modèle dupliqué avec succès',
                'data' => $duplicate->load('createdBy')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la duplication',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Prévisualiser un modèle avec des variables
     */
    public function preview(Request $request, $id)
    {
        try {
            $template = EmailTemplate::find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $data = $request->validate([
                'variables' => 'required|array'
            ]);

            $renderedObjet = $template->renderObjet($data['variables']);
            $renderedCorps = $template->render($data['variables']);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'objet' => $renderedObjet,
                    'corps' => $renderedCorps,
                    'variables_utilisees' => $data['variables']
                ]
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
                'message' => 'Erreur lors de la prévisualisation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extraire les variables du corps du template
     */
    private function extractVariables($corps)
    {
        preg_match_all('/{{(.*?)}}/', $corps, $matches);
        $variables = [];
        foreach ($matches[1] as $match) {
            $variables[] = trim($match);
        }
        return array_unique($variables);
    }

    /**
     * Statistiques des modèles
     */
    public function statistics()
    {
        try {
            $stats = [
                'total' => EmailTemplate::count(),
                'actif' => EmailTemplate::actif()->count(),
                'inactif' => EmailTemplate::inactif()->count(),
                'archive' => EmailTemplate::where('statut', 'archive')->count(),
                'derniers_modeles' => EmailTemplate::with(['createdBy'])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'nom', 'statut', 'created_at'])
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Changer le statut du modèle
     */
    public function changeStatus(Request $request, $id)
    {
        try {
            $template = EmailTemplate::find($id);

            if (!$template) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Modèle non trouvé'
                ], 404);
            }

            $validated = $request->validate([
                'statut' => 'required|string|in:actif,inactif,archive'
            ]);

            $template->update(['statut' => $validated['statut']]);

            return response()->json([
                'status' => 'success',
                'message' => 'Statut mis à jour avec succès',
                'data' => $template
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
                'message' => 'Erreur lors du changement de statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}