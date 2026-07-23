import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsString, MaxLength,
} from 'class-validator';

export class CreatePraticienEventDto {
  @IsString() @MaxLength(255) titre: string;
  @IsString() type: string;
  @IsArray() @ArrayMinSize(1) @IsDateString({}, { each: true }) dates: string[];
  @IsString() lieu: string;
  @Type(() => Number) @IsNumber() prix: number;
  @Type(() => Number) @IsInt() nombre_places: number;
  @IsString() description: string;
}
