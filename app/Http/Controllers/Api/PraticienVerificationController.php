<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Praticien;
use App\Models\PraticienDocument;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PraticienVerificationController extends Controller
{
    /**
     * Lister les praticiens en attente de vérification
     */
    public function index(Request $request)
    {
        try {
            $query = Praticien::with(['documents', 'verifiePar', 'user'])
                ->whereIn('statut_verification', ['en_attente', 'en_cours']);

            if ($request->has('statut')) {
                $query->where('statut_verification', $request->statut);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('firstname', 'LIKE', "%{$search}%")
                      ->orWhere('lastname', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhere('ville', 'LIKE', "%{$search}%")
                      ->orWhere('specialite', 'LIKE', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $praticiens = $query->orderBy('created_at', 'asc')->paginate($perPage);

            $statistiques = [
                'total_attente' => Praticien::where('statut_verification', 'en_attente')->count(),
                'total_en_cours' => Praticien::where('statut_verification', 'en_cours')->count(),
                'total_valide' => Praticien::where('statut_verification', 'valide')->count(),
                'total_rejete' => Praticien::where('statut_verification', 'rejete')->count(),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $praticiens->items(),
                'pagination' => [
                    'current_page' => $praticiens->currentPage(),
                    'last_page' => $praticiens->lastPage(),
                    'per_page' => $praticiens->perPage(),
                    'total' => $praticiens->total(),
                ],
                'statistiques' => $statistiques
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des praticiens',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Voir les détails d'un praticien pour vérification
     */
    public function show($id)
    {
        try {
            $praticien = Praticien::with(['documents', 'verifiePar', 'user'])
                ->find($id);

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Praticien non trouvé'
                ], 404);
            }

            $documents = [];
            $documentTypes = [
                'piece_identite' => 'Pièce d\'identité',
                'certification' => 'Certification / Diplôme',
                'assurance' => 'Attestation d\'assurance',
                'domicile' => 'Justificatif de domicile',
                'charte' => 'Charte éthique signée'
            ];

            foreach ($documentTypes as $key => $label) {
                $doc = $praticien->documents->where('type', $key)->first();
                $documents[$key] = [
                    'label' => $label,
                    'soumis' => !is_null($doc),
                    'statut' => $doc ? $doc->statut : 'manquant',
                    'nom_fichier' => $doc ? $doc->nom_fichier : null,
                    'chemin' => $doc ? $doc->chemin : null,
                    'id' => $doc ? $doc->id : null,
                ];
            }

            $documentsEnAttente = $praticien->documents->where('statut', 'en_attente')->count();
            $documentsValides = $praticien->documents->where('statut', 'valide')->count();
            $documentsRejetes = $praticien->documents->where('statut', 'rejete')->count();
            $documentsManquants = 5 - $praticien->documents->count();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'praticien' => $praticien,
                    'documents' => $documents,
                    'resume_documents' => [
                        'soumis' => $praticien->documents->count(),
                        'en_attente' => $documentsEnAttente,
                        'valides' => $documentsValides,
                        'rejetes' => $documentsRejetes,
                        'manquants' => $documentsManquants
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des détails',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Valider un praticien
     */
    public function verify(Request $request, $id)
    {
        try {
            $praticien = Praticien::whereIn('statut_verification', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Praticien non trouvé ou déjà vérifié'
                ], 404);
            }

            $validated = $request->validate([
                'documents' => 'required|array',
                'documents.*.id' => 'exists:praticien_documents,id',
                'documents.*.statut' => 'required|in:valide,rejete',
                'documents.*.commentaire_rejet' => 'nullable|string|required_if:documents.*.statut,rejete',
                'commentaire_global' => 'nullable|string'
            ]);

            foreach ($validated['documents'] as $docData) {
                $document = PraticienDocument::where('praticien_id', $praticien->id)
                    ->where('id', $docData['id'])
                    ->first();

                if ($document) {
                    $document->update([
                        'statut' => $docData['statut'],
                        'commentaire_rejet' => $docData['commentaire_rejet'] ?? null,
                        'verifie_a' => now(),
                        'verifie_par' => auth()->id()
                    ]);
                }
            }

            $documentsValides = $praticien->documents()->where('statut', 'valide')->count();
            $documentsTotal = $praticien->documents()->count();

            $statutFinal = 'en_cours';
            $motifRejet = null;

            if ($documentsTotal === 5 && $documentsValides === 5) {
                $statutFinal = 'valide';
            } elseif ($praticien->documents()->where('statut', 'rejete')->exists()) {
                $statutFinal = 'rejete';
                $motifRejet = $validated['commentaire_global'] ?? 'Documents rejetés';
            }

            $praticien->update([
                'statut_verification' => $statutFinal,
                'verifie_a' => $statutFinal === 'valide' ? now() : null,
                'verifie_par' => auth()->id(),
                'motif_rejet' => $motifRejet
            ]);

            return response()->json([
                'status' => 'success',
                'message' => $statutFinal === 'valide' 
                    ? 'Praticien validé avec succès' 
                    : ($statutFinal === 'rejete' ? 'Praticien rejeté' : 'Vérification en cours'),
                'data' => $praticien->load(['documents', 'verifiePar', 'user'])
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
                'message' => 'Erreur lors de la vérification',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rejeter un praticien
     */
    public function reject(Request $request, $id)
    {
        try {
            $praticien = Praticien::whereIn('statut_verification', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Praticien non trouvé ou déjà vérifié'
                ], 404);
            }

            $validated = $request->validate([
                'motif_rejet' => 'required|string|min:10'
            ]);

            $praticien->update([
                'statut_verification' => 'rejete',
                'motif_rejet' => $validated['motif_rejet'],
                'verifie_par' => auth()->id()
            ]);

            $praticien->documents()->update([
                'statut' => 'rejete',
                'commentaire_rejet' => 'Rejeté suite à la décision administrative',
                'verifie_a' => now(),
                'verifie_par' => auth()->id()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Praticien rejeté avec succès',
                'data' => $praticien->load(['documents', 'verifiePar', 'user'])
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
                'message' => 'Erreur lors du rejet',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relancer un praticien
     */
    public function relance($id)
    {
        try {
            $praticien = Praticien::whereIn('statut_verification', ['en_attente', 'en_cours'])
                ->find($id);

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Praticien non trouvé'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Relance envoyée avec succès',
                'data' => [
                    'praticien' => $praticien,
                    'documents_manquants' => 5 - $praticien->documents->count(),
                    'documents_en_attente' => $praticien->documents->where('statut', 'en_attente')->count()
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la relance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Statistiques de vérification
     */
    public function statistics()
    {
        try {
            $stats = [
                'total' => Praticien::count(),
                'en_attente' => Praticien::where('statut_verification', 'en_attente')->count(),
                'en_cours' => Praticien::where('statut_verification', 'en_cours')->count(),
                'valide' => Praticien::where('statut_verification', 'valide')->count(),
                'rejete' => Praticien::where('statut_verification', 'rejete')->count(),
                'documents' => [
                    'total' => PraticienDocument::count(),
                    'en_attente' => PraticienDocument::where('statut', 'en_attente')->count(),
                    'valide' => PraticienDocument::where('statut', 'valide')->count(),
                    'rejete' => PraticienDocument::where('statut', 'rejete')->count(),
                ],
                'par_specialite' => Praticien::selectRaw('specialite, COUNT(*) as count')
                    ->groupBy('specialite')
                    ->get(),
                'derniers_inscrits' => Praticien::with(['verifiePar', 'user'])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'firstname', 'lastname', 'email', 'statut_verification', 'created_at'])
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