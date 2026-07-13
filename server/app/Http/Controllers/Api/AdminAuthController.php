<?php
// app/Http/Controllers/Api/AdminAuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AdminAuthController extends Controller
{
    /**
     * Créer un compte administrateur
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8|confirmed',
            ]);

            // Créer l'utilisateur admin
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'is_admin' => true
            ]);

            // Générer le token JWT
            $token = JWTAuth::fromUser($user);

            return response()->json([
                'status' => 'success',
                'message' => 'Compte administrateur créé avec succès',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_admin' => $user->is_admin,
                        'created_at' => $user->created_at
                    ],
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60
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
                'message' => 'Erreur lors de la création du compte admin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Connexion de l'administrateur
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

            // Vérifier si l'utilisateur est admin
            if (!$user->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous n\'êtes pas autorisé à vous connecter en tant qu\'administrateur.'
                ], 403);
            }

            // Mettre à jour les informations de connexion
            $user->update([
                'last_login_at' => now(),
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Connexion administrateur réussie',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_admin' => $user->is_admin,
                        'last_login_at' => $user->last_login_at
                    ],
                    'token' => $token,
                    'token_type' => 'bearer',
                    'expires_in' => auth()->factory()->getTTL() * 60
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
     * Déconnexion de l'administrateur
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
     * Rafraîchir le token admin
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
     * Récupérer le profil de l'administrateur
     */
    public function profile()
    {
        try {
            $user = auth()->user();

            if (!$user->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_admin' => $user->is_admin,
                        'last_login_at' => $user->last_login_at,
                        'ip_address' => $user->ip_address,
                        'created_at' => $user->created_at,
                        'updated_at' => $user->updated_at
                    ]
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
     * Vérifier le token admin
     */
    public function checkToken()
    {
        try {
            $user = auth()->user();

            if (!$user->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Token invalide ou non admin'
                ], 403);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Token admin valide',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'is_admin' => $user->is_admin
                    ]
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

    /**
     * Changer le mot de passe admin
     */
    public function changePassword(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $validated = $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8|confirmed'
            ]);

            // Vérifier l'ancien mot de passe
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Le mot de passe actuel est incorrect'
                ], 400);
            }

            // Mettre à jour le mot de passe
            $user->update([
                'password' => Hash::make($validated['new_password'])
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Mot de passe mis à jour avec succès'
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
                'message' => 'Erreur lors du changement de mot de passe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Liste des administrateurs (super admin uniquement)
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $admins = User::where('is_admin', true)
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return response()->json([
                'status' => 'success',
                'data' => $admins->items(),
                'pagination' => [
                    'current_page' => $admins->currentPage(),
                    'last_page' => $admins->lastPage(),
                    'per_page' => $admins->perPage(),
                    'total' => $admins->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des admins',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Désactiver un administrateur (super admin uniquement)
     */
    public function deactivate($id)
    {
        try {
            $currentUser = auth()->user();

            if (!$currentUser->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            // Empêcher la désactivation de son propre compte
            if ($currentUser->id == $id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous ne pouvez pas désactiver votre propre compte'
                ], 400);
            }

            $admin = User::where('is_admin', true)->find($id);

            if (!$admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Administrateur non trouvé'
                ], 404);
            }

            $admin->update(['is_admin' => false]);

            return response()->json([
                'status' => 'success',
                'message' => 'Administrateur désactivé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la désactivation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Réactiver un administrateur (super admin uniquement)
     */
    public function activate($id)
    {
        try {
            $currentUser = auth()->user();

            if (!$currentUser->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $user = User::find($id);

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Utilisateur non trouvé'
                ], 404);
            }

            $user->update(['is_admin' => true]);

            return response()->json([
                'status' => 'success',
                'message' => 'Administrateur réactivé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la réactivation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un administrateur (super admin uniquement)
     */
    public function destroy($id)
    {
        try {
            $currentUser = auth()->user();

            if (!$currentUser->is_admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            // Empêcher la suppression de son propre compte
            if ($currentUser->id == $id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous ne pouvez pas supprimer votre propre compte'
                ], 400);
            }

            $admin = User::where('is_admin', true)->find($id);

            if (!$admin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Administrateur non trouvé'
                ], 404);
            }

            $admin->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Administrateur supprimé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la suppression',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}