import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRemboursementDto {
  @Type(() => Number) @IsInt() paiement_id: number;
  @IsString() @MaxLength(255) motif: string;
  @IsOptional() @IsString() description?: string;
}
