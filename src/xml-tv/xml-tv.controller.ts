import { Controller, Get, Logger, UseInterceptors } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import { HeaderInterceptor } from './xml-tv.interceptor'
import { XmlTvService } from './xml-tv.service'

@ApiTags('xml-tv')
@Controller('xml-tv')
export class XmlTvController {
    public constructor(private readonly xmlTvService: XmlTvService) {}

    private readonly logger = new Logger(XmlTvController.name)

    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    @UseInterceptors(HeaderInterceptor)
    @ApiOperation({
        summary: 'Start cront to download new xml and update database',
        description: 'Require x-forwarded-for header with valid value to start cron',
    })
    @ApiHeader({
        name: 'x-forwarded-for',
        required: true,
        description: 'Header to prevent running cron',
    })
    @Get(`/run`)
    public startJob() {
        this.logger.log(`action=start_job, timezone=${process.env.TZ}`)

        this.downloadXML()

        return {
            status: 'ok',
        }
    }

    public async downloadXML() {
        try {
            const filePath = await this.xmlTvService.downloadXML()
            const result = await this.xmlTvService.parseXML(filePath)

            await this.xmlTvService.clean()

            await this.xmlTvService.addChannels(result.channels)
            await this.xmlTvService.addPrograms(result.programs)
        } catch (error) {
            this.logger.error(`action=download_xml, status=failed, reason=${(error as Error).message}`)
        }
    }
}
