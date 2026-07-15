import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export const DISPUTE_PRIORITES = ['haute', 'normale'];

export class CreateDisputeDto {
  @IsInt() client_id: number;
  @IsInt() praticien_id: number;
  @IsOptional() @IsInt() paiement_id?: number;
  @IsOptional() @IsNumber() @Min(0) montant?: number;
  @IsString() @MinLength(3) motif: string;
  @IsOptional() @IsIn(DISPUTE_PRIORITES) priorite?: string;
}
