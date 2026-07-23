import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminContactDto {
  @IsIn(['praticien', 'client']) recipient_type: 'praticien' | 'client';
  @IsInt() recipient_id: number;
  @IsString() @MaxLength(255) @MinLength(1) subject: string;
  @IsString() @MinLength(1) message: string;
}
