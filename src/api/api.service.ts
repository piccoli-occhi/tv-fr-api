import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { StatusResponse } from '@/api/types'

@Injectable()
export class ApiService {
    public constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    public async getStatus(): Promise<StatusResponse> {
        try {
            await this.dataSource.query('SELECT 1')

            return {
                status: 'ok',
                database: 'ok',
            }
        } catch {
            return {
                status: 'degraded',
                database: 'down',
            }
        }
    }
}
