import { PaginatedResponse, SortQuery } from '@/api/types'
import type { Channel } from '@/xml-tv/entities/channel.entity'
import type { Program } from '@/xml-tv/entities/program.entity'

export enum ChannelSortField {
    DisplayName = 'displayName',
    XmlId = 'xmlId',
}

export type ChannelWithCurrent = Channel & {
    current: Program | null
}

export type PaginatedChannelsResponse = PaginatedResponse & {
    channels: Array<
        ChannelWithCurrent & {
            urls: string[]
        }
    >
}

export type ChannelDetailsResponse = {
    channel: Channel
    currentProgram: Program | null
    dayPrograms: Program[]
}

export type ListChannelsQuery = {
    page: number
    limit: number
    sort: ChannelSortField
    order: SortQuery
}

export type ListChannelsResult = {
    channels: ChannelWithCurrent[]
    total: number
    totalPages: number
    count: number
    limit: number
}

export type GetChannelDetailsQuery = {
    channelId: string
    programDay?: string
}

export type SearchChannelsQuery = {
    q: string
    page: number
    limit: number
}
