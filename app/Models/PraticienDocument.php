<?php
// app/Models/PraticienDocument.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PraticienDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'praticien_id',
        'type',
        'nom_fichier',
        'chemin',
        'mime_type',
        'taille',
        'statut',
        'commentaire_rejet',
        'verifie_a',
        'verifie_par'
    ];

    protected $casts = [
        'verifie_a' => 'datetime',
    ];

    // Relations
    public function praticien()
    {
        return $this->belongsTo(Praticien::class);
    }

    public function verifiePar()
    {
        return $this->belongsTo(User::class, 'verifie_par');
    }

    // Scopes
    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }

    public function scopeValide($query)
    {
        return $query->where('statut', 'valide');
    }

    public function scopeRejete($query)
    {
        return $query->where('statut', 'rejete');
    }

    // Accesseurs
    public function getTypeLabelAttribute()
    {
        $labels = [
            'piece_identite' => 'Pièce d\'identité',
            'certification' => 'Certification / Diplôme',
            'assurance' => 'Attestation d\'assurance',
            'domicile' => 'Justificatif de domicile',
            'charte' => 'Charte éthique signée'
        ];
        return $labels[$this->type] ?? $this->type;
    }
}