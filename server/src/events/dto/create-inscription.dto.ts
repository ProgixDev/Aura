import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateInscriptionDto {
  // Defaults to 1 in the service when omitted. Capped at 10 to stop a single
  // registration from silently claiming an event's whole capacity.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10)
  nombre_places?: number;
}
