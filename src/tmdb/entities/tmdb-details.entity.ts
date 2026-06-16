import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { MediaType } from '@/tmdb/entities/media-type.enum'

@Entity()
export class TmdbDetails {
    @PrimaryGeneratedColumn('uuid')
    public id: string

    @Column({
        type: 'varchar',
        nullable: false,
        unique: true,
    })
    public title: string

    @Column({
        type: 'enum',
        enum: MediaType,
        nullable: true,
        default: null,
    })
    public mediaType: MediaType | null

    @Column({
        type: 'numeric',
        nullable: true,
        unique: true,
        default: null,
    })
    public tmdbId: number | null

    @Column({
        type: 'varchar',
        nullable: true,
        unique: true,
        default: null,
    })
    public originalName: string | null

    @Column({
        type: 'numeric',
        nullable: true,
        default: null,
    })
    public popularity: number | null

    @Column({
        type: 'numeric',
        nullable: true,
        default: null,
    })
    public voteCount: number | null

    @Column({
        type: 'varchar',
        nullable: true,
        default: null,
    })
    public poster: string | null

    @Column({
        type: 'varchar',
        nullable: true,
        default: null,
    })
    public secondaryPoster: string | null

    @Column({
        type: 'timestamptz',
        nullable: true,
        default: null,
    })
    public searxngSearchedAt: Date | null

    public tmdbUrl: string | null

    @AfterLoad()
    public buildTmdbUrl() {
        if (!this.tmdbId || !this.originalName) {
            this.tmdbUrl = null
            return
        }

        this.tmdbUrl = `https://www.themoviedb.org/${this.mediaType}/${this.tmdbId}-${encodeURIComponent(this.originalName.toLowerCase())}`
    }
}
