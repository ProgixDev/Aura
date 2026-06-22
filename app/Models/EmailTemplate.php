<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmailTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nom',
        'objet',
        'corps',
        'statut',
        'variables',
        'created_by'
    ];

    protected $casts = [
        'variables' => 'array'
    ];

    // Relations
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->where('statut', 'actif');
    }

    public function scopeInactif($query)
    {
        return $query->where('statut', 'inactif');
    }

    // Méthode pour remplacer les variables dans le corps du template
    public function render(array $data)
    {
        $corps = $this->corps;
        foreach ($data as $key => $value) {
            $corps = str_replace('{{' . $key . '}}', $value, $corps);
        }
        return $corps;
    }

    // Méthode pour remplacer les variables dans l'objet
    public function renderObjet(array $data)
    {
        $objet = $this->objet;
        foreach ($data as $key => $value) {
            $objet = str_replace('{{' . $key . '}}', $value, $objet);
        }
        return $objet;
    }
}