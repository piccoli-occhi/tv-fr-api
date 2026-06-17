import { PaginatedResponse, SortQuery } from '@/api/types'
import { Program } from '@/xml-tv/entities/program.entity'

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

export type ProgramDetails = Omit<Program, 'xmlStart' | 'xmlStop'> & {
    channelDisplayName: string
    details?: unknown
}

export type PaginatedProgramsResponse = PaginatedResponse & {
    programs: ProgramDetails[]
}
