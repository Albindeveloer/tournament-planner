import { auctionRepository, Auction } from './auction.repository.js';
import { AppError } from '../../middleware/app-error.js';

export type CreateAuctionInput = {
  tournament_id: string;
  bid_increment?: number;
};

export type UpdateAuctionInput = {
  bid_increment?: number;
};

export class AuctionService {
  async createAuction(input: CreateAuctionInput): Promise<Auction> {
    try {
      return await auctionRepository.create({
        tournamentId: input.tournament_id,
        bidIncrement: input.bid_increment ?? 1,
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new AppError(
          'AUCTION_ALREADY_EXISTS',
          409,
          'An auction already exists for this tournament',
        );
      }
      throw error;
    }
  }

  async getAuction(id: string): Promise<Auction> {
    const auction = await auctionRepository.findById(id);
    if (!auction) {
      throw new AppError('AUCTION_NOT_FOUND', 404, 'Auction not found');
    }
    return auction;
  }

  async updateAuction(id: string, input: UpdateAuctionInput): Promise<Auction> {
    const auction = await auctionRepository.findById(id);
    if (!auction) {
      throw new AppError('AUCTION_NOT_FOUND', 404, 'Auction not found');
    }

    if (auction.status !== 'DRAFT') {
      throw new AppError(
        'AUCTION_NOT_MODIFIABLE',
        409,
        'Auction can only be modified while in DRAFT status',
      );
    }

    const updateParams = input.bid_increment !== undefined
      ? { bidIncrement: input.bid_increment }
      : {};

    const updated = await auctionRepository.update(id, updateParams);

    return updated!;
  }
}

export const auctionService = new AuctionService();
