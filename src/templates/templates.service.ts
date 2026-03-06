import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../database/entities/notification-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
  ) {}

  async create(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  async findByName(name: string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { name } });
    if (!template) throw new NotFoundException(`Template "${name}" not found`);
    return template;
  }

  renderBody(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }
}
