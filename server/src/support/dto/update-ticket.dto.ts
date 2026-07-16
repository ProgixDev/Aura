import { IsIn, IsInt, IsOptional } from 'class-validator';
import { TICKET_PRIORITES } from './create-ticket.dto';

export const TICKET_STATUTS = ['ouvert', 'en_cours', 'resolu', 'ferme'];

export class UpdateTicketDto {
  @IsOptional() @IsIn(TICKET_STATUTS) statut?: string;
  @IsOptional() @IsIn(TICKET_PRIORITES) priorite?: string;
  @IsOptional() @IsInt() assigned_to?: number;
}
