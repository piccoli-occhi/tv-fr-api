import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { endOfDay, startOfDay } from 'date-fns'
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm'
import { ProgramNotFoundException } from '@/api/exceptions'
import { Program } from '@/xml-tv/entities/program.entity'
import { UUID_REGEX } from '../types'
import { ListProgramsByDayQuery, ListProgramsQuery, PaginatedProgramsResponse, ProgramWithChannel } from './types'

@Injectable()
export class ProgramService {
    public constructor(
        @InjectRepository(Program)
        private readonly programRepository: Repository<Program>,
    ) {}

    public async getProgramById(id: string): Promise<ProgramWithChannel> {
        const where = UUID_REGEX.test(id)
            ? {
                  id,
              }
            : {
                  xmlId: id,
              }
        const program = await this.programRepository.findOne({
            where,
            relations: {
                channel: true,
            },
        })

        if (program) {
            return program
        }

        throw new ProgramNotFoundException(id)
    }

    public async listCurrentPrograms(query: ListProgramsQuery): Promise<PaginatedProgramsResponse> {
        const now = new Date()
        const [programs, total] = await this.programRepository.findAndCount({
            where: {
                startAt: LessThanOrEqual(now),
                stopAt: MoreThan(now),
            },
            order: {
                [query.sort]: query.order.toUpperCase() as 'ASC' | 'DESC',
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            relations: {
                channel: true,
            },
        })

        return {
            programs: programs.map((p) => ({
                ...p,
                channelDisplayName: p.channel.displayName,
            })),
            total,
            totalPages: Math.ceil(total / query.limit),
            count: programs.length,
            limit: query.limit,
        }
    }

    public async listProgramsByDay(query: ListProgramsByDayQuery): Promise<PaginatedProgramsResponse> {
        const dayStart = startOfDay(query.day)
        const dayEnd = endOfDay(query.day)
        const [programs, total] = await this.programRepository.findAndCount({
            where: {
                startAt: LessThanOrEqual(dayEnd),
                stopAt: MoreThan(dayStart),
            },
            order: {
                startAt: 'ASC',
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            relations: {
                channel: true,
            },
        })

        return {
            programs: programs.map((p) => ({
                ...p,
                channelDisplayName: p.channel.displayName,
            })),
            total,
            totalPages: Math.ceil(total / query.limit),
            count: programs.length,
            limit: query.limit,
        }
    }
}
