import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateRendezVousDto {
  @Type(() => Number) @IsInt() @Min(1) praticien_id: number;
  @IsISO8601() date_heure: string;
  @IsIn(['présentiel', 'visio']) mode: string;
  @IsOptional() @IsString() promotion_code?: string;
}
