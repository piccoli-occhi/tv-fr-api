import { Controller, Get, HttpStatus, Param, Query, Req } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ApiQueryDetails } from '@/api/api.swagger'
import { ChannelService } from '@/api/channel/channel.service'
import {
    ChannelDetailsResponse,
    ChannelSortField,
    ChannelWithCurrent,
    PaginatedChannelsResponse,
    SearchChannelsQuery,
} from '@/api/channel/types'
import { type PaginationQuery, SortQuery } from '@/api/types'
import { Channel } from '@/xml-tv/entities/channel.entity'

type ParsedPagination = {
    page: number
    limit: number
    order: SortQuery
}

type PaginatedResponseOptions = {
    req: Request
    channels: ChannelWithCurrent[]
    rest: Omit<PaginatedChannelsResponse, 'channels'>
}

@ApiTags('Channels')
@ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
})
@Controller()
export class ChannelController {
    public constructor(private readonly channelService: ChannelService) {}

    @Get('channels')
    @ApiOperation({
        summary: 'List channels',
    })
    @ApiQuery(ApiQueryDetails.page)
    @ApiQuery(ApiQueryDetails.limit)
    @ApiQuery(
        ApiQueryDetails.sort({
            enum: ChannelSortField,
            example: ChannelSortField.DisplayName,
        }),
    )
    @ApiQuery(
        ApiQueryDetails.order({
            enum: SortQuery,
            example: SortQuery.ASC,
        }),
    )
    @ApiOkResponse({
        description: 'Paginated list of channels',
    })
    public async getChannels(@Req() req: Request, @Query() query: PaginationQuery<ChannelSortField>): Promise<PaginatedChannelsResponse> {
        const { page, limit, order } = this.parsePagination(query)
        const sort = Object.values(ChannelSortField).includes(query.sort as ChannelSortField)
            ? (query.sort as ChannelSortField)
            : ChannelSortField.DisplayName

        const { channels, ...rest } = await this.channelService.listChannels({
            page,
            limit,
            sort,
            order,
        })

        return this.toPaginatedResponse({
            req,
            channels,
            rest,
        })
    }

    @Get('channels/search')
    @ApiOperation({
        summary: 'Search channels by name',
    })
    @ApiQuery({
        name: 'q',
        required: true,
        type: String,
        description: 'Search term',
    })
    @ApiQuery(ApiQueryDetails.page)
    @ApiQuery(ApiQueryDetails.limit)
    @ApiOkResponse({
        description: 'Paginated matching channels',
    })
    public async searchChannels(
        @Req() req: Request,
        @Query() query: PaginationQuery & {
            q: string
        },
    ): Promise<PaginatedChannelsResponse> {
        const { page, limit } = this.parsePagination(query)
        const { channels, ...rest } = await this.channelService.searchChannels({
            q: query.q ?? '',
            page,
            limit,
        } satisfies SearchChannelsQuery)

        return this.toPaginatedResponse({
            req,
            channels,
            rest,
        })
    }

    @Get('channels/tnt')
    @ApiOperation({
        summary: 'List TNT free channels in broadcast order',
    })
    @ApiOkResponse({
        description: 'TNT channels in order',
        type: Channel,
        isArray: true,
    })
    public async getTntChannels(): Promise<ChannelWithCurrent[]> {
        return this.channelService.tntChannels()
    }

    @Get('channel/:id')
    @ApiOperation({
        summary: 'Get a channel with its current and daily programs',
    })
    @ApiParam({
        name: 'id',
        description: 'Channel UUID or xmlId',
    })
    @ApiQuery({
        name: 'day',
        required: false,
        type: String,
        description: 'DD/MM/YYYY (Europe/Paris)',
        example: '20/05/2026',
    })
    @ApiOkResponse({
        description: 'Channel with current and daily programs',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Channel not found',
    })
    public async getChannelDetails(@Param('id') channelId: string, @Query('day') programDay?: string): Promise<ChannelDetailsResponse> {
        return this.channelService.getChannelDetails({
            channelId,
            programDay,
        })
    }

    private parsePagination(query: PaginationQuery): ParsedPagination {
        return {
            page: Math.max(1, Number(query.page) || 1),
            limit: Math.min(100, Number(query.limit) || 20),
            order: query.order === SortQuery.DESC ? SortQuery.DESC : SortQuery.ASC,
        }
    }

    private toPaginatedResponse({ req, channels, rest }: PaginatedResponseOptions): PaginatedChannelsResponse {
        const baseUrl = this.getBaseUrl(req)

        return {
            ...rest,
            channels: channels.map((c) => ({
                ...c,
                urls: [
                    `${baseUrl}/${c.xmlId}`,
                    `${baseUrl}/${c.id}`,
                ],
            })),
        }
    }

    private getBaseUrl(req: Request): string {
        return `${req.protocol}://${req.get('Host')}/api/channels`
    }
}
