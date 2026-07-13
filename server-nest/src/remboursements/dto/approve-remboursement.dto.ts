import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ApproveRemboursementDto {
  @IsOptional() @IsString() commentaire_admin?: string;
  @IsOptional() @IsDateString() date_remboursement?: string;
}
