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
        Schema::create('signalements', function (Blueprint $table) {
            $table->id();
            $table->timestamp('date_signalement')->useCurrent();
            $table->string('type', 255);
            $table->string('sujet', 255);
            $table->text('motif');
            $table->foreignId('signale_par_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('praticien_id')->constrained('praticiens')->onDelete('cascade');
            $table->string('priorite', 50);
            $table->string('statut', 50);
            $table->timestamps();

            $table->index(['statut', 'priorite']);
            $table->index('type');
            $table->index('date_signalement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('signalements');
    }
};
