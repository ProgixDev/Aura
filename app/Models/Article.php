<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    
    use HasFactory;

    protected $fillable = [
        'titre',
        'slug',
        'categorie',
        'tonalite',
        'extrait',
        'corps',
        'status',
        'auteur',
        'temps_lecture',
        'image_couverture',
        'meta_description',
        'mot_clef',
        'date_publication'
    ];

    protected $casts = [
        'date_publication' => 'datetime',
        'temps_lecture' => 'integer'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($article) {
            if (empty($article->slug)) {
                $article->slug = Str::slug($article->titre);
            }
        });

        static::updating(function ($article) {
            if ($article->isDirty('titre') && !$article->isDirty('slug')) {
                $article->slug = Str::slug($article->titre);
            }
        });
    }


    public function getImageUrlAttribute()
    {
        if ($this->image_couverture) {
            return asset('storage/' . $this->image_couverture);
        }
        return null;
    }

    public function isPublished()
    {
        return $this->status === 'publié' && $this->date_publication <= now();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'publié')
                     ->where('date_publication', '<=', now());
    }

    public function scopeByCategory($query, $categorie)
    {
        return $query->where('categorie', $categorie);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }



}
