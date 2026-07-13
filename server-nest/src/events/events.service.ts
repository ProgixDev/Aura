import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Request } from 'express';
import { Event } from '../database/entities/event.entity';
import { EventPraticien } from '../database/entities/event-praticien.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreateEventDto, EventAnimateurDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(EventPraticien) private readonly links: Repository<EventPraticien>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private async findOr404(id: number): Promise<Event> {
    const event = await this.events.findOneBy({ id });
    if (!event) throw new NotFoundException({ status: 'error', message: 'Événement non trouvé' });
    return event;
  }

  private async assertAnimateursExist(animateurs: EventAnimateurDto[]) {
    const ids = animateurs.map((a) => a.id);
    const found = await this.praticiens.findBy({ id: In(ids) });
    const foundIds = new Set(found.map((p) => p.id));
    const errors: Record<string, string[]> = {};
    animateurs.forEach((a, i) => {
      if (!foundIds.has(a.id)) errors[`animateurs.${i}.id`] = ['Le praticien sélectionné est invalide.'];
    });
    if (Object.keys(errors).length) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation', errors,
      });
    }
  }

  // Laravel serializes belongsToMany as praticien objects carrying a `pivot` key
  private async withAnimateurs(event: Event) {
    const links = await this.links.find({
      where: { event_id: event.id }, relations: { praticien: true },
    });
    return {
      ...event,
      animateurs: links.map((l) => ({
        ...l.praticien,
        pivot: {
          event_id: l.event_id, praticien_id: l.praticien_id, role: l.role,
          created_at: l.created_at, updated_at: l.updated_at,
        },
      })),
    };
  }

  private async syncAnimateurs(eventId: number, animateurs: EventAnimateurDto[]) {
    await this.links.delete({ event_id: eventId });
    for (const a of animateurs) {
      await this.links.save({ event_id: eventId, praticien_id: a.id, role: a.role ?? 'animateur' });
    }
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.events.createQueryBuilder('e'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateEventDto) {
    if (dto.animateurs?.length) await this.assertAnimateursExist(dto.animateurs);
    const { animateurs, ...fields } = dto;
    const event = await this.events.save({ ...fields });
    if (animateurs?.length) await this.syncAnimateurs(event.id, animateurs);
    return success(await this.withAnimateurs(event));
  }

  async show(id: number) {
    const event = await this.findOr404(id);
    return success(await this.withAnimateurs(event));
  }

  async update(id: number, dto: UpdateEventDto) {
    await this.findOr404(id);
    if (dto.animateurs?.length) await this.assertAnimateursExist(dto.animateurs);
    const { animateurs, ...fields } = dto;
    if (Object.keys(fields).length) await this.events.update(id, fields);
    if (animateurs !== undefined) await this.syncAnimateurs(id, animateurs ?? []);
    return success(
      await this.withAnimateurs(await this.findOr404(id)),
      'Événement mis à jour avec succès',
    );
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.links.delete({ event_id: id });
    await this.events.delete(id);
    return success(undefined, 'Événement supprimé avec succès');
  }
}
