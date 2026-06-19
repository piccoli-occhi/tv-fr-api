import { Controller, Get, HttpStatus } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { StatusResponse } from '@/api/types'
import { ApiService } from './api.service'

@ApiTags('Status')
@ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
})
@Controller()
export class ApiController {
    public constructor(private readonly apiService: ApiService) {}

    @Get('status')
    @ApiOperation({
        summary: 'Health check',
    })
    @ApiOkResponse({
        description: 'Service status',
        type: StatusResponse,
        example: {
            status: 'ok',
            database: 'ok',
        },
    })
    public status(): Promise<StatusResponse> {
        return this.apiService.getStatus()
    }
}
