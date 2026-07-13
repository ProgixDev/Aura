<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->string('type');
            $table->json('dates'); 
            $table->string('lieu');
            $table->decimal('prix', 10, 2);
            $table->integer('nombre_places');
            $table->text('description');
            $table->enum('status', ['brouillon', 'publié', 'annulé', 'terminé'])->default('brouillon');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
