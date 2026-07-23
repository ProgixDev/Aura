import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Min, MaxLength } from 'class-validator';

export class CreatePraticienCercleDto {
  @IsString() @MaxLength(255) nom: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'color doit être un code hexadécimal valide',
  })
  color?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) prix?: number;
}
