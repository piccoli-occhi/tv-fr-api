import type { Channel } from 'src/xml-tv/entities/channel.entity'

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
