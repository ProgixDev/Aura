import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString() @MaxLength(255) nom: string;
  @IsString() @MaxLength(255) objet: string;
  @IsString() corps: string;
  @IsOptional() @IsIn(['actif', 'inactif', 'archive']) statut?: string;
  @IsOptional() @IsArray() variables?: string[];
}
