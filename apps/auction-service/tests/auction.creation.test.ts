import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/infrastructure/database/postgres.js';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});

beforeEach(async () => {
  await pool.query('DELETE FROM auctions;');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

const USER_ID = '00000000-0000-0000-0000-000000000001';
const TOURNAMENT_ID = '00000000-0000-0000-0000-000000000002';

describe('POST /api/v1/auctions', () => {
  it('should create an auction and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.auction).toMatchObject({
      tournament_id: TOURNAMENT_ID,
      status: 'DRAFT',
      bid_increment: 1,
    });
    expect(body.data.auction.id).toEqual(expect.any(String));
    expect(body.data.auction.created_at).toEqual(expect.any(String));
    expect(body.data.auction.updated_at).toEqual(expect.any(String));
  });

  it('should always set status to DRAFT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.auction.status).toBe('DRAFT');
  });

  it('should default bid_increment to 1 when not provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.auction.bid_increment).toBe(1);
  });

  it('should accept a custom bid_increment', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID, bid_increment: 5.5 },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.auction.bid_increment).toBe(5.5);
  });

  it('should return 400 if tournament_id is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { bid_increment: 1 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if tournament_id is not a valid UUID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: 'not-a-uuid' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if bid_increment is zero', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID, bid_increment: 0 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 if unknown fields are sent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID, extra_field: 'not allowed' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 409 AUCTION_ALREADY_EXISTS for duplicate tournament_id', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('AUCTION_ALREADY_EXISTS');
  });

  it('should return 401 if x-user-id header is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      payload: { tournament_id: TOURNAMENT_ID },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/v1/auctions/:id', () => {
  it('should return an existing auction', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });
    const { id } = createResponse.json().data.auction as { id: string };

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/auctions/${id}`,
      headers: { 'x-user-id': USER_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.auction.id).toBe(id);
    expect(response.json().data.auction.tournament_id).toBe(TOURNAMENT_ID);
  });

  it('should return 404 for a non-existent auction', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auctions/00000000-0000-0000-0000-000000000099',
      headers: { 'x-user-id': USER_ID },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('AUCTION_NOT_FOUND');
  });
});

describe('PATCH /api/v1/auctions/:id', () => {
  it('should update bid_increment while DRAFT', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });
    const { id } = createResponse.json().data.auction as { id: string };

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/auctions/${id}`,
      headers: { 'x-user-id': USER_ID },
      payload: { bid_increment: 10 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.auction.bid_increment).toBe(10);
  });

  it('should return 400 if status field is sent in PATCH body', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auctions',
      headers: { 'x-user-id': USER_ID },
      payload: { tournament_id: TOURNAMENT_ID },
    });
    const { id } = createResponse.json().data.auction as { id: string };

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/auctions/${id}`,
      headers: { 'x-user-id': USER_ID },
      payload: { status: 'IN_PROGRESS' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 for a non-existent auction', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auctions/00000000-0000-0000-0000-000000000099',
      headers: { 'x-user-id': USER_ID },
      payload: { bid_increment: 5 },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('AUCTION_NOT_FOUND');
  });
});
