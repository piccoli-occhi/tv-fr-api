import { Controller, Get, Query } from '@nestjs/common'
import { ApiService } from './api.service'
import { ChannelSortField, type PaginatedChannelsResponse, type PaginationQuery, SortQuery } from './types'

type ParsedPagination = {
    page: number
    limit: number
    order: SortQuery
}

@Controller()
export class ApiController {
    public constructor(private readonly apiService: ApiService) {}

    @Get('status')
    public status(): Promise<{ status: string; database: string }> {
        return this.apiService.getStatus()
    }

    @Get('channels')
    public async channels(@Query() query: PaginationQuery<ChannelSortField>): Promise<PaginatedChannelsResponse> {
        const { page, limit, order } = this.parsePagination(query)
        const sort = Object.values(ChannelSortField).includes(query.sort as ChannelSortField)
            ? (query.sort as ChannelSortField)
            : ChannelSortField.DisplayName

        return this.apiService.listChannels({ page, limit, sort, order })
    }

    private parsePagination(query: PaginationQuery): ParsedPagination {
        return {
            page: Math.max(1, Number(query.page) || 1),
            limit: Math.min(100, Number(query.limit) || 20),
            order: query.order === SortQuery.DESC ? SortQuery.DESC : SortQuery.ASC,
        }
    }
}
