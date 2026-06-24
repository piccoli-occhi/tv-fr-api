export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class PaginatedResponse {
    public total: number
    public totalPages: number
    public count: number
    public limit: number
}

export class StatusResponse {
    public status: string
    public database: string
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
