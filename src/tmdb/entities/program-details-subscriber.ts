import { EntitySubscriberInterface, EventSubscriber } from 'typeorm'
import { Program } from '@/xml-tv/entities/program.entity'
import { TmdbDetails } from './tmdb-details.entity'

type ProgramWithDetails = Program & {
    details: TmdbDetails | null
}

@EventSubscriber()
export class ProgramSubscriber implements EntitySubscriberInterface<Program> {
    listenTo() {
        return Program
    }

    // biome-ignore lint: suspicious/noExplicitAny useless
    async afterLoad(program: ProgramWithDetails, event?: any) {
        if (!event?.manager) {
            program.details = null

            return
        }

        const details = await event.manager.getRepository(TmdbDetails).findOne({
            where: {
                title: program.title,
            },
        })

        program.details = details ?? null
    }
}
