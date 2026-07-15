import { IsString, MinLength } from 'class-validator';

export class ResolveDisputeDto {
  @IsString() @MinLength(3) resolution_notes: string;
}
