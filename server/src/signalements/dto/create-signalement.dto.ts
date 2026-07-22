import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SIGNALEMENT_PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

export class CreateSignalementDto {
  @IsOptional() @IsInt() praticien_id?: number;
  @IsOptional() @IsInt() client_id?: number;
  @IsString() @MaxLength(255) type: string;
  @IsString() @MaxLength(255) sujet: string;
  @IsString() @MinLength(3) motif: string;
  @IsOptional() @IsIn(SIGNALEMENT_PRIORITES) priorite?: string;
}
