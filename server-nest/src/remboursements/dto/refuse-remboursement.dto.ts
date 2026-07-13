import { IsString, MinLength } from 'class-validator';

export class RefuseRemboursementDto {
  @IsString() @MinLength(10) commentaire_admin: string;
}
