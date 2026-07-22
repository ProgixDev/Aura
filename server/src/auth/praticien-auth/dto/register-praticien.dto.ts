import { IsEmail, IsInt, IsNumber, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Match } from '../../../common/match.decorator';

export class RegisterPraticienDto {
  @IsString() @MaxLength(255) firstname: string;
  @IsString() @MaxLength(255) lastname: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
  @IsString() @Matches(/^\d{14}$/, { message: 'Le numéro de SIRET doit contenir exactement 14 chiffres.' }) siret: string;
  @IsString() @MaxLength(20) telephone: string;
  @IsString() @MaxLength(255) ville: string;
  @IsString() @MaxLength(255) niveau: string;
  @IsString() @MaxLength(255) specialite: string;
  @IsString() @MaxLength(255) mode: string;
  @Type(() => Number) @IsNumber() @Min(0) tarif: number;
  @Type(() => Number) @IsInt() @Min(0) experience: number;
  @IsString() @MinLength(50) bio: string;
}
