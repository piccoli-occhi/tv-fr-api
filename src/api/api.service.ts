import { Injectable } from '@nestjs/common'

@Injectable()
export class ApiService {
    public index(): { status: string } {
        return { status: 'ok' }
    }
}
