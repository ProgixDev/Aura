import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsInt() peer_id: number;
  @IsOptional() @IsString() @MinLength(1) text?: string;
}
