import { NotFoundException } from '@nestjs/common'

export class ChannelNotFoundException extends NotFoundException {
    public constructor(id: string) {
        super({
            code: 'channel_not_found',
            message: `Channel not found: ${id}`,
        })
    }
}

export class ProgramNotFoundException extends NotFoundException {
    public constructor(id: string) {
        super({
            code: 'program_not_found',
            message: `Program not found: ${id}`,
        })
    }
}
