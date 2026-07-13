import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class RegisterAdminDto {
  @IsString() @MaxLength(255) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
}
