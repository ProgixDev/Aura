import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationClientDto {
  @IsInt() praticien_id: number;
  @IsOptional() @IsString() @MinLength(1) text?: string;
}
