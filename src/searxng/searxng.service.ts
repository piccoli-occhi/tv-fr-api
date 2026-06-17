import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThan, Repository } from 'typeorm'
import { TmdbDetails } from '@/tmdb/entities/tmdb-details.entity'

type SearxngResult = {
    img_src?: string
    url?: string
}

type SearxngResponse = {
    results: SearxngResult[]
}

@Injectable()
export class SearxngService {
    public constructor(
        @InjectRepository(TmdbDetails)
        private readonly tmdbDetails: Repository<TmdbDetails>,
        private readonly configService: ConfigService,
    ) {}

    private readonly logger = new Logger(SearxngService.name)

    public async syncOnePoster(title: string): Promise<void> {
        const details = await this.tmdbDetails.findOne({
            where: {
                title,
            },
        })

        if (!details) {
            this.logger.log(`action=sync_one_poster, status=not_found, title=${title}`)

            return
        }

        await this.searchPoster(details)
    }

    public async syncPosters(): Promise<void> {
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        const rows = await this.tmdbDetails.find({
            where: [
                {
                    poster: IsNull(),
                    searxngSearchedAt: IsNull(),
                },
                {
                    poster: IsNull(),
                    searxngSearchedAt: LessThan(oneMonthAgo),
                },
            ],
            take: 30,
        })

        this.logger.log(`action=sync_posters, count=${rows.length}`)

        await Promise.all(rows.map((row) => this.searchPoster(row)))

        this.logger.log(`action=sync_posters, status=finished`)
    }

    private async searchPoster(details: TmdbDetails): Promise<void> {
        try {
            const baseUrl = this.configService.get<string>('SEARXNG_URL')
            const q = encodeURIComponent(`"${details.title}" affiche poster`)
            const url = `${baseUrl}/search?q=${q}&categories=images&engines=google+images,bing+images&language=fr-FR&format=json`

            const response = await fetch(url)
            const data = (await response.json()) as SearxngResponse

            const preferred = data.results.find((r) => r.url?.includes('programme-tv.net'))
            const imageUrl = preferred?.img_src ?? data.results[0]?.img_src ?? null

            await this.tmdbDetails.update(details.id, {
                secondaryPoster: imageUrl,
                searxngSearchedAt: new Date(),
            })

            this.logger.log(`action=search_poster, title=${details.title}, found=${imageUrl !== null}`)
        } catch (e) {
            this.logger.error(`action=search_poster, title=${details.title}, status=failed, reason=${e}`)
        }
    }
}
