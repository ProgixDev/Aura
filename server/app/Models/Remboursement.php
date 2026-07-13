<?php
// app/Models/Remboursement.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Remboursement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'client_id',
        'paiement_id',
        'praticien_id',
        'montant',
        'motif',
        'description',
        'statut',
        'commentaire_admin',
        'date_traitement',
        'date_remboursement',
        'documents',
        'metadata'
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'documents' => 'array',
        'metadata' => 'array',
        'date_traitement' => 'datetime',
        'date_remboursement' => 'datetime',
    ];

    // Relations
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function paiement()
    {
        return $this->belongsTo(Paiement::class);
    }

    public function praticien()
    {
        return $this->belongsTo(Praticien::class);
    }

    // Scopes
    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }

    public function scopeApprouve($query)
    {
        return $query->where('statut', 'approuve');
    }

    public function scopeCompleted($query)
    {
        return $query->where('statut', 'completed');
    }

    public function scopeRefuse($query)
    {
        return $query->where('statut', 'refuse');
    }

    // Accesseurs
    public function getMontantFormattedAttribute()
    {
        return number_format($this->montant, 2) . ' €';
    }

    public function getStatutLabelAttribute()
    {
        $labels = [
            'en_attente' => 'En attente',
            'en_cours' => 'En cours',
            'approuve' => 'Approuvé',
            'refuse' => 'Refusé',
            'completed' => 'Complété'
        ];
        return $labels[$this->statut] ?? $this->statut;
    }

    public function getStatutBadgeAttribute()
    {
        $badges = [
            'en_attente' => 'warning',
            'en_cours' => 'info',
            'approuve' => 'success',
            'refuse' => 'danger',
            'completed' => 'success'
        ];
        return $badges[$this->statut] ?? 'secondary';
    }

    // Boot
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->reference)) {
                $model->reference = 'RMB-' . str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
            }
        });
    }
}