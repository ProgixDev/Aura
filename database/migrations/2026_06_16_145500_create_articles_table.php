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
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->string('slug')->unique();
            $table->string('categorie');
            $table->string('tonalite'); 
            $table->text('extrait');
            $table->longText('corps');
            $table->string('status');
            $table->string('auteur');
            $table->integer('temps_lecture'); 
            $table->string('image_couverture')->nullable();
            $table->string('meta_description')->nullable();
            $table->string('mot_clef')->nullable();
            $table->timestamp('date_publication')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
