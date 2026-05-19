import type { INestApplication } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm'
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { DataSourceOptions, Repository } from 'typeorm'
import { AppModule } from '../app.module'
import { Channel } from '../xml-tv/entities/channel.entity'
import { Program } from '../xml-tv/entities/program.entity'
import { createPgMemDataSource } from './pg-mem-data-source'

describe('ApiController (e2e)', () => {
    let app: INestApplication<App>
    let channelRepository: Repository<Channel>
    let programRepository: Repository<Program>

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(getDataSourceToken())
            .useFactory({
                inject: [TYPEORM_MODULE_OPTIONS],
                factory: (options: DataSourceOptions) =>
                    createPgMemDataSource({
                        ...options,
                        entities: [Channel, Program],
                    } as DataSourceOptions),
            })
            .compile()

        app = moduleFixture.createNestApplication()
        app.setGlobalPrefix('api')
        await app.init()

        channelRepository = moduleFixture.get<Repository<Channel>>(getRepositoryToken(Channel))
        programRepository = moduleFixture.get<Repository<Program>>(getRepositoryToken(Program))

        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
    })

    afterEach(async () => {
        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
        await app.close()
    })

    test('GET /api/status', () => {
        return request(app.getHttpServer()).get('/api/status').expect(200).expect({ status: 'ok', database: 'ok' })
    })

    test('GET /api/channels', async () => {
        await channelRepository.save([
            { xmlId: 'channel-1', displayName: 'Channel One', icon: null },
            { xmlId: 'channel-2', displayName: 'Channel Two', icon: 'https://example.com/icon.png' },
        ])

        const response = await request(app.getHttpServer()).get('/api/channels').expect(200)

        expect(response.body.total).toBe(2)
        expect(response.body.totalPages).toBe(1)
        expect(response.body.count).toBe(2)
        expect(response.body.channels).toHaveLength(2)
        expect(response.body.channels).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ xmlId: 'channel-1', displayName: 'Channel One', icon: null }),
                expect.objectContaining({
                    xmlId: 'channel-2',
                    displayName: 'Channel Two',
                    icon: 'https://example.com/icon.png',
                }),
            ]),
        )
        for (const channel of response.body.channels) {
            expect(channel).not.toHaveProperty('programs')
        }
    })

    test('GET /api/channels?page=1&limit=1', async () => {
        await channelRepository.save([
            { xmlId: 'channel-1', displayName: 'Alpha', icon: null },
            { xmlId: 'channel-2', displayName: 'Beta', icon: null },
        ])

        const response = await request(app.getHttpServer()).get('/api/channels?page=1&limit=1').expect(200)

        expect(response.body.total).toBe(2)
        expect(response.body.totalPages).toBe(2)
        expect(response.body.count).toBe(1)
        expect(response.body.channels).toHaveLength(1)
        expect(response.body.channels[0].displayName).toBe('Alpha')
    })

    test('GET /api/channels?order=desc', async () => {
        await channelRepository.save([
            { xmlId: 'channel-1', displayName: 'Alpha', icon: null },
            { xmlId: 'channel-2', displayName: 'Beta', icon: null },
        ])

        const response = await request(app.getHttpServer()).get('/api/channels?order=desc').expect(200)

        expect(response.body.channels[0].displayName).toBe('Beta')
        expect(response.body.channels[1].displayName).toBe('Alpha')
    })
})
