import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsString() @MaxLength(255) @MinLength(1) name: string;
  @IsEmail() email: string;
  @IsString() @MaxLength(255) @MinLength(1) subject: string;
  @IsString() @MinLength(1) message: string;
}
