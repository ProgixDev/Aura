import { IsInt } from 'class-validator';

export class CreateFavoriteDto {
  @IsInt() praticien_id: number;
}
