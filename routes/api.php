<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CercleController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\PraticienController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\DisciplineController;

use Illuminate\Support\Facades\Route;


Route::prefix('cercles')->group(function () {
    Route::get('/', [CercleController::class, 'index']);           
    Route::post('/', [CercleController::class, 'store']);           
});

Route::prefix('events')->group(function () {
    Route::get('/', [EventController::class, 'index']);   
    Route::post('/create-event', [EventController::class, 'store']);    
    Route::get('/{id}', [EventController::class, 'show']);  
    Route::put('/{id}', [EventController::class, 'update']);      
    Route::delete('/{id}', [EventController::class, 'destroy']); 
});

Route::prefix('praticiens')->group(function () {
    Route::get('/', [PraticienController::class, 'index']);       
});

Route::prefix('clients')->group(function () {
    Route::get('/', [ClientController::class, 'index']);       
});


Route::prefix('promotions')->group(function () {
    Route::get('/', [PromotionController::class, 'index']);           
    Route::post('/', [PromotionController::class, 'store']);         
    Route::get('/{id}', [PromotionController::class, 'show']);     
    Route::put('/{id}', [PromotionController::class, 'update']);      
    Route::delete('/{id}', [PromotionController::class, 'destroy']);  
});


Route::prefix('disciplines')->group(function () {
    Route::get('/', [DisciplineController::class, 'index']);   
    Route::post('/create-discipline', [DisciplineController::class, 'store']);  
    Route::get('/{id}', [DisciplineController::class, 'show']);     
    Route::put('/{id}', [DisciplineController::class, 'update']);  
    Route::delete('/{id}', [DisciplineController::class, 'destroy']);      
});