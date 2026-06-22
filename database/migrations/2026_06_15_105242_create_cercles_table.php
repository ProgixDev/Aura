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
        Schema::create('cercles', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->unique();
            $table->text('description')->nullable();
            $table->string('color', 50)->nullable();
            $table->string('animateur')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cercles');
    }
};
