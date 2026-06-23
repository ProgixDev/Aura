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
        Schema::create('remboursements', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('paiement_id')->constrained('paiements')->onDelete('cascade');
            $table->foreignId('praticien_id')->nullable()->constrained('praticiens')->onDelete('set null');
            $table->decimal('montant', 10, 2);
            $table->string('motif', 255);
            $table->text('description')->nullable();
            $table->string('statut', 50)->default('en_attente')->comment('en_attente, en_cours, approuve, refuse, completed');
            
            $table->text('commentaire_admin')->nullable();
            $table->timestamp('date_traitement')->nullable();
            $table->timestamp('date_remboursement')->nullable();
            
            $table->json('documents')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('remboursements');
    }
};
