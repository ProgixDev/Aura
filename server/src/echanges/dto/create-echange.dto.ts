import {
  IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export class CreateEchangeDto {
  @IsString() @MaxLength(255) sujet: string;
  @IsIn(['proposition', 'demande', 'information', 'autre']) type: string;
  @IsString() @MinLength(10) message: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_propose?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_recherche?: string;
  @IsOptional() @IsString() @MaxLength(255) format?: string;
  @IsOptional() @IsDateString() delai_souhaite?: string;
}
