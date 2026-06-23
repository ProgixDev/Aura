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
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('praticien_id')->nullable()->constrained('praticiens')->onDelete('set null');
            $table->timestamp('date_paiement')->nullable();
            $table->decimal('montant_brut', 10, 2);
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('montant_net_praticien', 10, 2)->default(0);
            $table->string('moyen_paiement', 50)->comment('Carte, Apple Pay, PayPal, etc.');
            $table->string('statut', 50)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};
