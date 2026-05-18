import { Controller, Get } from '@nestjs/common'
import { ApiService } from './api.service'

@Controller()
export class ApiController {
    public constructor(private readonly apiService: ApiService) {}

    @Get()
    public index(): { status: string } {
        return this.apiService.index()
    }
}
