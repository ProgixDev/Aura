import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString() @MaxLength(255) audience: string;
  @IsString() @MaxLength(255) canal: string;
  @IsString() @MaxLength(255) titre: string;
  @IsOptional() @IsString() @MaxLength(255) status?: string;
  @IsString() message: string;
}
