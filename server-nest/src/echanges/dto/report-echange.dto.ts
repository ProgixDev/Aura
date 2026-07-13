import { IsString, MaxLength } from 'class-validator';

export class ReportEchangeDto {
  @IsString() @MaxLength(500) motif_signalement: string;
}
