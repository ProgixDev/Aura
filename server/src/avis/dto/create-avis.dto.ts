import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateAvisDto {
  @IsInt() praticien_id: number;
  @IsInt() @Min(1) @Max(5) note: number;
  @IsString() @MinLength(3) avis: string;
}
