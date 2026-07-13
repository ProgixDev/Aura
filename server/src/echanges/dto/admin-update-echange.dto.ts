import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class AdminUpdateEchangeDto {
  @IsOptional() @IsIn(['en_attente', 'lu', 'en_cours', 'traite', 'archive', 'signale'])
  statut?: string;
  @IsOptional() @IsIn(['basse', 'moyenne', 'haute', 'urgente'])
  priorite?: string;
  @IsOptional() @IsString() reponse_admin?: string;
  @IsOptional() @IsInt() traite_par?: number;
}
