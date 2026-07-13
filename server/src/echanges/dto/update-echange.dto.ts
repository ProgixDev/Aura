import {
  IsDateString, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export class UpdateEchangeDto {
  @IsOptional() @IsString() @MaxLength(255) sujet?: string;
  @IsOptional() @IsString() @MinLength(10) message?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_propose?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_recherche?: string;
  @IsOptional() @IsString() @MaxLength(255) format?: string;
  @IsOptional() @IsDateString() delai_souhaite?: string;
}
