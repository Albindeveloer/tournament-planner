import { pool } from '../../infrastructure/database/postgres.js';

export type Auction = {
  id: string;
  tournament_id: string;
  status: string;
  bid_increment: number;
  created_at: Date;
  updated_at: Date;
};

type RawAuctionRow = Omit<Auction, 'bid_increment'> & { bid_increment: string };

export type CreateAuctionParams = {
  tournamentId: string;
  bidIncrement: number;
};

export type UpdateAuctionParams = {
  bidIncrement?: number;
};

function parseAuction(row: RawAuctionRow): Auction {
  return {
    ...row,
    bid_increment: parseFloat(row.bid_increment),
  };
}

export class AuctionRepository {
  async create(params: CreateAuctionParams): Promise<Auction> {
    const result = await pool.query<RawAuctionRow>(
      `INSERT INTO auctions (tournament_id, bid_increment)
       VALUES ($1, $2)
       RETURNING *`,
      [params.tournamentId, params.bidIncrement],
    );
    return parseAuction(result.rows[0]!);
  }

  async findById(id: string): Promise<Auction | null> {
    const result = await pool.query<RawAuctionRow>(
      `SELECT * FROM auctions WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? parseAuction(row) : null;
  }

  async findByTournamentId(tournamentId: string): Promise<Auction | null> {
    const result = await pool.query<RawAuctionRow>(
      `SELECT * FROM auctions WHERE tournament_id = $1`,
      [tournamentId],
    );
    const row = result.rows[0];
    return row ? parseAuction(row) : null;
  }

  async update(id: string, params: UpdateAuctionParams): Promise<Auction | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, value: unknown): void => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (params.bidIncrement !== undefined) addField('bid_increment', params.bidIncrement);

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query<RawAuctionRow>(
      `UPDATE auctions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values,
    );
    const row = result.rows[0];
    return row ? parseAuction(row) : null;
  }
}

export const auctionRepository = new AuctionRepository();
