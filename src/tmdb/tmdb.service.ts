import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MovieDb, MovieResult, TvResult } from 'moviedb-promise'
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm'
import { ProgramService } from '@/api/program/program.service'
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

        // const titles = rows.map((r) => r.title)

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

    // MERDE

    public async syncOneProgram(title: string): Promise<void> {
        try {
            const program = await this.programRepository.findOne({
                where: {
                    title,
                },
            })

            if (!program) {
                this.logger.error(`action=sync_program,status=failed,reason=program_not_found`)
                return
            }

            const result = program.isSerie ? await this.findTvShow(title) : await this.findMovie(title)

            if (!result?.id) {
                this.logger.log(`action=sync_program,title=${title},status=not_found`)
                return
            }

            const details = this.createTmdbDetails({
                result,
                isMovie: !program.isSerie,
            })

            if (!details.tmdbId) {
                this.logger.log(`action=sync_program,title=${title},status=invalid_tmdb_id`)
                return
            }

            details.title = program.title

            await this.tmdbDetails.upsert(details, {
                conflictPaths: [
                    'title',
                ],
            })

            this.logger.log(`action=sync_program,title=${title},tmdb_id=${details.tmdbId},status=success`)
        } catch (e) {
            this.logger.error(`action=sync_program,status=failed,reason=${e}`)
        }
    }

    // MERDE

    public async syncPrograms() {
        const now = new Date()

        const nowPrograms = await this.programRepository.find({
            where: {
                startAt: LessThanOrEqual(now),
                stopAt: MoreThanOrEqual(now),
            },
            take: 30,
        })

        const titles = [
            ...new Set(nowPrograms.map((v) => v.title)),
        ]

        this.logger.log(`action=sync_programs, count=${titles.length}`)

        if (titles.length > 0) {
            await Promise.all(
                titles.map((t) => {
                    return this.syncOneProgram(t)
                }),
            )
        }

        this.logger.log(`action=sync_programs, count=${titles.length}, status=finished`)
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

    private createTmdbDetails(options: { result: TvResult | MovieResult; isMovie: boolean }): TmdbDetails {
        const details = new TmdbDetails()

        details.tmdbId = options.result.id ?? null
        details.isMovie = options.isMovie

        if ('original_name' in options.result) {
            details.originalName = options.result.original_name ?? null
        } else {
            details.originalName = (options.result as MovieResult).original_title ?? null
        }

        details.popularity = options.result.vote_average ?? null
        details.voteCount = options.result.vote_count ?? null
        details.poster = `https://image.tmdb.org/t/p/w500${options.result.poster_path}`

        return details
    }
}
