import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const TICKET_PRIORITES = ['basse', 'normale', 'haute'];

export class CreateTicketDto {
  @IsString() @MaxLength(255) requester_name: string;
  @IsEmail() requester_email: string;
  @IsString() @MaxLength(255) sujet: string;
  @IsOptional() @IsString() categorie?: string;
  @IsOptional() @IsIn(TICKET_PRIORITES) priorite?: string;
  @IsString() message: string;
}
