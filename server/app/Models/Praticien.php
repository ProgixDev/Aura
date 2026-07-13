<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Praticien extends Model
{
    
    use HasFactory;

    protected $fillable = [
        'firstname',
        'lastname',
        'email',
        'telephone',
        'ville',
        'niveau',
        'specialite',
        'mode',
        'status',
        'tarif',
        'experience',
        'bio',
        'statut_verification',
        'date_inscription',
        'verifie_a',
        'verifie_par',
        'motif_rejet'
    ];

    protected $casts = [
        'tarif' => 'decimal:2',
        'date_inscription' => 'datetime',
        'verifie_a' => 'datetime',
    ];

    // Relations
    public function user()
    {
        return $this->hasOne(User::class, 'email', 'email');
    }

    public function documents()
    {
        return $this->hasMany(PraticienDocument::class);
    }

    public function verifiePar()
    {
        return $this->belongsTo(User::class, 'verifie_par');
    }

    // Scopes
    public function scopeEnAttente($query)
    {
        return $query->where('statut_verification', 'en_attente');
    }

    public function scopeValide($query)
    {
        return $query->where('statut_verification', 'valide');
    }

    public function scopeRejete($query)
    {
        return $query->where('statut_verification', 'rejete');
    }

    // Accesseurs
    public function getFullNameAttribute()
    {
        return $this->firstname . ' ' . $this->lastname;
    }

    public function getStatutVerificationLabelAttribute()
    {
        $labels = [
            'en_attente' => 'En attente',
            'en_cours' => 'En cours',
            'valide' => 'Validé',
            'rejete' => 'Rejeté'
        ];
        return $labels[$this->statut_verification] ?? $this->statut_verification;
    }

    public function getStatutVerificationBadgeAttribute()
    {
        $badges = [
            'en_attente' => 'warning',
            'en_cours' => 'info',
            'valide' => 'success',
            'rejete' => 'danger'
        ];
        return $badges[$this->statut_verification] ?? 'secondary';
    }
    
}
