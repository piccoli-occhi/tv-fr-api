import { format } from 'date-fns'

export type BuildProgramOptions = {
    title: string
    start: Date
    stop: Date
    channelXmlId?: string
}

export type ProgramCreationPayload = {
    title: string
    desc: string | null
    subTitle: string | null
    xmlStart: string
    xmlStop: string
    startAt: Date
    stopAt: Date
    channelXmlId: string
    ratingIcon: string | null
    icon: string | null
    episode: string | null
    rating: string | null
    categories: string[]
    credits: string[]
}

export function formatXmlTvTimestamp(date: Date): string {
    return `${format(date, 'yyyyMMddHHmmss')} +0000`
}

export function buildProgram(options: BuildProgramOptions): ProgramCreationPayload {
    return {
        title: options.title,
        desc: null,
        subTitle: null,
        xmlStart: formatXmlTvTimestamp(options.start),
        xmlStop: formatXmlTvTimestamp(options.stop),
        startAt: options.start,
        stopAt: options.stop,
        channelXmlId: options.channelXmlId ?? 'program-channel',
        ratingIcon: null,
        icon: null,
        episode: null,
        rating: null,
        categories: [],
        credits: [],
    }
}
