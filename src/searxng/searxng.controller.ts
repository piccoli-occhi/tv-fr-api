import { Controller, Get, UseInterceptors } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
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
    @ApiOkResponse({
        description: 'Sync triggered',
    })
    public syncPosters(): void {
        this.searxngService.syncPosters()
    }
}
