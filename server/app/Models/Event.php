<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    
    use HasFactory;

    protected $fillable = [
        'titre',
        'type',
        'dates',
        'lieu',
        'prix',
        'nombre_places',
        'description',
        'status'
    ];

    protected $casts = [
        'dates' => 'array',
        'prix' => 'decimal:2'
    ];


    public function animateurs()
    {
        return $this->belongsToMany(Praticien::class, 'event_praticien')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    public function getAnimateursListAttribute()
    {
        return $this->animateurs()->wherePivot('role', 'animateur')->get();
    }

}
