import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateAvisDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) note?: number;
  @IsOptional() @IsString() @MinLength(3) avis?: string;
}
