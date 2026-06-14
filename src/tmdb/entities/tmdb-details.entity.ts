import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

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
        type: 'boolean',
        default: false,
    })
    public isMovie: boolean

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

    public tmdbUrl: string | null

    @AfterLoad()
    public buildTmdbUrl() {
        const tmdbURI = this.isMovie ? 'movie' : 'tv'

        this.tmdbUrl =
            this.tmdbId && this.originalName
                ? `https://www.themoviedb.org/${tmdbURI}/${this.tmdbId}-${encodeURIComponent(this.originalName.toLowerCase())}`
                : null
    }
}
