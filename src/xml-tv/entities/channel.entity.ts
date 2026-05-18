import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Program } from './program.entity'

@Entity()
export class Channel {
    @PrimaryGeneratedColumn('uuid')
    public id: string

    @Column({ type: 'varchar', nullable: false })
    public displayName: string

    @Column({ type: 'varchar', nullable: false, unique: true })
    public xmlId: string

    @Column({ type: 'varchar', nullable: true })
    public icon: string | null

    @OneToMany(
        () => Program,
        (program) => program.channel,
    )
    public programs: Program[]
}
