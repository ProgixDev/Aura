<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CercleController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\PraticienController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\DisciplineController;
use App\Http\Controllers\Api\EchangeController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\EmailTemplateController;
use App\Http\Controllers\Api\PaiementController;
use App\Http\Controllers\Api\RemboursementController;

use Illuminate\Support\Facades\Route;


Route::prefix('cercles')->group(function () {
    Route::get('/', [CercleController::class, 'index']);           
    Route::post('/', [CercleController::class, 'store']);   
    Route::get('/{id}', [CercleController::class, 'show']);  
    Route::put('/{id}', [CercleController::class, 'update']);      
    Route::delete('/{id}', [CercleController::class, 'destroy']);         
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


Route::prefix('echanges')->group(function () {
    Route::get('/', [EchangeController::class, 'adminIndex']);
    Route::get('/{id}', [EchangeController::class, 'adminShow']);
    Route::put('/{id}', [EchangeController::class, 'adminUpdate']);
    Route::patch('/{id}', [EchangeController::class, 'adminUpdate']);
    Route::delete('/{id}', [EchangeController::class, 'adminDestroy']);    
    Route::post('/{id}/hide', [EchangeController::class, 'adminHide']);
    Route::post('/{id}/report', [EchangeController::class, 'adminReport']);   
    Route::get('/statistics', [EchangeController::class, 'adminStatistics']);  

    Route::get('client/echanges', [EchangeController::class, 'index']);
    Route::post('client/echanges', [EchangeController::class, 'store']);
    Route::get('client/echanges/{id}', [EchangeController::class, 'show']);
    Route::put('client/echanges/{id}', [EchangeController::class, 'update']);
    Route::patch('client/echanges/{id}', [EchangeController::class, 'update']);
    Route::delete('client/echanges/{id}', [EchangeController::class, 'destroy']);
});


Route::prefix('articles')->group(function () {
    Route::get('/', [ArticleController::class, 'index']);   
    Route::post('/create-article', [ArticleController::class, 'store']);  
    Route::get('/{id}', [ArticleController::class, 'show']);     
    Route::put('/{id}', [ArticleController::class, 'update']);  
    Route::put('/{id}/{status}', [ArticleController::class, 'publish']);
    Route::put('/{id}/{status}', [ArticleController::class, 'archive']);  
    Route::delete('/{id}', [ArticleController::class, 'destroy']);      
});

Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);           
    Route::post('/', [NotificationController::class, 'store']);   
    Route::get('/{id}', [NotificationController::class, 'show']);  
    Route::put('/{id}', [NotificationController::class, 'update']);      
    Route::delete('/{id}', [NotificationController::class, 'destroy']);         
});


Route::prefix('emails')->group(function () {
    Route::get('/', [EmailTemplateController::class, 'index']);           
    Route::post('/', [EmailTemplateController::class, 'store']);   
    Route::get('/{id}', [EmailTemplateController::class, 'show']);  
    Route::put('/{id}', [EmailTemplateController::class, 'update']);      
    Route::delete('/{id}', [EmailTemplateController::class, 'destroy']);         
});


Route::prefix('paiements')->group(function () {
    Route::get('/', [PaiementController::class, 'adminIndex']);           
    Route::get('/statistics', [PaiementController::class, 'adminStatistics']);   
    Route::get('/export', [PaiementController::class, 'adminExport']);  
    Route::get('/export/csv', [PaiementController::class, 'adminExportCsv']);      
    Route::delete('/{id}', [PaiementController::class, 'destroy']);      
    Route::get('/clients', [PaiementController::class, 'index']);
    Route::get('/{id}', [PaiementController::class, 'show']);
    Route::get('/export/comptable', [PaiementController::class, 'exportComptable']);   
});


Route::prefix('remboursements')->group(function () {
    Route::get('client', [RemboursementController::class, 'index']);
    Route::post('client', [RemboursementController::class, 'store']);
    Route::get('client/{id}', [RemboursementController::class, 'show']);
    Route::post('client/{id}/cancel', [RemboursementController::class, 'cancel']); 
    Route::get('admin', [RemboursementController::class, 'adminIndex']);
    Route::get('admin/{id}', [RemboursementController::class, 'adminShow']);
    Route::post('admin/{id}/approve', [RemboursementController::class, 'adminApprove']);
    Route::post('admin/{id}/refuse', [RemboursementController::class, 'adminRefuse']);
    Route::post('admi/{id}/complete', [RemboursementController::class, 'adminComplete']);
    Route::get('admin/statistics', [RemboursementController::class, 'adminStatistics']);
    Route::get('admin/export', [RemboursementController::class, 'adminExport']);  
});