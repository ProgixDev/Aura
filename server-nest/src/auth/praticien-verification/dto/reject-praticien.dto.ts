import { IsString, MinLength } from 'class-validator';

export class RejectPraticienDto {
  @IsString() @MinLength(10) motif_rejet: string;
}
