import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MovieDb, MovieResult, TvResult } from 'moviedb-promise'
import { In, IsNull, LessThan, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm'
import { TNT_CHANNELS } from '@/api/channel/channel.service'
import { ProgramService } from '@/api/program/program.service'
import { MediaType } from '@/tmdb/entities/media-type.enum'
import { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'
import { Program } from '@/xml-tv/entities/program.entity'

@Injectable()
export class TmdbService {
    public constructor(
        @InjectRepository(Program)
        private readonly programRepository: Repository<Program>,
        @InjectRepository(TmdbDetails)
        private readonly tmdbDetails: Repository<TmdbDetails>,
        readonly _programSerice: ProgramService,
    ) {}

    private readonly logger = new Logger(TmdbService.name)

    private readonly api = new MovieDb(process.env.TMDB_API_KEY ?? '')

    public async handleNewPrograms() {
        const rows = await this.programRepository
            .createQueryBuilder('program')
            .select([
                'program.id AS id',
                'program.title AS title',
            ])
            .distinctOn([
                'program.title',
            ])
            .getRawMany<{
                id: string
                title: string
            }>()

        this.logger.log(`action=handle_new_programs, count=${rows.length}`)

        await Promise.all(
            rows.map((r) => {
                return this.tmdbDetails
                    .createQueryBuilder()
                    .insert()
                    .into(TmdbDetails)
                    .values({
                        title: r.title,
                        voteCount: null,
                        poster: null,
                        popularity: null,
                    })
                    .orIgnore()
                    .execute()
            }),
        )

        this.logger.log(`action=handle_new_programs, status=finished`)
    }

    public async syncOneProgram(title: string): Promise<void> {
        try {
            const program = await this.programRepository.findOne({
                where: {
                    title,
                },
            })

            if (!program) {
                this.logger.log(`action=sync_program, status=not_found, title=${title}`)

                return
            }

            const existingDetails = await this.tmdbDetails.findOne({
                where: {
                    title,
                },
            })

            const existingMediaType = existingDetails?.mediaType ?? null

            let result: TvResult | MovieResult | undefined
            let mediaType: MediaType | undefined

            if (existingMediaType === MediaType.TV) {
                result = await this.findTvShow(title)
                mediaType = MediaType.TV
            } else if (existingMediaType === MediaType.Movie) {
                result = await this.findMovie(title)
                mediaType = MediaType.Movie
            } else {
                const movieResult = await this.findMovie(title)

                if (movieResult) {
                    result = movieResult
                    mediaType = MediaType.Movie
                } else {
                    const tvResult = await this.findTvShow(title)

                    if (tvResult) {
                        result = tvResult
                        mediaType = MediaType.TV
                    }
                }
            }

            if (!result?.id || !mediaType) {
                this.logger.log(`action=sync_program, title=${title}, status=not_found`)

                await this.tmdbDetails.update(
                    {
                        title,
                    },
                    {
                        tmdbSyncAt: new Date(),
                    },
                )

                return
            }

            const details = this.createTmdbDetails({
                result,
                mediaType,
            })

            if (!details.tmdbId) {
                this.logger.log(`action=sync_program, title=${title}, status=no_tmdb_id`)

                await this.tmdbDetails.update(
                    {
                        title,
                    },
                    {
                        tmdbSyncAt: new Date(),
                    },
                )

                return
            }

            details.title = program.title
            details.tmdbSyncAt = new Date()

            await this.tmdbDetails.upsert(details, {
                conflictPaths: [
                    'title',
                ],
            })

            this.logger.log(`action=sync_program, title=${title}, tmdb_id=${details.tmdbId}, status=success`)
        } catch (e) {
            this.logger.error(`action=sync_program, status=failed, reason=${e}`)
        }
    }

    public async syncTntPrograms() {
        const now = new Date()
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const programs = await this.programRepository.find({
            where: {
                startAt: LessThanOrEqual(now),
                stopAt: MoreThanOrEqual(now),
                channel: {
                    displayName: In(TNT_CHANNELS),
                },
            },
            relations: [
                'channel',
            ],
        })

        const titles = [
            ...new Set(programs.map((v) => v.title)),
        ]

        const detailsToSync = await this.tmdbDetails.find({
            where: [
                {
                    title: In(titles),
                    tmdbSyncAt: IsNull(),
                },
                {
                    title: In(titles),
                    tmdbSyncAt: LessThan(oneMonthAgo),
                },
            ],
        })

        const titlesToSync = detailsToSync.map((d) => d.title)

        this.logger.log(`action=sync_tnt_programs, count=${titlesToSync.length}`)

        if (titlesToSync.length > 0) {
            await Promise.all(titlesToSync.map((t) => this.syncOneProgram(t)))
        }

        this.logger.log(`action=sync_tnt_programs, count=${titlesToSync.length}, status=finished`)
    }

    public async syncOtherPrograms() {
        const now = new Date()
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const programs = await this.programRepository.find({
            where: {
                startAt: LessThanOrEqual(now),
                stopAt: MoreThanOrEqual(now),
                channel: {
                    displayName: Not(In(TNT_CHANNELS)),
                },
            },
            relations: [
                'channel',
            ],
            take: 30,
        })

        const titles = [
            ...new Set(programs.map((v) => v.title)),
        ]

        const detailsToSync = await this.tmdbDetails.find({
            where: [
                {
                    title: In(titles),
                    tmdbSyncAt: IsNull(),
                },
                {
                    title: In(titles),
                    tmdbSyncAt: LessThan(oneMonthAgo),
                },
            ],
        })

        const titlesToSync = detailsToSync.map((d) => d.title)

        this.logger.log(`action=sync_other_programs, count=${titlesToSync.length}`)

        if (titlesToSync.length > 0) {
            await Promise.all(titlesToSync.map((t) => this.syncOneProgram(t)))
        }

        this.logger.log(`action=sync_other_programs, count=${titlesToSync.length}, status=finished`)
    }

    // tmdb api

    private async findTvShow(tmdbTitle: string): Promise<TvResult | undefined> {
        const title = tmdbTitle.toLowerCase()
        const response = await this.api.searchTv({
            query: title,
            language: 'fr',
        })

        const matchName = response.results?.find((f) => {
            return f?.name?.toLowerCase() === title || f?.original_name?.toLowerCase() === title
        })

        return matchName
    }

    private async findMovie(tmdbTitle: string): Promise<MovieResult | undefined> {
        const title = tmdbTitle.toLowerCase()
        const response = await this.api.searchMovie({
            query: title,
            language: 'fr',
        })

        const matchName = response.results?.find((f) => {
            return f?.title?.toLowerCase() === title || f?.original_title?.toLowerCase() === title
        })

        return matchName
    }

    // db

    private createTmdbDetails(options: { result: TvResult | MovieResult; mediaType: MediaType }): TmdbDetails {
        const details = new TmdbDetails()

        details.tmdbId = options.result.id ?? null
        details.mediaType = options.mediaType

        if ('original_name' in options.result) {
            details.originalName = options.result.original_name ?? null
        } else {
            details.originalName = (options.result as MovieResult).original_title ?? null
        }

        details.popularity = options.result.vote_average ? Math.round(options.result.vote_average) : null
        details.voteCount = options.result.vote_count ?? null
        details.poster = `https://image.tmdb.org/t/p/w500${options.result.poster_path}`

        return details
    }
}
