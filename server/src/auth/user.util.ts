import { User } from '../database/entities/user.entity';

export function sanitizeUser(user: User) {
  const { password, remember_token, ...rest } = user;
  return rest;
}

export function pickUser(user: User, keys: (keyof User)[]) {
  return Object.fromEntries(keys.map((k) => [k, user[k]]));
}
