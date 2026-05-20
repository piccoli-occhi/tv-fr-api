import { TZDate } from '@date-fns/tz'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { And, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Repository } from 'typeorm'
import { Channel } from '../../xml-tv/entities/channel.entity'
import { Program } from '../../xml-tv/entities/program.entity'
import { type ChannelDetailsResponse, ChannelSortField, SortQuery } from '../types'

type ListChannelsQuery = {
    page: number
    limit: number
    sort: ChannelSortField
    order: SortQuery
}

type ListChannelsResult = {
    channels: Channel[]
    total: number
    totalPages: number
    count: number
    limit: number
}

type GetChannelDetailsQuery = {
    channelId: string
    programDay?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class ChannelService {
    public constructor(
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        @InjectRepository(Program)
        private readonly programRepository: Repository<Program>,
    ) {}

    public async listChannels(query: ListChannelsQuery): Promise<ListChannelsResult> {
        const [channels, total] = await this.channelRepository.findAndCount({
            order: { [query.sort]: query.order.toUpperCase() as 'ASC' | 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        })

        return {
            channels,
            total,
            totalPages: Math.ceil(total / query.limit),
            count: channels.length,
            limit: query.limit,
        }
    }

    public async getChannelDetails(query: GetChannelDetailsQuery): Promise<ChannelDetailsResponse> {
        const channel = await this.findChannel(query.channelId)

        const timezone = process.env.TZ || 'Europe/Paris'
        const targetDay = query.programDay || new Intl.DateTimeFormat('fr-FR', { timeZone: timezone }).format(new Date())
        const { dayStart, dayEnd } = this.parseDayBoundaries(targetDay, timezone)
        const now = new Date()

        const [currentProgram, dayPrograms] = await Promise.all([
            this.programRepository.findOne({
                where: {
                    channelXmlId: channel.xmlId,
                    startAt: LessThanOrEqual(now),
                    stopAt: MoreThan(now),
                },
            }),
            this.programRepository.find({
                where: {
                    channelXmlId: channel.xmlId,
                    startAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
                },
                order: { startAt: 'ASC' },
            }),
        ])

        return { channel, currentProgram, dayPrograms }
    }

    private async findChannel(channelId: string): Promise<Channel> {
        const where = UUID_REGEX.test(channelId) ? { id: channelId } : { xmlId: channelId }
        const channel = await this.channelRepository.findOne({ where })

        if (channel) {
            return channel
        }

        throw new NotFoundException(`Channel not found: ${channelId}`)
    }

    private parseDayBoundaries(day: string, timezone: string): { dayStart: Date; dayEnd: Date } {
        const [d, m, y] = day.split('/').map(Number)

        return {
            dayStart: new TZDate(y, m - 1, d, 0, 0, 0, timezone),
            dayEnd: new TZDate(y, m - 1, d + 1, 0, 0, 0, timezone),
        }
    }
}
