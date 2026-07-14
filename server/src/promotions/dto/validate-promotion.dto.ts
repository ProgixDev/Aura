import { IsString } from 'class-validator';

export class ValidatePromotionDto {
  @IsString() code: string;
}
