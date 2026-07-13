import { IsString, MaxLength } from 'class-validator';

export class CreateDisciplineDto {
  @IsString() @MaxLength(255) nom: string;
  @IsString() @MaxLength(255) tonalite: string;
  @IsString() @MaxLength(255) glyphe: string;
  @IsString() @MaxLength(255) accroche: string;
}
