import { parsePagination, paginateQb, paginationUrls } from './pagination';
import { SelectQueryBuilder } from 'typeorm';
import { Request } from 'express';

describe('parsePagination', () => {
  it('uses the default per_page when unspecified', () => {
    expect(parsePagination({}, 15)).toEqual({ page: 1, perPage: 15 });
  });

  it('honors explicit page and per_page', () => {
    expect(parsePagination({ page: '2', per_page: '30' }, 15)).toEqual({
      page: 2,
      perPage: 30,
    });
  });

  it('caps per_page at 100', () => {
    expect(parsePagination({ per_page: '999999' }, 15)).toEqual({
      page: 1,
      perPage: 100,
    });
  });

  it('floors page and per_page at 1 for garbage/negative input', () => {
    // Non-numeric input falls back to the default per_page.
    expect(parsePagination({ page: '-5', per_page: 'nope' }, 15)).toEqual({
      page: 1,
      perPage: 15,
    });
    // A negative-but-numeric value is not "falsy" to parseInt, so it's floored at 1 directly.
    expect(parsePagination({ page: 'abc', per_page: '-10' }, 15)).toEqual({
      page: 1,
      perPage: 1,
    });
  });
});

describe('paginateQb', () => {
  function fakeQb(items: unknown[], total: number) {
    return {
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    } as unknown as SelectQueryBuilder<any>;
  }

  it('computes last_page from total and per_page', async () => {
    const qb = fakeQb(new Array(3).fill({}), 10);
    const result = await paginateQb(qb, 1, 3);
    expect(result.pagination).toEqual({
      current_page: 1,
      last_page: 4,
      per_page: 3,
      total: 10,
    });
    expect(result.lastPage).toBe(4);
  });

  it('returns last_page 1 (not 0) for an empty result set', async () => {
    const qb = fakeQb([], 0);
    const result = await paginateQb(qb, 1, 10);
    expect(result.pagination.last_page).toBe(1);
    expect(result.pagination.total).toBe(0);
  });
});

describe('paginationUrls', () => {
  function fakeReq(): Request {
    return {
      protocol: 'http',
      baseUrl: '',
      path: '/items',
      get: () => 'localhost:3000',
    } as unknown as Request;
  }

  it('page 1 of 3: no prev, has next', () => {
    const urls = paginationUrls(fakeReq(), 1, 3);
    expect(urls.prev_page_url).toBeNull();
    expect(urls.next_page_url).toBe('http://localhost:3000/items?page=2');
  });

  it('page 3 of 3: has prev, no next', () => {
    const urls = paginationUrls(fakeReq(), 3, 3);
    expect(urls.prev_page_url).toBe('http://localhost:3000/items?page=2');
    expect(urls.next_page_url).toBeNull();
  });

  it('single page (1 of 1): neither prev nor next', () => {
    const urls = paginationUrls(fakeReq(), 1, 1);
    expect(urls.prev_page_url).toBeNull();
    expect(urls.next_page_url).toBeNull();
  });
});
