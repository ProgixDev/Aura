import { IsIn } from 'class-validator';
import { ROLES } from '../../capabilities';

export class UpdateAdminRoleDto {
  @IsIn(ROLES) role: string;
}
