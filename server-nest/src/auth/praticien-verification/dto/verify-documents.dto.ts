import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsOptional, IsString, ValidateIf, ValidateNested,
} from 'class-validator';

export class VerifyDocumentItemDto {
  @IsInt() id: number;
  @IsIn(['valide', 'rejete']) statut: string;
  @ValidateIf((o) => o.statut === 'rejete')
  @IsString()
  commentaire_rejet?: string;
}

export class VerifyDocumentsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => VerifyDocumentItemDto)
  documents: VerifyDocumentItemDto[];
  @IsOptional() @IsString() commentaire_global?: string;
}
