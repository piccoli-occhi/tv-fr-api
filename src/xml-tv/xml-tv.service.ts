import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Channel } from './entities/channel.entity'
import { Program } from './entities/program.entity'
import { XMLParser, XmlResult } from './xml-tv.parser'

const XMLTV_URL = 'https://xmltvfr.fr/xmltv/xmltv.xml'

@Injectable()
export class XmlTvService {
    public constructor(
        @InjectRepository(Channel)
        private readonly channelRepository: Repository<Channel>,
        @InjectRepository(Program)
        private readonly programRepository: Repository<Program>,
    ) {}

    private readonly logger = new Logger(XmlTvService.name)

    public async downloadXML(): Promise<string> {
        this.logger.log('action=download_xml, status=started')

        const response = await fetch(XMLTV_URL)

        if (!response.ok) {
            this.logger.error(`action=download_xml, status=failed, status=${response.status}, reason=${response.statusText}`)
            throw new Error(`Failed to download XMLTV file: ${response.status} ${response.statusText}`)
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        const dir = await mkdtemp(join(tmpdir(), 'xmltv-'))
        const filePath = join(dir, 'xmltv.xml')
        await writeFile(filePath, buffer)

        this.logger.log(`action=download_xml, status=success, path=${filePath}`)

        return filePath
    }

    public async clean(): Promise<void> {
        try {
            await this.channelRepository.deleteAll()
            await this.programRepository.deleteAll()

            this.logger.log('action=clean, status=success')
        } catch (e) {
            this.logger.error(`action=clean, status=failed, reason=${e}`)

            throw e
        }
    }

    public async parseXML(filePath: string): Promise<XmlResult> {
        try {
            const result = await XMLParser.fromPath(filePath).parseXMLFile()

            this.logger.log(`action=parse_xml, status=success, channels=${result.channels.length}, programs=${result.programs.length}`)

            return result
        } catch (error) {
            this.logger.error(`action=parse_xml, status=failed, reason=${(error as Error).message}`)

            return Promise.reject(error)
        }
    }

    public async addChannels(channels: Channel[]): Promise<Channel[]> {
        try {
            const saved = await this.channelRepository.save(channels, {
                chunk: 500,
            })

            this.logger.log(`action=add_channels, status=success, count=${saved.length}`)

            return saved
        } catch (e) {
            this.logger.error(`action=add_channels, status=failed, reason=${e}`)

            throw e
        }
    }

    public async addPrograms(programs: Program[]): Promise<Program[]> {
        try {
            const saved = await this.programRepository.save(programs, {
                chunk: 500,
            })

            this.logger.log(`action=add_programs, status=success, count=${saved.length}`)

            return saved
        } catch (e) {
            this.logger.error(`action=add_programs, status=failed, reason=${e}`)

            throw e
        }
    }
}
