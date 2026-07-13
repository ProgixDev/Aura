import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';

export class EventAnimateurDto {
  @IsInt() id: number;
  @IsOptional() @IsString() role?: string;
}

export class CreateEventDto {
  @IsString() @MaxLength(255) titre: string;
  @IsString() type: string;
  @IsArray() @ArrayMinSize(1) @IsDateString({}, { each: true }) dates: string[];
  @IsString() lieu: string;
  @Type(() => Number) @IsNumber() prix: number;
  @Type(() => Number) @IsInt() nombre_places: number;
  @IsString() description: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EventAnimateurDto)
  animateurs?: EventAnimateurDto[];
}
