import type { Channel } from 'src/xml-tv/entities/channel.entity'
import type { Program } from 'src/xml-tv/entities/program.entity'
import { PaginatedResponse, SortQuery } from '../types'

export enum ChannelSortField {
    DisplayName = 'displayName',
    XmlId = 'xmlId',
}

export type PaginatedChannelsResponse = PaginatedResponse & {
    channels: Array<Channel & { urls: string[] }>
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
    channels: Channel[]
    total: number
    totalPages: number
    count: number
    limit: number
}

export type GetChannelDetailsQuery = {
    channelId: string
    programDay?: string
}
