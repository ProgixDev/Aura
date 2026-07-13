import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Request } from 'express';

export function parsePagination(
  query: Record<string, any>,
  defaultPerPage: number,
) {
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(String(query.per_page), 10) || defaultPerPage),
  );
  return { page, perPage };
}

export async function paginateQb<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  perPage: number,
) {
  const [data, total] = await qb
    .skip((page - 1) * perPage)
    .take(perPage)
    .getManyAndCount();
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
    lastPage,
  };
}

export function paginationUrls(req: Request, page: number, lastPage: number) {
  const base =
    `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`.replace(
      /\/$/,
      '',
    );
  return {
    next_page_url: page < lastPage ? `${base}?page=${page + 1}` : null,
    prev_page_url: page > 1 ? `${base}?page=${page - 1}` : null,
  };
}
