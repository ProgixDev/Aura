<?php
// app/Http/Controllers/Api/PaiementController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaiementController extends Controller
{
    /**
     * Lister les paiements du client connecté
     */
    public function index(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $query = Paiement::with(['client', 'praticien', 'rendezVous'])
                ->where('client_id', $client->id);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('moyen_paiement')) {
                $query->where('moyen_paiement', 'LIKE', "%{$request->moyen_paiement}%");
            }

            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('reference', 'LIKE', "%{$search}%")
                      ->orWhereHas('client', function ($q) use ($search) {
                          $q->where('firstname', 'LIKE', "%{$search}%")
                            ->orWhere('lastname', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('praticien', function ($q) use ($search) {
                          $q->where('nom', 'LIKE', "%{$search}%")
                            ->orWhere('prenom', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'date_paiement');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $paiements = $query->paginate($perPage);

            // Statistiques additionnelles
            $statistiques = [
                'total_paiements' => $query->count(),
                'total_montant' => $query->sum('montant_brut'),
                'total_commission' => $query->sum('commission'),
                'total_net' => $query->sum('montant_net_praticien'),
                'par_moyen' => $query->selectRaw('moyen_paiement, COUNT(*) as count, SUM(montant_brut) as total')
                    ->groupBy('moyen_paiement')
                    ->get()
            ];

            return response()->json([
                'status' => 'success',
                'data' => $paiements->items(),
                'pagination' => [
                    'current_page' => $paiements->currentPage(),
                    'last_page' => $paiements->lastPage(),
                    'per_page' => $paiements->perPage(),
                    'total' => $paiements->total(),
                ],
                'statistiques' => $statistiques
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des paiements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un paiement spécifique
     */
    public function show($id)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $paiement = Paiement::with(['client', 'praticien', 'rendezVous'])
                ->where('client_id', $client->id)
                ->find($id);

            if (!$paiement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Paiement non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $paiement
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération du paiement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter les paiements au format comptable (Admin)
     */
    public function exportComptable(Request $request)
    {
        try {
            $client = Auth::guard('client')->user();
            
            $query = Paiement::with(['client', 'praticien'])
                ->where('client_id', $client->id)
                ->where('statut', 'paid');

            // Filtres de période
            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            if ($request->has('mois') && $request->has('annee')) {
                $query->whereMonth('date_paiement', $request->mois)
                    ->whereYear('date_paiement', $request->annee);
            }

            $paiements = $query->orderBy('date_paiement', 'desc')->get();

            // Format comptable
            $export = [
                'periode' => [
                    'debut' => $request->date_debut ?? null,
                    'fin' => $request->date_fin ?? null,
                ],
                'total_transactions' => $paiements->count(),
                'total_brut' => $paiements->sum('montant_brut'),
                'total_commission' => $paiements->sum('commission'),
                'total_net' => $paiements->sum('montant_net_praticien'),
                'transactions' => $paiements->map(function ($paiement) {
                    return [
                        'reference' => $paiement->reference,
                        'date' => $paiement->date_paiement->format('d/m/Y'),
                        'client' => $paiement->client->firstname . ' ' . $paiement->client->lastname,
                        'praticien' => $paiement->praticien ? $paiement->praticien->prenom . ' ' . $paiement->praticien->nom : 'N/A',
                        'brut' => number_format($paiement->montant_brut, 2) . ' €',
                        'commission' => number_format($paiement->commission, 2) . ' €',
                        'net_praticien' => number_format($paiement->montant_net_praticien, 2) . ' €',
                        'moyen' => $paiement->moyen_paiement,
                        'statut' => $paiement->statut
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
                'message' => 'Erreur lors de l\'export comptable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Lister tous les paiements
     */
    public function adminIndex(Request $request)
    {
        try {
            $query = Paiement::with(['client', 'praticien', 'rendezVous']);

            // Filtres
            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('moyen_paiement')) {
                $query->where('moyen_paiement', 'LIKE', "%{$request->moyen_paiement}%");
            }

            if ($request->has('client_id')) {
                $query->where('client_id', $request->client_id);
            }

            if ($request->has('praticien_id')) {
                $query->where('praticien_id', $request->praticien_id);
            }

            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('reference', 'LIKE', "%{$search}%")
                      ->orWhereHas('client', function ($q) use ($search) {
                          $q->where('firstname', 'LIKE', "%{$search}%")
                            ->orWhere('lastname', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                      })
                      ->orWhereHas('praticien', function ($q) use ($search) {
                          $q->where('nom', 'LIKE', "%{$search}%")
                            ->orWhere('prenom', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'date_paiement');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 15);
            $paiements = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $paiements->items(),
                'pagination' => [
                    'current_page' => $paiements->currentPage(),
                    'last_page' => $paiements->lastPage(),
                    'per_page' => $paiements->perPage(),
                    'total' => $paiements->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des paiements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Statistiques globales
     */
    public function adminStatistics(Request $request)
    {
        try {
            $query = Paiement::query();

            // Filtres de période
            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            $stats = [
                'general' => [
                    'total_transactions' => $query->count(),
                    'montant_total' => $query->sum('montant_brut'),
                    'commission_totale' => $query->sum('commission'),
                    'net_total' => $query->sum('montant_net_praticien'),
                ],
                'par_statut' => $query->selectRaw('statut, COUNT(*) as count, SUM(montant_brut) as total')
                    ->groupBy('statut')
                    ->get(),
                'par_moyen' => $query->selectRaw('moyen_paiement, COUNT(*) as count, SUM(montant_brut) as total')
                    ->groupBy('moyen_paiement')
                    ->get(),
                'par_mois' => $query->selectRaw("DATE_FORMAT(date_paiement, '%Y-%m') as mois, COUNT(*) as count, SUM(montant_brut) as total")
                    ->groupBy('mois')
                    ->orderBy('mois', 'desc')
                    ->limit(12)
                    ->get(),
                'top_clients' => $query->selectRaw('client_id, COUNT(*) as count, SUM(montant_brut) as total')
                    ->with('client')
                    ->groupBy('client_id')
                    ->orderBy('total', 'desc')
                    ->limit(5)
                    ->get(),
                'top_praticiens' => $query->selectRaw('praticien_id, COUNT(*) as count, SUM(montant_brut) as total')
                    ->with('praticien')
                    ->groupBy('praticien_id')
                    ->orderBy('total', 'desc')
                    ->limit(5)
                    ->get(),
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
     * ADMIN - Exporter tous les paiements
     */
    public function adminExport(Request $request)
    {
        try {
            $query = Paiement::with(['client', 'praticien'])
                ->where('statut', 'paid');

            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            $paiements = $query->orderBy('date_paiement', 'desc')->get();

            $export = [
                'periode' => [
                    'debut' => $request->date_debut ?? 'Toutes',
                    'fin' => $request->date_fin ?? 'Toutes',
                ],
                'date_export' => now()->format('d/m/Y H:i'),
                'total_transactions' => $paiements->count(),
                'montant_total_brut' => number_format($paiements->sum('montant_brut'), 2) . ' €',
                'commission_totale' => number_format($paiements->sum('commission'), 2) . ' €',
                'net_total' => number_format($paiements->sum('montant_net_praticien'), 2) . ' €',
                'transactions' => $paiements->map(function ($paiement) {
                    return [
                        'reference' => $paiement->reference,
                        'date' => $paiement->date_paiement->format('d/m/Y'),
                        'client' => $paiement->client->firstname . ' ' . $paiement->client->lastname,
                        'praticien' => $paiement->praticien ? $paiement->praticien->prenom . ' ' . $paiement->praticien->nom : 'N/A',
                        'brut' => number_format($paiement->montant_brut, 2) . ' €',
                        'commission' => number_format($paiement->commission, 2) . ' €',
                        'net_praticien' => number_format($paiement->montant_net_praticien, 2) . ' €',
                        'moyen' => $paiement->moyen_paiement,
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
                'message' => 'Erreur lors de l\'export comptable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ADMIN - Exporter en CSV
     */
    public function adminExportCsv(Request $request)
    {
        try {
            $query = Paiement::with(['client', 'praticien'])
                ->where('statut', 'paid');

            if ($request->has('date_debut')) {
                $query->whereDate('date_paiement', '>=', $request->date_debut);
            }

            if ($request->has('date_fin')) {
                $query->whereDate('date_paiement', '<=', $request->date_fin);
            }

            $paiements = $query->orderBy('date_paiement', 'desc')->get();

            $headers = [
                'Référence',
                'Date',
                'Client',
                'Email Client',
                'Praticien',
                'Brut (€)',
                'Commission (€)',
                'Net Praticien (€)',
                'Moyen de paiement',
                'Statut'
            ];

            $rows = $paiements->map(function ($paiement) {
                return [
                    $paiement->reference,
                    $paiement->date_paiement->format('d/m/Y'),
                    $paiement->client->firstname . ' ' . $paiement->client->lastname,
                    $paiement->client->email,
                    $paiement->praticien ? $paiement->praticien->prenom . ' ' . $paiement->praticien->nom : 'N/A',
                    number_format($paiement->montant_brut, 2),
                    number_format($paiement->commission, 2),
                    number_format($paiement->montant_net_praticien, 2),
                    $paiement->moyen_paiement,
                    $paiement->statut
                ];
            });

            // Conversion en CSV
            $csvData = implode(';', $headers) . "\n";
            foreach ($rows as $row) {
                $csvData .= implode(';', $row) . "\n";
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'filename' => 'export_paiements_' . now()->format('Ymd_His') . '.csv',
                    'csv' => $csvData,
                    'total' => $paiements->count()
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}