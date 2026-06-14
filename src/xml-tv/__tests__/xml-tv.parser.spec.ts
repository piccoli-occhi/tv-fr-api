import * as path from 'node:path'
import { XMLParser } from '../xml-tv.parser'

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample.xml')

describe('XMLParser', () => {
    test('parses channels with display name and optional icon', async () => {
        const result = await XMLParser.fromPath(FIXTURE_PATH).parseXMLFile()

        expect(result.channels).toHaveLength(2)
        expect(result.channels[0]).toMatchObject({
            xmlId: 'tf1.fr',
            displayName: 'TF1',
            icon: 'https://example.com/tf1.png',
        })
        expect(result.channels[1]).toMatchObject({
            xmlId: 'france2.fr',
            displayName: 'France 2',
        })
    })

    test('parses programs with all fields and converts XML time to Date', async () => {
        const result = await XMLParser.fromPath(FIXTURE_PATH).parseXMLFile()

        expect(result.programs).toHaveLength(2)

        const journal = result.programs[0]
        expect(journal).toMatchObject({
            title: 'Le Journal',
            subTitle: 'Édition du soir',
            desc: 'Actualité du jour',
            channelXmlId: 'tf1.fr',
            xmlStart: '20260520201500 +0200',
            xmlStop: '20260520213000 +0200',
            categories: [
                'News',
                'Information',
            ],
            credits: [
                'Anne Dupont',
                'Paul Martin',
            ],
            icon: 'https://example.com/journal.png',
            ratingIcon: 'https://example.com/tp.png',
            rating: 'TP',
            episode: 'S01E42',
        })

        expect(journal.startAt).toBeInstanceOf(Date)
        expect(journal.stopAt).toBeInstanceOf(Date)
        expect(journal.startAt.toISOString()).toBe('2026-05-20T18:15:00.000Z')
        expect(journal.stopAt.toISOString()).toBe('2026-05-20T19:30:00.000Z')
    })

    test('rejects when the file does not exist', async () => {
        await expect(XMLParser.fromPath('/tmp/does-not-exist.xml').parseXMLFile()).rejects.toThrow()
    })
})
