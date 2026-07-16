import { IsString, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class ChangeClientPasswordDto {
  @IsString() current_password: string;
  @IsString() @MinLength(8) new_password: string;
  @IsString() @Match('new_password') new_password_confirmation: string;
}
