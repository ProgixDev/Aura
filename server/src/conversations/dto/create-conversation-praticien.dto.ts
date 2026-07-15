import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationPraticienDto {
  @IsInt() client_id: number;
  @IsOptional() @IsString() @MinLength(1) text?: string;
}
