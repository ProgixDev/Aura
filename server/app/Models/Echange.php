<?php
// app/Models/Exchange.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Echange extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id',
        'sujet',
        'type',
        'statut',
        'priorite',
        'message',
        'format',
        'delai'
    ];



    // Relations
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

}