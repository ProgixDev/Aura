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
        Schema::create('avis', function (Blueprint $table) {
            $table->id();
            $table->string('full_name_author');
            $table->foreignId('praticien_id')->constrained('praticiens')->onDelete('cascade');
            $table->integer('note')->unsigned()->between(1, 5);
            $table->text('avis');
            $table->timestamp('date_ajout')->useCurrent();
            $table->string('statut');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('avis');
    }
};
