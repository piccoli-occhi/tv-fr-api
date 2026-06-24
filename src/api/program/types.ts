import type { ChannelSummary } from '@/api/channel/types'
import { PaginatedResponse, SortQuery } from '@/api/types'
import type { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'

export type ListProgramsQuery = {
    page: number
    limit: number
    sort: ProgramSortField
    order: SortQuery
}

export type ListProgramsByDayQuery = {
    day: Date
    page: number
    limit: number
}

export enum ProgramSortField {
    StartAt = 'startAt',
    Title = 'title',
}

export class ProgramSummary {
    public id: string
    public title: string
    public subTitle: string | null
    public desc: string | null
    public xmlStart: string
    public xmlStop: string
    public startAt: Date
    public stopAt: Date
    public ratingIcon: string | null
    public icon: string | null
    public episode: string | null
    public rating: string | null
    public categories: string[]
    public credits: string[]
    public channelXmlId: string
    public details: TmdbDetails | null
}

export class ProgramWithChannel extends ProgramSummary {
    public channel: ChannelSummary
}

export class ProgramDetails extends ProgramSummary {
    public channelDisplayName: string
}

export class PaginatedProgramsResponse extends PaginatedResponse {
    public programs: ProgramDetails[]
}
