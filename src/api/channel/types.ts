import type { ProgramSummary } from '@/api/program/types'
import { PaginatedResponse, SortQuery } from '@/api/types'

export enum ChannelSortField {
    DisplayName = 'displayName',
    XmlId = 'xmlId',
}

export class ChannelSummary {
    public id: string
    public displayName: string
    public xmlId: string
    public icon: string | null
}

export class ChannelWithCurrent extends ChannelSummary {
    public current: ProgramSummary | null
}

export class ChannelWithCurrentAndUrls extends ChannelWithCurrent {
    public urls: string[]
}

export class PaginatedChannelsResponse extends PaginatedResponse {
    public channels: ChannelWithCurrentAndUrls[]
}

export class ChannelDetailsResponse {
    public channel: ChannelSummary
    public currentProgram: ProgramSummary | null
    public dayPrograms: ProgramSummary[]
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
