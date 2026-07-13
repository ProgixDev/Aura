import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateArticleDto {
  @IsString() @MaxLength(255) titre: string;
  @IsString() @MaxLength(100) categorie: string;
  @IsString() @MaxLength(50) tonalite: string;
  @IsString() @MaxLength(500) extrait: string;
  @IsString() corps: string;
  @IsIn(['brouillon', 'en_revue', 'publié', 'archivé']) status: string;
  @IsString() @MaxLength(255) auteur: string;
  @Type(() => Number) @IsInt() @Min(1) temps_lecture: number;
  @IsOptional() @IsString() @MaxLength(255) image_couverture?: string;
  @IsOptional() @IsString() @MaxLength(255) meta_description?: string;
  @IsOptional() @IsString() @MaxLength(255) mot_clef?: string;
  @IsOptional() @IsDateString() date_publication?: string;
}
