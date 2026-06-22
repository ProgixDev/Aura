<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    /**
     * Lister toutes les notifications
     */
    public function index(Request $request)
    {
        try {
            $query = Notification::query();

            // Filtres
            if ($request->has('audience')) {
                $query->where('audience', $request->audience);
            }

            if ($request->has('canal')) {
                $query->where('canal', $request->canal);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('titre', 'LIKE', "%{$search}%")
                      ->orWhere('message', 'LIKE', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $notifications = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $notifications->items(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une notification
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'audience' => 'required|string|max:255',
                'canal' => 'required|string|max:255',
                'titre' => 'required|string|max:255',
                'status' => 'nullable|string|max:255',
                'message' => 'required|string'
            ]);

            $notification = Notification::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Notification créée avec succès',
                'data' => $notification
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
                'message' => 'Erreur lors de la création',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher une notification
     */
    public function show($id)
    {
        try {
            $notification = Notification::find($id);

            if (!$notification) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Notification non trouvée'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $notification
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
     * Mettre à jour une notification
     */
    public function update(Request $request, $id)
    {
        try {
            $notification = Notification::find($id);

            if (!$notification) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Notification non trouvée'
                ], 404);
            }

            $validated = $request->validate([
                'audience' => 'sometimes|string|max:255',
                'canal' => 'sometimes|string|max:255',
                'titre' => 'sometimes|string|max:255',
                'status' => 'nullable|string|max:255',
                'message' => 'sometimes|string'
            ]);

            $notification->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Notification mise à jour avec succès',
                'data' => $notification
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
     * Supprimer une notification
     */
    public function destroy($id)
    {
        try {
            $notification = Notification::find($id);

            if (!$notification) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Notification non trouvée'
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Notification supprimée avec succès'
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