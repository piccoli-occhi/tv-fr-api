import { Injectable } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Channel } from '../xml-tv/entities/channel.entity'
import { ChannelSortField, SortQuery } from './types'

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

@Injectable()
export class ApiService {
    public constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
    ) {}

    public async getStatus(): Promise<{ status: string; database: string }> {
        try {
            await this.dataSource.query('SELECT 1')

            return { status: 'ok', database: 'ok' }
        } catch {
            return { status: 'degraded', database: 'down' }
        }
    }

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
}
