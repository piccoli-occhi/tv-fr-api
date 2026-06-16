import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { subMonths } from 'date-fns'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { Repository } from 'typeorm'
import { createTestApp } from '@/__tests__/helpers/create-test-app'
import { SearxngService } from '@/searxng/searxng.service'
import { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'

describe('SearxngController (e2e)', () => {
    let app: INestApplication<App>
    let module: TestingModule
    let searxngService: SearxngService
    let tmdbDetailsRepository: Repository<TmdbDetails>

    beforeEach(async () => {
        process.env.ALLOWED_FORWARD = 'test-cron-token'
        process.env.SEARXNG_URL = 'http://searxng.test'

        const result = await createTestApp()
        app = result.app
        module = result.module

        searxngService = module.get(SearxngService)
        tmdbDetailsRepository = module.get<Repository<TmdbDetails>>(getRepositoryToken(TmdbDetails))

        await tmdbDetailsRepository.createQueryBuilder().delete().execute()
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        delete process.env.ALLOWED_FORWARD
        delete process.env.SEARXNG_URL
        await tmdbDetailsRepository.createQueryBuilder().delete().execute()
        await app.close()
    })

    const triggerSync = (app: INestApplication<App>) =>
        request(app.getHttpServer()).get('/api/searxng/sync').set('x-internal-cron', 'test-cron-token').expect(200)

    const awaitServiceCompletion = (fn: () => Promise<void>) => {
        let done: Promise<void>
        vi.spyOn(searxngService, 'syncPosters').mockImplementation(() => {
            done = fn()
            return done
        })
        return {
            waitForDone: () => done,
        }
    }

    describe('GET /api/searxng/sync', () => {
        test('prefers programme-tv.net', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        results: [
                            {
                                img_src: 'https://other.com/img.jpg',
                                url: 'https://other.com/show',
                            },
                            {
                                img_src: 'https://cdn.programme-tv.net/image.jpg',
                                url: 'https://www.programme-tv.net/show',
                            },
                        ],
                    }),
            } as Response)

            await tmdbDetailsRepository.save({
                title: 'Et la santé, ça va ?',
                poster: null,
                searxngSearchedAt: null,
            })

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Et la santé, ça va ?',
                },
            })

            expect(details?.secondaryPoster).toBe('https://cdn.programme-tv.net/image.jpg')
            expect(details?.searxngSearchedAt).not.toBeNull()
        })

        test('falls back to first result', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        results: [
                            {
                                img_src: 'https://other.com/img.jpg',
                                url: 'https://other.com/show',
                            },
                        ],
                    }),
            } as Response)

            await tmdbDetailsRepository.save({
                title: 'Show',
                poster: null,
                searxngSearchedAt: null,
            })

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Show',
                },
            })

            expect(details?.secondaryPoster).toBe('https://other.com/img.jpg')
            expect(details?.searxngSearchedAt).not.toBeNull()
        })

        test('skips if searched recently', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch')

            await tmdbDetailsRepository.save({
                title: 'Récent',
                poster: null,
                searxngSearchedAt: new Date(),
            })

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            expect(fetchSpy).not.toHaveBeenCalled()
        })

        test('retries after one month', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        results: [
                            {
                                img_src: 'https://new.com/img.jpg',
                                url: 'https://new.com',
                            },
                        ],
                    }),
            } as Response)

            await tmdbDetailsRepository.save({
                title: 'Vieux résultat',
                poster: null,
                searxngSearchedAt: subMonths(new Date(), 2),
            })

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            const details = await tmdbDetailsRepository.findOne({
                where: {
                    title: 'Vieux résultat',
                },
            })

            expect(details?.secondaryPoster).toBe('https://new.com/img.jpg')
        })

        test('skips if tmdb poster exists', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch')

            await tmdbDetailsRepository.save({
                title: 'Avec poster',
                poster: 'https://image.tmdb.org/poster.jpg',
                searxngSearchedAt: null,
            })

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            expect(fetchSpy).not.toHaveBeenCalled()
        })

        test('limits to 30 records', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        results: [],
                    }),
            } as Response)

            const fetchSpy = vi.spyOn(global, 'fetch')

            await tmdbDetailsRepository.save(
                Array.from(
                    {
                        length: 35,
                    },
                    (_, i) => ({
                        title: `Show ${i}`,
                        poster: null,
                        searxngSearchedAt: null,
                    }),
                ),
            )

            const original = searxngService.syncPosters.bind(searxngService)
            const { waitForDone } = awaitServiceCompletion(original)

            await triggerSync(app)
            await waitForDone()

            expect(fetchSpy).toHaveBeenCalledTimes(30)
        })
    })
})
