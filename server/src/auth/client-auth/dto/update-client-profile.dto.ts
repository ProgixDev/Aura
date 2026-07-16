import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClientProfileDto {
  @IsOptional() @IsString() @MaxLength(255) firstname?: string;
  @IsOptional() @IsString() @MaxLength(255) lastname?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(255) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
}
