import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { MovieDb } from 'moviedb-promise'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { Repository } from 'typeorm'
import { createTestApp } from '@/__tests__/helpers/create-test-app'
import { buildProgram } from '@/__tests__/helpers/program-test.helper'
import { MediaType } from '@/tmdb/entities/media-type.enum'
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
        test('creates TmdbDetails for a movie when searchMovie matches', async () => {
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

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'current movie',
                    channelXmlId: 'test-channel',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync').expect(200)

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'current movie',
                },
            })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(10)
            expect(details?.mediaType).toBe(MediaType.Movie)
            expect(details?.originalName).toBe('current movie')
        })

        test('creates TmdbDetails for a serie when searchMovie returns nothing and searchTv matches', async () => {
            const now = Date.now()
            const oneHour = 60 * 60 * 1000

            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [],
            })
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

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'current serie',
                    channelXmlId: 'test-channel',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync').expect(200)

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'current serie',
                },
            })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(20)
            expect(details?.mediaType).toBe(MediaType.TV)
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

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'the godfather',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=the+godfather').expect(200)

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'the godfather',
                },
            })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(42)
            expect(details?.mediaType).toBe(MediaType.Movie)
            expect(details?.originalName).toBe('the godfather')
        })

        test('creates TmdbDetails for a TV series program when searchMovie returns nothing and searchTv matches', async () => {
            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [],
            })
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

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'the wire',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=the+wire').expect(200)

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'the wire',
                },
            })
            expect(details).not.toBeNull()
            expect(Number(details?.tmdbId)).toBe(99)
            expect(details?.mediaType).toBe(MediaType.TV)
            expect(details?.originalName).toBe('the wire')
        })

        test('does not create TmdbDetails when neither searchMovie nor searchTv match', async () => {
            vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [],
            })
            vi.spyOn(MovieDb.prototype, 'searchTv').mockResolvedValue({
                results: [],
            })

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'unknown title',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=unknown+title').expect(200)

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'unknown title',
                },
            })
            expect(details).toBeNull()
        })

        test('calls searchTv directly on second sync when mediaType is already tv', async () => {
            const searchTv = vi.spyOn(MovieDb.prototype, 'searchTv').mockResolvedValue({
                results: [
                    {
                        id: 77,
                        media_type: 'tv',
                        name: 'breaking bad',
                        original_name: 'breaking bad',
                        vote_average: 9.5,
                        vote_count: 12000,
                        poster_path: '/bb.jpg',
                    },
                ],
            })
            const searchMovie = vi.spyOn(MovieDb.prototype, 'searchMovie')

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'breaking bad',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )
            await tmdbDetailsRepository.save({
                title: 'breaking bad',
                mediaType: MediaType.TV,
                tmdbId: null,
                originalName: null,
                popularity: null,
                voteCount: null,
                poster: null,
            })

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=breaking+bad').expect(200)

            expect(searchTv).toHaveBeenCalled()
            expect(searchMovie).not.toHaveBeenCalled()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'breaking bad',
                },
            })
            expect(details?.mediaType).toBe(MediaType.TV)
            expect(Number(details?.tmdbId)).toBe(77)
        })

        test('calls searchMovie directly on second sync when mediaType is already movie', async () => {
            const searchMovie = vi.spyOn(MovieDb.prototype, 'searchMovie').mockResolvedValue({
                results: [
                    {
                        id: 88,
                        media_type: 'movie',
                        title: 'inception',
                        original_title: 'inception',
                        vote_average: 8.8,
                        vote_count: 20000,
                        poster_path: '/inception.jpg',
                    },
                ],
            })
            const searchTv = vi.spyOn(MovieDb.prototype, 'searchTv')

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
            await programRepository.save(
                buildProgram({
                    title: 'inception',
                    channelXmlId: 'test-channel',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )
            await tmdbDetailsRepository.save({
                title: 'inception',
                mediaType: MediaType.Movie,
                tmdbId: null,
                originalName: null,
                popularity: null,
                voteCount: null,
                poster: null,
            })

            await request(app.getHttpServer()).get('/api/tmdb/sync?title=inception').expect(200)

            expect(searchMovie).toHaveBeenCalled()
            expect(searchTv).not.toHaveBeenCalled()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'inception',
                },
            })
            expect(details?.mediaType).toBe(MediaType.Movie)
            expect(Number(details?.tmdbId)).toBe(88)
        })
    })

    describe('syncTntPrograms / syncOtherPrograms', () => {
        const now = Date.now()
        const oneHour = 60 * 60 * 1000

        beforeEach(async () => {
            await channelRepository.save([
                {
                    xmlId: 'tf1',
                    displayName: 'TF1',
                    icon: null,
                },
                {
                    xmlId: 'other',
                    displayName: 'Other Channel',
                    icon: null,
                },
            ])
            await programRepository.save([
                buildProgram({
                    title: 'tnt show',
                    channelXmlId: 'tf1',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
                buildProgram({
                    title: 'other show',
                    channelXmlId: 'other',
                    start: new Date(now - oneHour),
                    stop: new Date(now + oneHour),
                }),
            ])
        })

        test('syncTntPrograms ne sync pas les chaines hors TNT', async () => {
            const spy = vi.spyOn(tmdbService, 'syncOneProgram').mockResolvedValue()
            await tmdbService.syncTntPrograms()
            const synced = spy.mock.calls.map(([t]) => t)
            expect(synced).toContain('tnt show')
            expect(synced).not.toContain('other show')
        })

        test('syncOtherPrograms ne sync pas les chaines TNT', async () => {
            const spy = vi.spyOn(tmdbService, 'syncOneProgram').mockResolvedValue()
            await tmdbService.syncOtherPrograms()
            const synced = spy.mock.calls.map(([t]) => t)
            expect(synced).toContain('other show')
            expect(synced).not.toContain('tnt show')
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
            return {
                waitForDone: () => done,
            }
        }

        test('creates a TmdbDetails entry for each program title in the database', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
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

            const detailsA = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Movie A',
                },
            })
            const detailsB = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Movie B',
                },
            })

            expect(detailsA).not.toBeNull()
            expect(detailsA?.tmdbId).toBeNull()
            expect(detailsB).not.toBeNull()
            expect(detailsB?.tmdbId).toBeNull()
        })

        test('creates only one TmdbDetails entry for programs sharing the same title', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
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

            const count = await tmdbDetailsRepository.count({
                where: {
                    title: 'Same Show',
                },
            })
            expect(count).toBe(1)
        })

        test('does not overwrite existing TmdbDetails when called again', async () => {
            const original = tmdbService.handleNewPrograms.bind(tmdbService)
            const { waitForDone } = awaitServiceCompletion(original)

            await channelRepository.save({
                xmlId: 'test-channel',
                displayName: 'Test Channel',
                icon: null,
            })
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
                mediaType: MediaType.Movie,
                originalName: 'Known Movie',
                popularity: 8.0,
                voteCount: 1000,
                poster: '/poster.jpg',
            })

            await triggerInit()
            await waitForDone()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Known Movie',
                },
            })
            expect(Number(details?.tmdbId)).toBe(42)
        })
    })
})
