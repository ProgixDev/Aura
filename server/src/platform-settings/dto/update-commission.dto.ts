import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionDto {
  @Type(() => Number) @IsNumber() @Min(0) @Max(1) commission_rate: number;
}
