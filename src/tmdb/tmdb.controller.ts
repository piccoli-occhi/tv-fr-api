import { Controller, Get, HttpCode, HttpException, HttpStatus, Query, UseInterceptors } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { HeaderInterceptor } from '@/xml-tv/xml-tv.interceptor'
import { TmdbService } from './tmdb.service'

@ApiTags('TMDB')
@Controller('tmdb')
export class TmdbController {
    public constructor(private readonly tmdbService: TmdbService) {}

    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    @Get('/init')
    @UseInterceptors(HeaderInterceptor)
    @ApiOperation({
        summary: 'Initialize TMDB details for all programs',
    })
    @ApiOkResponse({
        description: 'Initialization triggered',
    })
    public handleNewPrograms() {
        this.tmdbService.handleNewPrograms()
    }

    @Cron(CronExpression.EVERY_MINUTE)
    @Get(`/sync`)
    @ApiOperation({
        summary: 'Sync TMDB scores for current programs',
    })
    @ApiQuery({
        name: 'title',
        required: false,
        type: String,
        description: 'Filter by program title',
    })
    @ApiOkResponse({
        description: 'Sync completed',
    })
    @HttpCode(HttpStatus.OK)
    public syncProgramScores(@Query('title') title?: string) {
        try {
            if (title) {
                this.tmdbService.syncOneProgram(title)
            } else {
                this.tmdbService.syncTntPrograms()
                this.tmdbService.syncOtherPrograms()
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
