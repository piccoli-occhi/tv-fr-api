import type { Channel } from 'src/xml-tv/entities/channel.entity'
import type { Program } from 'src/xml-tv/entities/program.entity'

// Common

type PaginatedResponse = {
    total: number
    totalPages: number
    count: number
    limit: number
}

export type PaginationQuery<SortField extends string = string> = {
    page?: number
    limit?: number
    sort?: SortField
    order?: 'asc' | 'desc'
}

export enum SortQuery {
    DESC = 'desc',
    ASC = 'asc',
}

// Channel

export enum ChannelSortField {
    DisplayName = 'displayName',
    XmlId = 'xmlId',
}

export type PaginatedChannelsResponse = PaginatedResponse & {
    channels: Channel[]
}

export type ChannelDetailsResponse = {
    channel: Channel
    currentProgram: Program | null
    dayPrograms: Program[]
}
