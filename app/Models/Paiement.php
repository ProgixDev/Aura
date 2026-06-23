<?php
// app/Models/Paiement.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Paiement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'client_id',
        'praticien_id',
        'rendez_vous_id',
        'montant_brut',
        'commission',
        'montant_net_praticien',
        'moyen_paiement',
        'statut',
        'details_paiement',
        'metadata',
        'date_paiement',
        'date_remboursement'
    ];

    protected $casts = [
        'montant_brut' => 'decimal:2',
        'commission' => 'decimal:2',
        'montant_net_praticien' => 'decimal:2',
        'details_paiement' => 'array',
        'metadata' => 'array',
        'date_paiement' => 'datetime',
        'date_remboursement' => 'datetime',
    ];

    // Relations
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function praticien()
    {
        return $this->belongsTo(Praticien::class);
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class);
    }

    // Scopes
    public function scopePaid($query)
    {
        return $query->where('statut', 'paid');
    }

    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }

    public function scopeParClient($query, $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    public function scopeParPraticien($query, $praticienId)
    {
        return $query->where('praticien_id', $praticienId);
    }

    // Accesseurs
    public function getMontantBrutFormattedAttribute()
    {
        return number_format($this->montant_brut, 2) . ' €';
    }

    public function getCommissionFormattedAttribute()
    {
        return number_format($this->commission, 2) . ' €';
    }

    public function getMontantNetPraticienFormattedAttribute()
    {
        return number_format($this->montant_net_praticien, 2) . ' €';
    }

    // Boot
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->reference)) {
                $model->reference = 'TX-' . str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
            }
        });
    }
}