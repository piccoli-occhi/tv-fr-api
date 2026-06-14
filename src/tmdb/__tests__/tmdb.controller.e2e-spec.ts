import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MovieDb } from 'moviedb-promise'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { Repository } from 'typeorm'
import { createTestApp } from '@/__tests__/helpers/create-test-app'
import { buildProgram } from '@/__tests__/helpers/program-test.helper'
import { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'
import { TmdbService } from '@/tmdb/tmdb.service'
import { Channel } from '@/xml-tv/entities/channel.entity'
import { Program } from '@/xml-tv/entities/program.entity'

describe('TmdbController (e2e)', () => {
    let app: INestApplication<App>
    let module: TestingModule
    let tmdbService: TmdbService
    let channelRepository: Repository<Channel>
    let programRepository: Repository<Program>
    let tmdbDetailsRepository: Repository<TmdbDetails>

    beforeEach(async () => {
        process.env.ALLOWED_FORWARD = 'test-cron-token'

        const result = await createTestApp()
        app = result.app
        module = result.module

        tmdbService = module.get(TmdbService)
        channelRepository = module.get<Repository<Channel>>(getRepositoryToken(Channel))
        programRepository = module.get<Repository<Program>>(getRepositoryToken(Program))
        tmdbDetailsRepository = module.get<Repository<TmdbDetails>>(getRepositoryToken(TmdbDetails))

        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
        await tmdbDetailsRepository.createQueryBuilder().delete().execute()
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        delete process.env.ALLOWED_FORWARD
        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
        await tmdbDetailsRepository.createQueryBuilder().delete().execute()
        await app.close()
    })

    describe('GET /api/tmdb/sync', () => {
        test('creates TmdbDetails for a a movie', async () => {
            const now = Date.now()
            const oneHour = 60 * 60 * 1000

            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [
                    {
                        id: 10,
                        title: 'current movie',
                        original_title: 'current movie',
                        vote_average: 7.0,
                        vote_count: 500,
                        media_type: 'movie',
                        poster_path: '/movie.jpg',
                    },
                ],
            })

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save(
                buildProgram({
                    title: 'current movie',
                    channelXmlId: 'test-channel',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync').expect(200)

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'current movie' } })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(10)
            expect(details?.isMovie).toBe(true)
            expect(details?.originalName).toBe('current movie')
        })

        test('creates TmdbDetails for a serie', async () => {
            const now = Date.now()
            const oneHour = 60 * 60 * 1000

            vi.spyOn(MovieDb.prototype, 'searchTv').mockResolvedValue({
                results: [
                    {
                        media_type: 'tv',
                        id: 20,
                        name: 'current serie',
                        original_name: 'current serie',
                        vote_average: 8.0,
                        vote_count: 800,
                        poster_path: '/serie.jpg',
                    },
                ],
            })

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save({
                ...buildProgram({
                    title: 'current serie',
                    channelXmlId: 'test-channel',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
                categories: ['Série'],
            })

            await request(app.getHttpServer()).get('/api/tmdb/sync').expect(200)

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'current serie' } })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(20)
            expect(details?.isMovie).toBe(false)
            expect(details?.originalName).toBe('current serie')
        })
    })

    describe('GET /api/tmdb/sync?title=X', () => {
        test('creates TmdbDetails for a movie program when a TMDB match is found', async () => {
            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [
                    {
                        id: 42,
                        media_type: 'movie',
                        title: 'the godfather',
                        original_title: 'the godfather',
                        vote_average: 9.2,
                        vote_count: 10000,
                        poster_path: '/godfather.jpg',
                    },
                ],
            })

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save(
                buildProgram({
                    title: 'the godfather',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=the+godfather').expect(200)

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'the godfather' } })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(42)
            expect(details?.isMovie).toBe(true)
            expect(details?.originalName).toBe('the godfather')
        })

        test('creates TmdbDetails for a TV series program when a TMDB match is found', async () => {
            vi.spyOn(MovieDb.prototype, 'searchTv').mockResolvedValue({
                results: [
                    {
                        id: 99,
                        media_type: 'tv',
                        name: 'the wire',
                        original_name: 'the wire',
                        vote_average: 9.3,
                        vote_count: 8000,
                        poster_path: '/wire.jpg',
                    },
                ],
            })

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save({
                ...buildProgram({
                    title: 'the wire',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
                categories: ['Série'],
            })

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=the+wire').expect(200)

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'the wire' } })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(99)
            expect(details?.isMovie).toBe(false)
            expect(details?.originalName).toBe('the wire')
        })

        test('does not create TmdbDetails when no TMDB match is found', async () => {
            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({ results: [] })

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save(
                buildProgram({
                    title: 'unknown movie',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=unknown+movie').expect(200)

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'unknown movie' } })
            expect(details).toBeNull()
        })
    })

    describe('GET /api/tmdb/init', () => {
        const triggerInit = () => request(app.getHttpServer()).get('/api/tmdb/init').set('x-internal-cron', 'test-cron-token').expect(200)

        const awaitServiceCompletion = (fn: () => Promise<void>) => {
            let done: Promise<void>
            vi.spyOn(tmdbService, 'handleNewPrograms').mockImplementation(() => {
                done = fn()
                return done
            })
            return { waitForDone: () => done }
        }

        test('creates a TmdbDetails entry for each program title in the database', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save([
                buildProgram({
                    title: 'Movie A',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 3600000),
                    stop: new Date(Date.now() + 3600000),
                }),
                buildProgram({
                    title: 'Movie B',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 3600000),
                    stop: new Date(Date.now() + 3600000),
                }),
            ])

            await triggerInit()
            await waitForDone()

            const detailsA = await tmdbDetailsRepository.findOne({ where: { title: 'Movie A' } })
            const detailsB = await tmdbDetailsRepository.findOne({ where: { title: 'Movie B' } })

            expect(detailsA).not.toBeNull()
            expect(detailsA?.tmdbId).toBeNull()
            expect(detailsB).not.toBeNull()
            expect(detailsB?.tmdbId).toBeNull()
        })

        test('creates only one TmdbDetails entry for programs sharing the same title', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save([
                buildProgram({
                    title: 'Same Show',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 7200000),
                    stop: new Date(Date.now() - 3600000),
                }),
                buildProgram({
                    title: 'Same Show',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 3600000),
                    stop: new Date(Date.now() + 3600000),
                }),
            ])

            await triggerInit()
            await waitForDone()

            const count = await tmdbDetailsRepository.count({ where: { title: 'Same Show' } })
            expect(count).toBe(1)
        })

        test('does not overwrite existing TmdbDetails when called again', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({ xmlId: 'test-channel', displayName: 'Test Channel', icon: null })
            await programRepository.save(
                buildProgram({
                    title: 'Known Movie',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 3600000),
                    stop: new Date(Date.now() + 3600000),
                }),
            )
            await tmdbDetailsRepository.save({
                title: 'Known Movie',
                tmdbId: 42,
                isMovie: true,
                originalName: 'Known Movie',
                popularity: 8.0,
                voteCount: 1000,
                poster: '/poster.jpg',
            })

            await triggerInit()
            await waitForDone()

            const details = await tmdbDetailsRepository.findOne({ where: { title: 'Known Movie' } })
            expect(Number(details?.tmdbId)).toBe(42)
        })
    })
})
