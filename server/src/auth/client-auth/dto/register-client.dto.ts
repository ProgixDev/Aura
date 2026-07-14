import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class RegisterClientDto {
  @IsString() @MaxLength(255) firstname: string;
  @IsString() @MaxLength(255) lastname: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
  @IsString() @MaxLength(255) city: string;
}
