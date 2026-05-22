import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { type PaginationQuery, SortQuery } from '../types'
import { ChannelService } from './channel.service'
import { ChannelDetailsResponse, ChannelSortField, PaginatedChannelsResponse } from './types'

type ParsedPagination = {
    page: number
    limit: number
    order: SortQuery
}

@ApiTags('Channels')
@Controller()
export class ChannelController {
    public constructor(private readonly channelService: ChannelService) {}

    @Get('channels')
    @ApiOperation({ summary: 'List channels', description: 'Returns a paginated list of channels sorted by a given field.' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (min 1)', example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100, default 20)', example: 20 })
    @ApiQuery({
        name: 'sort',
        required: false,
        enum: ChannelSortField,
        description: 'Field to sort by',
        example: ChannelSortField.DisplayName,
    })
    @ApiQuery({ name: 'order', required: false, enum: SortQuery, description: 'Sort direction', example: SortQuery.ASC })
    @ApiOkResponse({ description: 'Paginated list of channels' })
    public async channels(@Req() req: Request, @Query() query: PaginationQuery<ChannelSortField>): Promise<PaginatedChannelsResponse> {
        const { page, limit, order } = this.parsePagination(query)
        const sort = Object.values(ChannelSortField).includes(query.sort as ChannelSortField)
            ? (query.sort as ChannelSortField)
            : ChannelSortField.DisplayName

        const { channels, ...rest } = await this.channelService.listChannels({ page, limit, sort, order })
        const baseUrl = this.getBaseUrl(req)

        return {
            ...rest,
            channels: channels.map((c) => ({
                ...c,
                urls: [`${baseUrl}/${c.xmlId}`, `${baseUrl}/${c.id}`],
            })),
        }
    }

    @Get('channels/:id')
    @ApiOperation({
        summary: 'Get a channel with its current and daily programs',
        description:
            'Lookup a channel by its UUID or its xmlId. Returns the channel, the currently airing program (or null) and all programs of the given day (default today, FR timezone).',
    })
    @ApiParam({ name: 'id', description: 'Channel UUID or xmlId' })
    @ApiQuery({
        name: 'day',
        required: false,
        type: String,
        description: 'Target day as DD/MM/YYYY in Europe/Paris timezone. Defaults to today.',
        example: '20/05/2026',
    })
    @ApiOkResponse({ description: 'Channel details with current and daily programs' })
    public async channelDetails(@Param('id') channelId: string, @Query('day') programDay?: string): Promise<ChannelDetailsResponse> {
        return this.channelService.getChannelDetails({ channelId, programDay })
    }

    private parsePagination(query: PaginationQuery): ParsedPagination {
        return {
            page: Math.max(1, Number(query.page) || 1),
            limit: Math.min(100, Number(query.limit) || 20),
            order: query.order === SortQuery.DESC ? SortQuery.DESC : SortQuery.ASC,
        }
    }

    private getBaseUrl(req: Request): string {
        return `${req.protocol}://${req.get('Host')}/api/channels`
    }
}
