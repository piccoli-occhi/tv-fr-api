import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Channel } from './channel.entity'

@Entity()
export class Program {
    @PrimaryGeneratedColumn('uuid')
    public id: string

    @Column({ type: 'varchar', nullable: false })
    public title: string

    @Column({ type: 'text', nullable: true })
    public subTitle: string | null

    @Column({ type: 'text', nullable: true })
    public desc: string | null

    @Column({ type: 'varchar', nullable: false })
    public xmlStart: string

    @Column({ type: 'varchar', nullable: false })
    public xmlStop: string

    @Column({ type: 'varchar', nullable: true })
    public ratingIcon: string | null

    @Column({ type: 'varchar', nullable: true })
    public icon: string | null

    @Column({ type: 'varchar', nullable: true })
    public episode: string | null

    @Column({ type: 'varchar', nullable: true })
    public rating: string | null

    @Column({ type: 'varchar', array: true, default: [] })
    public categories: string[]

    @Column({ type: 'varchar', array: true, default: [] })
    public credits: string[]

    @Column({ type: 'varchar', nullable: false })
    public channelXmlId: string

    @ManyToOne(
        () => Channel,
        (channel) => channel.programs,
        { nullable: false, onDelete: 'CASCADE' },
    )
    @JoinColumn({ name: 'channelXmlId', referencedColumnName: 'xmlId' })
    public channel: Channel
}
