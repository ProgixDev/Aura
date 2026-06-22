<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Echange;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class EchangeController extends Controller
{
    /**
     * Lister les échanges du client connecté
     */
    public function index(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $query = Echange::where('client_id', $client->id)
                ->with(['client']);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('sujet', 'LIKE', "%{$search}%")
                      ->orWhere('message', 'LIKE', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 10);
            $echanges = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $echanges->items(),
                'pagination' => [
                    'current_page' => $echanges->currentPage(),
                    'last_page' => $echanges->lastPage(),
                    'per_page' => $echanges->perPage(),
                    'total' => $echanges->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des échanges',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouvel échange (Client connecté)
     */
    public function store(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();

            $validated = $request->validate([
                'sujet' => 'required|string|max:255',
                'type' => 'required|string|in:proposition,demande,information,autre',
                'message' => 'required|string|min:10',
                'ce_que_je_propose' => 'nullable|string|max:500',
                'ce_que_je_recherche' => 'nullable|string|max:500',
                'format' => 'nullable|string|max:255',
                'delai_souhaite' => 'nullable|date|after:today',
                'pieces_jointes' => 'nullable|array',
                'pieces_jointes.*' => 'file|max:5120|mimes:jpg,jpeg,png,gif,pdf,doc,docx'
            ]);

            // Gérer les pièces jointes
            $piecesJointes = [];
            if ($request->hasFile('pieces_jointes')) {
                foreach ($request->file('pieces_jointes') as $file) {
                    $path = $file->store('echanges/' . $client->id, 'public');
                    $piecesJointes[] = [
                        'nom' => $file->getClientOriginalName(),
                        'chemin' => $path,
                        'taille' => $file->getSize(),
                        'type' => $file->getMimeType()
                    ];
                }
            }

            $echange = Echange::create([
                'client_id' => $client->id,
                'sujet' => $validated['sujet'],
                'type' => $validated['type'],
                'message' => $validated['message'],
                'ce_que_je_propose' => $validated['ce_que_je_propose'] ?? null,
                'ce_que_je_recherche' => $validated['ce_que_je_recherche'] ?? null,
                'format' => $validated['format'] ?? null,
                'delai_souhaite' => $validated['delai_souhaite'] ?? null,
                'pieces_jointes' => $piecesJointes,
                'statut' => 'en_attente',
                'priorite' => 'moyenne'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Votre message a été envoyé avec succès',
                'data' => $echange->load('client')
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

    /**
     * Afficher un échange spécifique (Client connecté)
     */
    public function show($id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $echange = Echange::where('client_id', $client->id)
                ->with(['client'])
                ->find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $echange
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
     * Mettre à jour un échange (Client connecté)
     */
    public function update(Request $request, $id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $echange = Echange::where('client_id', $client->id)
                ->whereIn('statut', ['en_attente', 'lu'])
                ->find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé ou ne peut pas être modifié'
                ], 404);
            }

            $validated = $request->validate([
                'sujet' => 'sometimes|string|max:255',
                'message' => 'sometimes|string|min:10',
                'ce_que_je_propose' => 'nullable|string|max:500',
                'ce_que_je_recherche' => 'nullable|string|max:500',
                'format' => 'nullable|string|max:255',
                'delai_souhaite' => 'nullable|date|after:today',
            ]);

            $echange->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Échange mis à jour avec succès',
                'data' => $echange->load('client')
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
     * Supprimer un échange (Client connecté)
     */
    public function destroy($id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $echange = Echange::where('client_id', $client->id)
                ->whereIn('statut', ['en_attente', 'lu'])
                ->find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé ou ne peut pas être supprimé'
                ], 404);
            }

            $echange->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Échange supprimé avec succès'
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
     * ADMIN - Liste de tous les échanges
     */
    public function adminIndex(Request $request)
    {
        try {
            $query = Echange::with(['client', 'traitePar', 'signalePar']);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('priorite')) {
                $query->where('priorite', $request->priorite);
            }

            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('sujet', 'LIKE', "%{$search}%")
                      ->orWhere('message', 'LIKE', "%{$search}%")
                      ->orWhereHas('client', function ($q) use ($search) {
                          $q->where('firstname', 'LIKE', "%{$search}%")
                            ->orWhere('lastname', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $echanges = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $echanges->items(),
                'pagination' => [
                    'current_page' => $echanges->currentPage(),
                    'last_page' => $echanges->lastPage(),
                    'per_page' => $echanges->perPage(),
                    'total' => $echanges->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des échanges',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Voir les détails d'un échange
     */
    public function adminShow($id)
    {
        try {
            $echange = Echange::with(['client', 'traitePar', 'signalePar'])
                ->find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            // Marquer comme lu
            if ($echange->statut === 'en_attente') {
                $echange->update([
                    'statut' => 'lu',
                    'lu_a' => now()
                ]);
            }

            return response()->json([
                'status' => 'success',
                'data' => $echange
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
     * ADMIN - Mettre à jour un échange
     */
    public function adminUpdate(Request $request, $id)
    {
        try {
            $echange = Echange::find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            $validated = $request->validate([
                'statut' => 'sometimes|string|in:en_attente,lu,en_cours,traite,archive,signale',
                'priorite' => 'sometimes|string|in:basse,moyenne,haute,urgente',
                'reponse_admin' => 'nullable|string',
                'traite_par' => 'nullable|exists:users,id'
            ]);

            if (isset($validated['statut']) && $validated['statut'] === 'traite') {
                $validated['traite_a'] = now();
                if (auth()->check()) {
                    $validated['traite_par'] = auth()->id();
                }
            }

            if (isset($validated['reponse_admin']) && !empty($validated['reponse_admin'])) {
                $validated['repondu_a'] = now();
            }

            $echange->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Échange mis à jour avec succès',
                'data' => $echange->load(['client', 'traitePar', 'signalePar'])
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
     * ADMIN - Masquer/Démasquer un échange
     */
    public function adminHide($id)
    {
        try {
            $echange = Echange::find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            $echange->update([
                'est_masque' => !$echange->est_masque
            ]);

            return response()->json([
                'status' => 'success',
                'message' => $echange->est_masque ? 'Échange masqué' : 'Échange démasqué',
                'data' => $echange
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors du masquage',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Signaler un échange
     */
    public function adminReport(Request $request, $id)
    {
        try {
            $echange = Echange::find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            $validated = $request->validate([
                'motif_signalement' => 'required|string|max:500'
            ]);

            $echange->update([
                'statut' => 'signale',
                'signale_par' => auth()->id(),
                'motif_signalement' => $validated['motif_signalement'],
                'signale_a' => now()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Échange signalé avec succès',
                'data' => $echange
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
                'message' => 'Erreur lors du signalement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Supprimer un échange
     */
    public function adminDestroy($id)
    {
        try {
            $echange = Echange::find($id);

            if (!$echange) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Échange non trouvé'
                ], 404);
            }

            $echange->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Échange supprimé avec succès'
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
     * ADMIN - Statistiques
     */
    public function adminStatistics()
    {
        try {
            $stats = [
                'total' => Echange::count(),
                'en_attente' => Echange::where('statut', 'en_attente')->count(),
                'en_cours' => Echange::where('statut', 'en_cours')->count(),
                'traites' => Echange::where('statut', 'traite')->count(),
                'signales' => Echange::where('statut', 'signale')->count(),
                'archives' => Echange::where('statut', 'archive')->count(),
                'par_type' => Echange::selectRaw('type, COUNT(*) as count')
                    ->groupBy('type')
                    ->get(),
                'par_priorite' => Echange::selectRaw('priorite, COUNT(*) as count')
                    ->groupBy('priorite')
                    ->get(),
                'derniers_echanges' => Echange::with('client')
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get()
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
}