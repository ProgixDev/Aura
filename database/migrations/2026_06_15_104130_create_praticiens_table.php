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
        Schema::create('praticiens', function (Blueprint $table) {
            $table->id();
            $table->string('firstname');
            $table->string('lastname');
            $table->string('email')->unique();
            $table->string('telephone');
            $table->string('ville');
            $table->string('niveau'); 
            $table->string('specialite');     
            $table->string('mode');           
            $table->string('status');  
            $table->decimal('tarif', 10, 2);   
            $table->integer('experience');     
            $table->text('bio');                
            $table->enum('statut_verification', ['en_attente', 'en_cours', 'valide', 'rejete'])->default('en_attente');
            $table->timestamp('date_inscription')->nullable();
            $table->timestamp('verifie_a')->nullable();
            $table->foreignId('verifie_par')->nullable()->constrained('users')->onDelete('set null');
            $table->text('motif_rejet')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('praticiens');
    }
};
