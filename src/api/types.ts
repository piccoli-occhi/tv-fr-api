export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PaginatedResponse = {
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
