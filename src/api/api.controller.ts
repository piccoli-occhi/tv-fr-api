import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ApiService } from './api.service'

@ApiTags('Status')
@Controller()
export class ApiController {
    public constructor(private readonly apiService: ApiService) {}

    @Get('status')
    @ApiOperation({
        summary: 'Health check',
    })
    @ApiOkResponse({
        description: 'Service status',
        example: {
            status: 'ok',
            database: 'ok',
        },
    })
    public status(): Promise<{
        status: string
        database: string
    }> {
        return this.apiService.getStatus()
    }
}
