<?php
// app/Http/Controllers/Api/RemboursementController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Remboursement;
use App\Models\Paiement;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class RemboursementController extends Controller
{
    /**
     * CLIENT - Lister ses demandes de remboursement
     */
    public function index(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $query = Remboursement::with(['client', 'paiement', 'praticien'])
                ->where('client_id', $client->id);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('reference', 'LIKE', "%{$search}%")
                      ->orWhere('motif', 'LIKE', "%{$search}%")
                      ->orWhereHas('paiement', function ($q) use ($search) {
                          $q->where('reference', 'LIKE', "%{$search}%");
                      });
                });
            }

            $perPage = $request->get('per_page', 15);
            $remboursements = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $remboursements->items(),
                'pagination' => [
                    'current_page' => $remboursements->currentPage(),
                    'last_page' => $remboursements->lastPage(),
                    'per_page' => $remboursements->perPage(),
                    'total' => $remboursements->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des remboursements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * CLIENT - Créer une demande de remboursement
     */
    public function store(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();

            $validated = $request->validate([
                'paiement_id' => [
                    'required',
                    'exists:paiements,id',
                    function ($attribute, $value, $fail) use ($client) {
                        $paiement = Paiement::where('id', $value)
                            ->where('client_id', $client->id)
                            ->where('statut', 'paid')
                            ->first();
                        
                        if (!$paiement) {
                            $fail('Ce paiement n\'existe pas ou n\'est pas éligible au remboursement.');
                        }

                        // Vérifier si un remboursement existe déjà pour ce paiement
                        $existing = Remboursement::where('paiement_id', $value)
                            ->where('client_id', $client->id)
                            ->whereNotIn('statut', ['refuse', 'completed'])
                            ->exists();
                        
                        if ($existing) {
                            $fail('Une demande de remboursement existe déjà pour ce paiement.');
                        }
                    }
                ],
                'motif' => 'required|string|max:255',
                'description' => 'nullable|string',
                'documents' => 'nullable|array',
                'documents.*' => 'file|max:5120|mimes:jpg,jpeg,png,gif,pdf,doc,docx'
            ]);

            $paiement = Paiement::find($validated['paiement_id']);

            // Gérer les documents
            $documents = [];
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('remboursements/' . $client->id, 'public');
                    $documents[] = [
                        'nom' => $file->getClientOriginalName(),
                        'chemin' => $path,
                        'taille' => $file->getSize(),
                        'type' => $file->getMimeType()
                    ];
                }
            }

            $remboursement = Remboursement::create([
                'client_id' => $client->id,
                'paiement_id' => $validated['paiement_id'],
                'praticien_id' => $paiement->praticien_id,
                'montant' => $paiement->montant_brut,
                'motif' => $validated['motif'],
                'description' => $validated['description'] ?? null,
                'documents' => $documents,
                'statut' => 'en_attente'
            ]);

            // Notification admin (à implémenter)
            // event(new NewRemboursementRequest($remboursement));

            return response()->json([
                'status' => 'success',
                'message' => 'Votre demande de remboursement a été envoyée avec succès.',
                'data' => $remboursement->load(['client', 'paiement', 'praticien'])
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
                'message' => 'Erreur lors de la création de la demande',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * CLIENT - Voir les détails d'un remboursement
     */
    public function show($id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $remboursement = Remboursement::with(['client', 'paiement', 'praticien'])
                ->where('client_id', $client->id)
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $remboursement
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération du remboursement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * CLIENT - Annuler une demande de remboursement
     */
    public function cancel($id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $remboursement = Remboursement::where('client_id', $client->id)
                ->whereIn('statut', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé ou ne peut pas être annulé'
                ], 404);
            }

            $remboursement->update(['statut' => 'refuse']);

            return response()->json([
                'status' => 'success',
                'message' => 'Demande de remboursement annulée avec succès',
                'data' => $remboursement
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de l\'annulation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Lister toutes les demandes de remboursement
     */
    public function adminIndex(Request $request)
    {
        try {
            $query = Remboursement::with(['client', 'paiement', 'praticien']);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            if ($request->has('praticien_id')) {
                $query->where('praticien_id', $request->praticien_id);
            }

            if ($request->has('date_debut')) {
                $query->whereDate('created_at', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('created_at', '<=', $request->date_fin);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('reference', 'LIKE', "%{$search}%")
                      ->orWhere('motif', 'LIKE', "%{$search}%")
                      ->orWhereHas('client', function ($q) use ($search) {
                          $q->where('firstname', 'LIKE', "%{$search}%")
                            ->orWhere('lastname', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('paiement', function ($q) use ($search) {
                          $q->where('reference', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $remboursements = $query->paginate($perPage);

            // Statistiques
            $statistiques = $this->getAdminStatistics($request);

            return response()->json([
                'status' => 'success',
                'data' => $remboursements->items(),
                'pagination' => [
                    'current_page' => $remboursements->currentPage(),
                    'last_page' => $remboursements->lastPage(),
                    'per_page' => $remboursements->perPage(),
                    'total' => $remboursements->total(),
                ],
                'statistiques' => $statistiques
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des remboursements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Voir les détails d'une demande
     */
    public function adminShow($id)
    {
        try {
            $remboursement = Remboursement::with(['client', 'paiement', 'praticien'])
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $remboursement
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération du remboursement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Approuver une demande de remboursement
     */
    public function adminApprove(Request $request, $id)
    {
        try {
            $remboursement = Remboursement::whereIn('statut', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé ou ne peut pas être approuvé'
                ], 404);
            }

            $validated = $request->validate([
                'commentaire_admin' => 'nullable|string',
                'date_remboursement' => 'nullable|date|after_or_equal:today'
            ]);

            $remboursement->update([
                'statut' => 'approuve',
                'commentaire_admin' => $validated['commentaire_admin'] ?? null,
                'date_traitement' => now(),
                'date_remboursement' => $validated['date_remboursement'] ?? now()
            ]);

            // Mettre à jour le paiement
            $remboursement->paiement()->update([
                'statut' => 'rembourse'
            ]);

            // Notification client (à implémenter)
            // event(new RemboursementApprouve($remboursement));

            return response()->json([
                'status' => 'success',
                'message' => 'Demande de remboursement approuvée avec succès',
                'data' => $remboursement->load(['client', 'paiement', 'praticien'])
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
                'message' => 'Erreur lors de l\'approbation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Refuser une demande de remboursement
     */
    public function adminRefuse(Request $request, $id)
    {
        try {
            $remboursement = Remboursement::whereIn('statut', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé ou ne peut pas être refusé'
                ], 404);
            }

            $validated = $request->validate([
                'commentaire_admin' => 'required|string|min:10'
            ]);

            $remboursement->update([
                'statut' => 'refuse',
                'commentaire_admin' => $validated['commentaire_admin'],
                'date_traitement' => now()
            ]);

            // Notification client (à implémenter)
            // event(new RemboursementRefuse($remboursement));

            return response()->json([
                'status' => 'success',
                'message' => 'Demande de remboursement refusée',
                'data' => $remboursement->load(['client', 'paiement', 'praticien'])
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
                'message' => 'Erreur lors du refus',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Marquer comme complété
     */
    public function adminComplete($id)
    {
        try {
            $remboursement = Remboursement::where('statut', 'approuve')
                ->find($id);

            if (!$remboursement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Remboursement non trouvé ou ne peut pas être complété'
                ], 404);
            }

            $remboursement->update([
                'statut' => 'completed',
                'date_remboursement' => now()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Remboursement marqué comme complété',
                'data' => $remboursement->load(['client', 'paiement', 'praticien'])
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la mise à jour',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Statistiques
     */
    private function getAdminStatistics(Request $request)
    {
        $query = Remboursement::query();

        if ($request->has('date_debut')) {
            $query->whereDate('created_at', '>=', $request->date_debut);
        }

        if ($request->has('date_fin')) {
            $query->whereDate('created_at', '<=', $request->date_fin);
        }

        $total = $query->sum('montant');
        $totalCompleted = (clone $query)->where('statut', 'completed')->sum('montant');
        $totalEnAttente = (clone $query)->whereIn('statut', ['en_attente', 'en_cours'])->count();
        $totalApprouve = (clone $query)->where('statut', 'approuve')->count();
        $totalRefuse = (clone $query)->where('statut', 'refuse')->count();
        
        $totalRemboursements = (clone $query)->count();
        $tauxRemboursement = 0;
        
        // Calculer le taux par rapport aux paiements
        $totalPaiements = \App\Models\Paiement::where('statut', 'paid')->count();
        if ($totalPaiements > 0) {
            $tauxRemboursement = ($totalRemboursements / $totalPaiements) * 100;
        }

        return [
            'total_rembourse' => number_format($totalCompleted, 2),
            'total_rembourse_formatted' => number_format($totalCompleted, 2) . ' €',
            'en_attente' => $totalEnAttente,
            'approuves' => $totalApprouve,
            'refuses' => $totalRefuse,
            'completed' => $totalCompleted,
            'taux_remboursement' => number_format($tauxRemboursement, 1) . '%',
            'taux_evolution' => '+0.3', // À calculer selon vos besoins
            'par_motif' => (clone $query)->selectRaw('motif, COUNT(*) as count, SUM(montant) as total')
                ->groupBy('motif')
                ->get(),
            'par_mois' => (clone $query)->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as mois, COUNT(*) as count, SUM(montant) as total")
                ->groupBy('mois')
                ->orderBy('mois', 'desc')
                ->limit(6)
                ->get()
        ];
    }

    /**
     * ADMIN - Statistiques détaillées
     */
    public function adminStatistics(Request $request)
    {
        try {
            $statistiques = $this->getAdminStatistics($request);

            return response()->json([
                'status' => 'success',
                'data' => $statistiques
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
     * ADMIN - Exporter les remboursements
     */
    public function adminExport(Request $request)
    {
        try {
            $query = Remboursement::with(['client', 'paiement', 'praticien']);

            if ($request->has('date_debut')) {
                $query->whereDate('created_at', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('created_at', '<=', $request->date_fin);
            }

            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            $remboursements = $query->orderBy('created_at', 'desc')->get();

            $export = [
                'periode' => [
                    'debut' => $request->date_debut ?? 'Toutes',
                    'fin' => $request->date_fin ?? 'Toutes',
                ],
                'date_export' => now()->format('d/m/Y H:i'),
                'total_remboursements' => $remboursements->count(),
                'montant_total' => number_format($remboursements->sum('montant'), 2) . ' €',
                'remboursements' => $remboursements->map(function ($remboursement) {
                    return [
                        'reference' => $remboursement->reference,
                        'date' => $remboursement->created_at->format('d/m/Y'),
                        'transaction' => $remboursement->paiement->reference ?? 'N/A',
                        'client' => $remboursement->client->firstname . ' ' . $remboursement->client->lastname,
                        'montant' => number_format($remboursement->montant, 2) . ' €',
                        'motif' => $remboursement->motif,
                        'statut' => $remboursement->statut_label
                    ];
                })
            ];

            return response()->json([
                'status' => 'success',
                'data' => $export
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de l\'export',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}