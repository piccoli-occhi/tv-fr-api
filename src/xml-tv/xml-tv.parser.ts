import * as fs from 'node:fs'
import { Logger } from '@nestjs/common'
import { parse } from 'date-fns'
import sax, { createStream, type QualifiedTag, type Tag } from 'sax'
import { Channel } from './entities/channel.entity'
import { Program } from './entities/program.entity'

export type XmlResult = {
    channels: Channel[]
    programs: Program[]
}

enum TagName {
    CHANNEL = 'channel',
    PROGRAM = 'programme',
    RATING = 'rating',
    ICON = 'icon',
    CREDITS = 'credits',
    DISPLAY_NAME = 'display-name',
    TITLE = 'title',
    SUB_TITLE = 'sub-title',
    DESC = 'desc',
    CATEGORY = 'category',
    VALUE = 'value',
    EPISODE_NUM = 'episode-num',
}

export class XMLParser {
    private static readonly XML_TIME_FORMAT = 'yyyyMMddHHmmss xx'

    private readonly logger = new Logger(XMLParser.name)

    private readonly xmlPath: string

    private readonly saxParser: sax.SAXStream

    private currentChannel: Channel = new Channel()

    private currentProgram: Program = new Program()

    private lastTagName: TagName | string = ''

    private lastTagModal: TagName | string = ''

    private readonly xmlResult: XmlResult = {
        channels: [],
        programs: [],
    }

    private constructor(xmlPath: string) {
        this.xmlPath = xmlPath
        this.saxParser = createStream(true, {
            trim: true,
        })
    }

    public static fromPath(xmlPath: string): XMLParser {
        return new XMLParser(xmlPath)
    }

    public async parseXMLFile(): Promise<XmlResult> {
        return new Promise((resolve, reject) => {
            this.saxParser.on(`error`, (e: unknown) => {
                this.logger.error(`action=parse_xml, status=error, e=${e}`)
                reject(e)
            })

            this.saxParser.on(`end`, () => {
                resolve(this.xmlResult)
            })

            this.saxParser.on(`opentag`, (tag) => {
                switch (tag.name) {
                    case TagName.CHANNEL:
                        this.handleChannelTag(tag)
                        break
                    case TagName.PROGRAM:
                        this.handleProgramTag(tag)
                        break
                    case TagName.RATING:
                        this.lastTagModal = TagName.RATING
                        break
                    case TagName.ICON:
                        this.handleIconTag(tag)
                        break
                    case TagName.CREDITS:
                        this.lastTagModal = TagName.CREDITS
                        break
                }

                this.lastTagName = tag.name as TagName
            })

            this.saxParser.on(`text`, (e) => {
                if (e.length === 0) {
                    return
                }

                this.handleTagText(e)
            })

            this.saxParser.on(`closetag`, (tag) => {
                switch (tag) {
                    case TagName.CHANNEL:
                        this.xmlResult.channels.push(structuredClone(this.currentChannel))
                        break
                    case TagName.PROGRAM:
                        this.xmlResult.programs.push(structuredClone(this.currentProgram))
                        break
                }
            })

            const readStream = fs.createReadStream(this.xmlPath)
            readStream.on('data', (chunk) => this.saxParser.write(chunk))
            readStream.on('end', () => this.saxParser.end())
            readStream.on('error', (e) => {
                this.logger.error(`action=parse_xml, status=error, e=${e}`)
                reject(e)
            })
        })
    }

    private handleChannelTag(tag: Tag | QualifiedTag): void {
        this.currentChannel = new Channel()
        this.currentChannel.xmlId = tag.attributes.id.toString()

        this.lastTagModal = TagName.CHANNEL
    }

    private handleProgramTag(tag: Tag | QualifiedTag): void {
        const { start, stop, channel: channelXmlId } = tag.attributes

        this.currentProgram = new Program()

        this.currentProgram.xmlStart = start.toString()
        this.currentProgram.xmlStop = stop.toString()
        this.currentProgram.startAt = this.parseXmlTime(this.currentProgram.xmlStart)
        this.currentProgram.stopAt = this.parseXmlTime(this.currentProgram.xmlStop)
        this.currentProgram.channelXmlId = channelXmlId.toString()
        this.currentProgram.categories = []
        this.currentProgram.ratingIcon = null
        this.currentProgram.episode = null
        this.currentProgram.credits = []

        this.lastTagModal = TagName.PROGRAM
    }

    private handleIconTag(tag: Tag | QualifiedTag): void {
        const src = tag.attributes.src.toString()

        switch (this.lastTagModal) {
            case TagName.CHANNEL:
                this.currentChannel.icon = src
                break
            case TagName.PROGRAM:
                this.currentProgram.icon = src
                break
            case TagName.RATING:
                this.currentProgram.ratingIcon = src
                break
        }
    }

    private handleTagText(text: string): void {
        const value = text.toString()

        switch (this.lastTagName) {
            case TagName.DISPLAY_NAME:
                this.currentChannel.displayName = value
                return
            case TagName.TITLE:
                this.currentProgram.title = value
                return
            case TagName.SUB_TITLE:
                this.currentProgram.subTitle = value
                return
            case TagName.DESC:
                this.currentProgram.desc = value
                return
            case TagName.CATEGORY:
                this.currentProgram.categories.push(value)
                return
            case TagName.VALUE:
                this.currentProgram.rating = value
                return
            case TagName.EPISODE_NUM:
                this.currentProgram.episode = value
                return
        }

        if (this.lastTagModal === TagName.CREDITS) {
            this.currentProgram.credits.push(value)
        }
    }

    private parseXmlTime(value: string): Date {
        return parse(value, XMLParser.XML_TIME_FORMAT, new Date())
    }
}
