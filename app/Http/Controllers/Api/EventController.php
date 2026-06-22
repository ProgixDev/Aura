<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Event;

class EventController extends Controller
{

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $events = Event::paginate($perPage);
        
        return response()->json([
            'status' => 'success',
            'data' => $events->items(),
            'pagination' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
                'next_page_url' => $events->nextPageUrl(),
                'prev_page_url' => $events->previousPageUrl(),
            ]
        ], 200);
    }
    
    public function store(Request $request)
{
    $validated = $request->validate([
        'titre' => 'required|string|max:255',
        'type' => 'required|string',
        'dates' => 'required|array|min:1',
        'dates.*' => 'required|date',
        'lieu' => 'required|string',
        'prix' => 'required|numeric',
        'nombre_places' => 'required|integer',
        'description' => 'required|string',
        'animateurs' => 'nullable|array',
        'animateurs.*.id' => 'exists:praticiens,id',
        'animateurs.*.role' => 'string'
    ]);

    $event = Event::create($validated);

    if (isset($validated['animateurs'])) {
        foreach ($validated['animateurs'] as $animateur) {
            $event->animateurs()->attach($animateur['id'], [
                'role' => $animateur['role'] ?? 'animateur'
            ]);
        }
    }

    return response()->json([
        'status' => 'success',
        'data' => $event->load('animateurs')
    ], 201);
}

/**
     * Display the specified event.
     */
    public function show($id)
    {
        $event = Event::with('animateurs')->find($id);

        if (!$event) {
            return response()->json([
                'status' => 'error',
                'message' => 'Événement non trouvé'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $event
        ], 200);
    }


    public function update(Request $request, $id)
    {
        $event = Event::find($id);

        if (!$event) {
            return response()->json([
                'status' => 'error',
                'message' => 'Événement non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'titre' => 'sometimes|string|max:255',
            'type' => 'sometimes|string',
            'dates' => 'sometimes|array|min:1',
            'dates.*' => 'required|date',
            'lieu' => 'sometimes|string',
            'prix' => 'sometimes|numeric',
            'nombre_places' => 'sometimes|integer',
            'description' => 'sometimes|string',
            'animateurs' => 'nullable|array',
            'animateurs.*.id' => 'exists:praticiens,id',
            'animateurs.*.role' => 'string'
        ]);
        $event->update($validated);

        if ($request->has('animateurs')) {
            $event->animateurs()->detach();
            
            if (!empty($validated['animateurs'])) {
                foreach ($validated['animateurs'] as $animateur) {
                    $event->animateurs()->attach($animateur['id'], [
                        'role' => $animateur['role'] ?? 'animateur'
                    ]);
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Événement mis à jour avec succès',
            'data' => $event->load('animateurs')
        ], 200);
    }


    public function destroy($id)
    {
        $event = Event::find($id);

        if (!$event) {
            return response()->json([
                'status' => 'error',
                'message' => 'Événement non trouvé'
            ], 404);
        }
        $event->animateurs()->detach();
        
        $event->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Événement supprimé avec succès'
        ], 200);
    }

}
