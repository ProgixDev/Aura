import {
  IsEmail, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// Deliberately excludes `siret` — it's KYC-verified at registration (backed by the
// justificatif_siret document); changing it here would silently invalidate that
// verification without re-triggering review. A SIRET change is rare enough to route
// through support rather than a self-service field.
export class UpdatePraticienProfileDto {
  @IsOptional() @IsString() @MaxLength(255) firstname?: string;
  @IsOptional() @IsString() @MaxLength(255) lastname?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) telephone?: string;
  @IsOptional() @IsString() @MaxLength(255) ville?: string;
  @IsOptional() @IsString() @MaxLength(255) niveau?: string;
  @IsOptional() @IsString() @MaxLength(255) specialite?: string;
  @IsOptional() @IsString() @MaxLength(255) mode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tarif?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experience?: number;
  @IsOptional() @IsString() @MinLength(50) bio?: string;
}
