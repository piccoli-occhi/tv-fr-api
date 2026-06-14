import type { INestApplication } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants'
import type { App } from 'supertest/types'
import type { DataSourceOptions } from 'typeorm'
import { createPgMemDataSource } from '@/__tests__/pg-mem-data-source'
import { AppModule } from '@/app.module'
import { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'
import { Channel } from '@/xml-tv/entities/channel.entity'
import { Program } from '@/xml-tv/entities/program.entity'

export const createTestApp = async (): Promise<{
    app: INestApplication<App>
    module: TestingModule
}> => {
    const module: TestingModule = await Test.createTestingModule({
        imports: [
            AppModule,
        ],
    })
        .overrideProvider(getDataSourceToken())
        .useFactory({
            inject: [
                TYPEORM_MODULE_OPTIONS,
            ],
            factory: (options: DataSourceOptions) =>
                createPgMemDataSource({
                    ...options,
                    entities: [
                        Channel,
                        Program,
                        TmdbDetails,
                    ],
                } as DataSourceOptions),
        })
        .compile()

    const app = module.createNestApplication()

    app.setGlobalPrefix('api')
    await app.init()

    return {
        app,
        module,
    }
}
