<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Praticien;
use App\Models\PraticienDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class PraticienAuthController extends Controller
{
    /**
     * Inscription d'un nouveau praticien
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'firstname' => 'required|string|max:255',
                'lastname' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email|unique:praticiens,email',
                'password' => 'required|string|min:8|confirmed',
                'telephone' => 'required|string|max:20',
                'ville' => 'required|string|max:255',
                'niveau' => 'required|string|max:255',
                'specialite' => 'required|string|max:255',
                'mode' => 'required|string|max:255',
                'tarif' => 'required|numeric|min:0',
                'experience' => 'required|integer|min:0',
                'bio' => 'required|string|min:50',
                'documents' => 'required|array|min:5',
                'documents.piece_identite' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
                'documents.certification' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
                'documents.assurance' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
                'documents.domicile' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
                'documents.charte' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
            ]);

            // 1. Créer l'utilisateur
            $user = User::create([
                'name' => $validated['firstname'] . ' ' . $validated['lastname'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'is_admin' => false
            ]);

            // 2. Créer le praticien
            $praticien = Praticien::create([
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'email' => $validated['email'],
                'telephone' => $validated['telephone'],
                'ville' => $validated['ville'],
                'niveau' => $validated['niveau'],
                'specialite' => $validated['specialite'],
                'mode' => $validated['mode'],
                'status' => 'actif',
                'tarif' => $validated['tarif'],
                'experience' => $validated['experience'],
                'bio' => $validated['bio'],
                'statut_verification' => 'en_attente',
                'date_inscription' => now()
            ]);

            // 3. Upload des documents
            $documentTypes = [
                'piece_identite' => 'Pièce d\'identité',
                'certification' => 'Certification / Diplôme',
                'assurance' => 'Attestation d\'assurance',
                'domicile' => 'Justificatif de domicile',
                'charte' => 'Charte éthique signée'
            ];

            $documentsUploades = 0;
            foreach ($documentTypes as $key => $label) {
                if ($request->hasFile('documents.' . $key)) {
                    $file = $request->file('documents.' . $key);
                    $path = $file->store('praticiens/' . $praticien->id . '/documents', 'public');
                    
                    PraticienDocument::create([
                        'praticien_id' => $praticien->id,
                        'type' => $key,
                        'nom_fichier' => $file->getClientOriginalName(),
                        'chemin' => $path,
                        'mime_type' => $file->getMimeType(),
                        'taille' => $file->getSize(),
                        'statut' => 'en_attente'
                    ]);
                    $documentsUploades++;
                }
            }

            // 4. Générer le token JWT
            $token = JWTAuth::fromUser($user);

            return response()->json([
                'status' => 'success',
                'message' => 'Votre compte a été créé avec succès. En attente de vérification par l\'administrateur.',
                'data' => [
                    'user' => $user,
                    'praticien' => $praticien,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60,
                    'documents_soumis' => $documentsUploades,
                    'documents_requis' => count($documentTypes)
                ]
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
                'message' => 'Erreur lors de l\'inscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Connexion du praticien
     */
    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string'
            ]);

            $credentials = [
                'email' => $validated['email'],
                'password' => $validated['password']
            ];

            // Vérifier les identifiants
            if (!$token = JWTAuth::attempt($credentials)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Les identifiants sont incorrects.'
                ], 401);
            }

            $user = auth()->user();

            // Vérifier si l'utilisateur est un praticien
            $praticien = Praticien::where('email', $user->email)->first();

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous n\'êtes pas autorisé à vous connecter en tant que praticien.'
                ], 403);
            }

            // Vérifier si le praticien est actif
            if ($praticien->statut_verification === 'rejete') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Votre compte a été rejeté. Motif : ' . ($praticien->motif_rejet ?? 'Non spécifié'),
                    'motif_rejet' => $praticien->motif_rejet
                ], 403);
            }

            // Mettre à jour les informations de connexion
            $user->update([
                'last_login_at' => now(),
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Connexion réussie',
                'data' => [
                    'user' => $user,
                    'praticien' => $praticien,
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60,
                    'verification_status' => $praticien->statut_verification,
                    'is_verified' => $praticien->statut_verification === 'valide'
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
                'message' => 'Erreur lors de la connexion',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Déconnexion du praticien
     */
    public function logout()
    {
        try {
            auth()->logout();

            return response()->json([
                'status' => 'success',
                'message' => 'Déconnexion réussie'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la déconnexion',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rafraîchir le token
     */
    public function refresh()
    {
        try {
            $token = auth()->refresh();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors du rafraîchissement du token',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer le profil du praticien connecté
     */
    public function profile()
    {
        try {
            $user = auth()->user();
            $praticien = Praticien::where('email', $user->email)
                ->with(['documents', 'verifiePar'])
                ->first();

            if (!$praticien) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Profil praticien non trouvé'
                ], 404);
            }

            // Compter les documents par statut
            $documentsStats = [
                'total' => $praticien->documents->count(),
                'en_attente' => $praticien->documents->where('statut', 'en_attente')->count(),
                'valide' => $praticien->documents->where('statut', 'valide')->count(),
                'rejete' => $praticien->documents->where('statut', 'rejete')->count(),
            ];

            return response()->json([
                'status' => 'success',
                'data' => [
                    'user' => $user,
                    'praticien' => $praticien,
                    'documents_stats' => $documentsStats
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération du profil',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifier le token
     */
    public function checkToken()
    {
        try {
            $user = auth()->user();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Token valide',
                'data' => [
                    'user' => $user,
                    'is_admin' => $user->is_admin
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token invalide ou expiré',
                'error' => $e->getMessage()
            ], 401);
        }
    }
}