<?php
// app/Http/Middleware/AdminMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();
        
        if (!$user || !$user->is_admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès non autorisé. Vous devez être administrateur.'
            ], 403);
        }

        return $next($request);
    }
}