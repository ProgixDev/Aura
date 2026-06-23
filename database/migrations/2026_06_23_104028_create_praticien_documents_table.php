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
        Schema::create('praticien_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('praticien_id')->constrained('praticiens')->onDelete('cascade');
            $table->string('type', 50)->comment('piece_identite, certification, assurance, domicile, charte');
            $table->string('nom_fichier');
            $table->string('chemin');
            $table->string('mime_type')->nullable();
            $table->integer('taille')->nullable();
            $table->enum('statut', ['en_attente', 'valide', 'rejete'])->default('en_attente');
            $table->text('commentaire_rejet')->nullable();
            $table->timestamp('verifie_a')->nullable();
            $table->foreignId('verifie_par')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('praticien_documents');
    }
};
