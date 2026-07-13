<?php
// app/Models/Discipline.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discipline extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'slug',
        'tonalite',
        'glyphe',
        'accroche'
    ];

    // Optionnel : accesseur pour formater la réponse
    public function getRouteKeyName()
    {
        return 'slug';
    }
}