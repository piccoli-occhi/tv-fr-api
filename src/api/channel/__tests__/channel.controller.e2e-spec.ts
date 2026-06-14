import type { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { Repository } from 'typeorm'
import { createTestApp } from '@/__tests__/helpers/create-test-app'
import { buildProgram } from '@/__tests__/helpers/program-test.helper'
import { Channel } from '@/xml-tv/entities/channel.entity'
import { Program } from '@/xml-tv/entities/program.entity'

const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
})

describe('ChannelController', () => {
    let app: INestApplication<App>
    let channelRepository: Repository<Channel>
    let programRepository: Repository<Program>

    beforeEach(async () => {
        const { app: testApp, module } = await createTestApp()
        app = testApp
        channelRepository = module.get<Repository<Channel>>(getRepositoryToken(Channel))
        programRepository = module.get<Repository<Program>>(getRepositoryToken(Program))

        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
    })

    afterEach(async () => {
        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
        await app.close()
    })

    describe('GET /api/channels', () => {
        test('returns paginated channels', async () => {
            await channelRepository.save([
                {
                    xmlId: 'channel-1',
                    displayName: 'Channel One',
                    icon: null,
                },
                {
                    xmlId: 'channel-2',
                    displayName: 'Channel Two',
                    icon: 'https://example.com/icon.png',
                },
            ])

            const response = await request(app.getHttpServer()).get('/api/channels').expect(200)

            expect(response.body.total).toBe(2)
            expect(response.body.totalPages).toBe(1)
            expect(response.body.count).toBe(2)
            expect(response.body.channels).toHaveLength(2)
            expect(response.body.channels).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        xmlId: 'channel-1',
                        displayName: 'Channel One',
                        icon: null,
                    }),
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

        test('respects page and limit', async () => {
            await channelRepository.save([
                {
                    xmlId: 'channel-1',
                    displayName: 'Alpha',
                    icon: null,
                },
                {
                    xmlId: 'channel-2',
                    displayName: 'Beta',
                    icon: null,
                },
            ])

            const response = await request(app.getHttpServer()).get('/api/channels?page=1&limit=1').expect(200)

            expect(response.body.total).toBe(2)
            expect(response.body.totalPages).toBe(2)
            expect(response.body.count).toBe(1)
            expect(response.body.channels).toHaveLength(1)
            expect(response.body.channels[0].displayName).toBe('Alpha')
        })

        test('respects order=desc', async () => {
            await channelRepository.save([
                {
                    xmlId: 'channel-1',
                    displayName: 'Alpha',
                    icon: null,
                },
                {
                    xmlId: 'channel-2',
                    displayName: 'Beta',
                    icon: null,
                },
            ])

            const response = await request(app.getHttpServer()).get('/api/channels?order=desc').expect(200)

            expect(response.body.channels[0].displayName).toBe('Beta')
            expect(response.body.channels[1].displayName).toBe('Alpha')
        })
    })

    describe('GET /api/channels/search', () => {
        test('returns matching channels', async () => {
            await channelRepository.save([
                {
                    xmlId: 'tf1.fr',
                    displayName: 'TF1',
                    icon: null,
                },
                {
                    xmlId: 'm6.fr',
                    displayName: 'M6',
                    icon: null,
                },
                {
                    xmlId: 'tf1-series.fr',
                    displayName: 'TF1 Séries Films',
                    icon: null,
                },
            ])

            const response = await request(app.getHttpServer()).get('/api/channels/search?q=TF1').expect(200)

            expect(response.body.total).toBe(2)
            expect(response.body.channels).toHaveLength(2)
            expect(response.body.channels.every((c: Channel) => c.displayName.includes('TF1'))).toBe(true)
            expect(response.body.channels.every((c: Channel) => !('programs' in c))).toBe(true)
        })

        test('returns empty result when no match', async () => {
            await channelRepository.save([
                {
                    xmlId: 'tf1.fr',
                    displayName: 'TF1',
                    icon: null,
                },
            ])

            const response = await request(app.getHttpServer()).get('/api/channels/search?q=Arte').expect(200)

            expect(response.body.total).toBe(0)
            expect(response.body.channels).toHaveLength(0)
        })
    })

    describe('GET /api/channels/:id', () => {
        test('returns channel with current and day programs (by xmlId)', async () => {
            const channel = await channelRepository.save({
                xmlId: 'tf1.fr',
                displayName: 'TF1',
                icon: null,
            })

            // Use fixed times that work any time of day: create programs at known UTC times
            // that are guaranteed to be "today" regardless of when the test runs
            const baseDate = new Date()
            baseDate.setUTCHours(0, 0, 0, 0)
            const baseTime = baseDate.getTime()
            const oneHour = 60 * 60 * 1000
            const now = Date.now()

            // Create programs at specific times: 06:00, 10:00, 15:00, 22:00 UTC
            // This way they're always in the same calendar day
            await programRepository.save([
                buildProgram({
                    title: 'Yesterday show',
                    channelXmlId: channel.xmlId,
                    start: new Date(baseTime - 24 * oneHour + 6 * oneHour),
                    stop: new Date(baseTime - 24 * oneHour + 7 * oneHour),
                }),
                buildProgram({
                    title: 'Current show',
                    channelXmlId: channel.xmlId,
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
                buildProgram({
                    title: 'Later today',
                    channelXmlId: channel.xmlId,
                    start: new Date(baseTime + 15 * oneHour),
                    stop: new Date(baseTime + 16 * oneHour),
                }),
                buildProgram({
                    title: 'Tomorrow show',
                    channelXmlId: channel.xmlId,
                    start: new Date(baseTime + 24 * oneHour + 6 * oneHour),
                    stop: new Date(baseTime + 24 * oneHour + 7 * oneHour),
                }),
            ])

            const response = await request(app.getHttpServer()).get('/api/channels/tf1.fr').expect(200)

            expect(response.body.channel.xmlId).toBe('tf1.fr')
            expect(response.body.currentProgram?.title).toBe('Current show')
            const titles = response.body.dayPrograms.map((p: Program) => p.title).sort()
            expect(titles).toEqual([
                'Current show',
                'Later today',
            ])
        })

        test('returns channel by UUID', async () => {
            const channel = await channelRepository.save({
                xmlId: 'tf1.fr',
                displayName: 'TF1',
                icon: null,
            })

            const response = await request(app.getHttpServer()).get(`/api/channels/${channel.id}`).expect(200)

            expect(response.body.channel.xmlId).toBe('tf1.fr')
            expect(response.body.currentProgram).toBeNull()
            expect(response.body.dayPrograms).toEqual([])
        })

        test('filters dayPrograms by given day', async () => {
            const channel = await channelRepository.save({
                xmlId: 'tf1.fr',
                displayName: 'TF1',
                icon: null,
            })

            const now = Date.now()
            const oneDay = 24 * 60 * 60 * 1000
            const tomorrow = new Date(now + oneDay)
            const tomorrowAtNoonUtc = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 12, 0, 0))

            await programRepository.save([
                buildProgram({
                    title: 'Today show',
                    channelXmlId: channel.xmlId,
                    start: new Date(now),
                    stop: new Date(now + 60 * 60 * 1000),
                }),
                buildProgram({
                    title: 'Tomorrow noon',
                    channelXmlId: channel.xmlId,
                    start: tomorrowAtNoonUtc,
                    stop: new Date(tomorrowAtNoonUtc.getTime() + 60 * 60 * 1000),
                }),
            ])

            const tomorrowFR = dayFormatter.format(new Date(now + oneDay))
            const response = await request(app.getHttpServer())
                .get(`/api/channels/tf1.fr?day=${encodeURIComponent(tomorrowFR)}`)
                .expect(200)

            const titles = response.body.dayPrograms.map((p: Program) => p.title)
            expect(titles).toEqual([
                'Tomorrow noon',
            ])
        })

        test('returns 404 for unknown channel', async () => {
            return request(app.getHttpServer()).get('/api/channels/unknown.fr').expect(404)
        })
    })
})
