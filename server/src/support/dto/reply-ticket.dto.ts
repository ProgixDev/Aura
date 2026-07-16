import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TICKET_STATUTS } from './update-ticket.dto';

export class ReplyTicketDto {
  @IsString() @MinLength(1) text: string;
  @IsOptional() @IsIn(TICKET_STATUTS) statut?: string;
}
