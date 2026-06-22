<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Promotion extends Model
{
    
    use HasFactory;

    protected $fillable = [
        'code',
        'type',
        'valeur',
        'date_expiration',
        'status'
    ];

    protected $casts = [
        'date_expiration' => 'date',
        'valeur' => 'decimal:2'
    ];



}
