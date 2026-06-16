import { Controller, Get, HttpCode, HttpException, HttpStatus, Query, UseInterceptors } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { HeaderInterceptor } from '@/xml-tv/xml-tv.interceptor'
import { SearxngService } from './searxng.service'

@ApiTags('SearXNG')
@Controller('searxng')
export class SearxngController {
    public constructor(private readonly searxngService: SearxngService) {}

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    @Get('/sync')
    @UseInterceptors(HeaderInterceptor)
    @ApiOperation({
        summary: 'Sync poster images from SearXNG for programs without poster',
    })
    @ApiQuery({
        name: 'title',
        required: false,
        type: String,
        description: 'Filter by program title',
    })
    @ApiOkResponse({
        description: 'Sync triggered',
    })
    @HttpCode(HttpStatus.OK)
    public syncPosters(@Query('title') title?: string) {
        try {
            if (title) {
                this.searxngService.syncOnePoster(title)
            } else {
                this.searxngService.syncPosters()
            }

            return {
                status: 'ok',
            }
        } catch {
            throw new HttpException(
                {
                    status: 'failed',
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            )
        }
    }
}
