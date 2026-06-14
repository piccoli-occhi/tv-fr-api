import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@Injectable()
export class ApiService {
    public constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    public async getStatus(): Promise<{
        status: string
        database: string
    }> {
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
