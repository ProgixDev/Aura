import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreatePromotionDto {
  @IsString() @MaxLength(50) code: string;
  @IsIn(['pourcentage', 'fixe']) type: string;
  @Type(() => Number) @IsNumber() @Min(0) valeur: number;
  @IsDateString() date_expiration: string;
}
