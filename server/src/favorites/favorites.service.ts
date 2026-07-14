import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../database/entities/favorite.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  async list(client: Client) {
    const rows = await this.favorites.createQueryBuilder('f')
      .leftJoinAndSelect('f.praticien', 'praticien')
      .where('f.client_id = :cid', { cid: client.id })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return success(rows);
  }

  async add(client: Client, dto: CreateFavoriteDto) {
    // Idempotent: adding an already-favorited praticien is a success, not a
    // conflict — check-then-insert rather than catching the unique-constraint
    // violation, which would differ between MySQL and the e2e suite's SQLite
    // driver and is exactly the kind of environment-coupling worth avoiding.
    const existing = await this.favorites.findOneBy({
      client_id: client.id, praticien_id: dto.praticien_id,
    });
    if (existing) return success(existing, 'Praticien déjà en favoris');
    const saved = await this.favorites.save({
      client_id: client.id, praticien_id: dto.praticien_id,
    });
    return success(saved, 'Praticien ajouté aux favoris');
  }

  async remove(client: Client, praticienId: number) {
    const existing = await this.favorites.findOneBy({
      client_id: client.id, praticien_id: praticienId,
    });
    if (!existing) {
      throw new NotFoundException({ status: 'error', message: 'Favori non trouvé' });
    }
    await this.favorites.delete({ client_id: client.id, praticien_id: praticienId });
    return success(undefined, 'Praticien retiré des favoris');
  }
}
