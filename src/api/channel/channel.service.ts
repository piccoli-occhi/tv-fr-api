import { TZDate } from '@date-fns/tz'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { And, ILike, In, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Repository } from 'typeorm'
import {
    ChannelDetailsResponse,
    ChannelWithCurrent,
    GetChannelDetailsQuery,
    ListChannelsQuery,
    ListChannelsResult,
    SearchChannelsQuery,
} from '@/api/channel/types'
import { UUID_REGEX } from '@/api/types'
import { Channel } from '@/xml-tv/entities/channel.entity'
import { Program } from '@/xml-tv/entities/program.entity'

export const TNT_CHANNELS = [
    'TF1',
    'France 2',
    'France 3',
    'France 4',
    'France 5',
    'M6',
    'Arte',
    'LCP',
    'W9',
    'TMC',
    'TFX',
    'Gulli',
    'BFM TV',
    'CNEWS',
    'LCI',
    'Franceinfo',
    'CSTAR',
    'T18',
    'NOVO19',
    'TF1 Séries Films',
    "L'Équipe",
    '6ter',
    'RMC Story',
    'RMC Découverte',
    'Chérie 25',
    'Paris Première',
]

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
            order: {
                [query.sort]: query.order.toUpperCase() as 'ASC' | 'DESC',
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        })

        return {
            channels: await this.getChannelsWithPrograms(channels),
            total,
            totalPages: Math.ceil(total / query.limit),
            count: channels.length,
            limit: query.limit,
        }
    }

    public async searchChannels(query: SearchChannelsQuery): Promise<ListChannelsResult> {
        const [channels, total] = await this.channelRepository.findAndCount({
            where: {
                displayName: ILike(`%${query.q}%`),
            },
            order: {
                displayName: 'ASC',
            },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        })

        return {
            channels: await this.getChannelsWithPrograms(channels),
            total,
            totalPages: Math.ceil(total / query.limit),
            count: channels.length,
            limit: query.limit,
        }
    }

    public async tntChannels(): Promise<ChannelWithCurrent[]> {
        const channels = await this.channelRepository.findBy({
            displayName: In(TNT_CHANNELS),
        })

        const sorted = channels.sort((a, b) => TNT_CHANNELS.indexOf(a.displayName) - TNT_CHANNELS.indexOf(b.displayName))

        return this.getChannelsWithPrograms(sorted)
    }

    public async getChannelDetails(query: GetChannelDetailsQuery): Promise<ChannelDetailsResponse> {
        const channel = await this.findChannel(query.channelId)

        const timezone = process.env.TZ || 'Europe/Paris'
        const targetDay =
            query.programDay ||
            new Intl.DateTimeFormat('fr-FR', {
                timeZone: timezone,
            }).format(new Date())
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
                order: {
                    startAt: 'ASC',
                },
            }),
        ])

        return {
            channel,
            currentProgram,
            dayPrograms,
        }
    }

    private async getChannelsWithPrograms(channels: Channel[]): Promise<ChannelWithCurrent[]> {
        if (channels.length === 0) return []

        const now = new Date()
        const currentPrograms = await this.programRepository.find({
            where: {
                channelXmlId: In(channels.map((c) => c.xmlId)),
                startAt: LessThanOrEqual(now),
                stopAt: MoreThan(now),
            },
        })

        const byXmlId = new Map(
            currentPrograms.map((p) => [
                p.channelXmlId,
                p,
            ]),
        )

        return channels.map((channel) => ({
            ...channel,
            current: byXmlId.get(channel.xmlId) ?? null,
        }))
    }

    private async findChannel(channelId: string): Promise<Channel> {
        const where = UUID_REGEX.test(channelId)
            ? {
                  id: channelId,
              }
            : {
                  xmlId: channelId,
              }
        const channel = await this.channelRepository.findOne({
            where,
        })

        if (channel) {
            return channel
        }

        throw new NotFoundException(`Channel not found: ${channelId}`)
    }

    private parseDayBoundaries(
        day: string,
        timezone: string,
    ): {
        dayStart: Date
        dayEnd: Date
    } {
        const [d, m, y] = day.split('/').map(Number)

        return {
            dayStart: new TZDate(y, m - 1, d, 0, 0, 0, timezone),
            dayEnd: new TZDate(y, m - 1, d + 1, 0, 0, 0, timezone),
        }
    }
}
