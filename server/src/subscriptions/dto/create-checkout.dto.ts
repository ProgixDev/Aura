import { IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['pro', 'premium']) plan: 'pro' | 'premium';
}
