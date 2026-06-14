import type { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { addDays, addHours, addMinutes, format, subHours, subMinutes } from 'date-fns'
import request from 'supertest'
import type { App } from 'supertest/types'
import type { Repository } from 'typeorm'
import { createTestApp } from '@/__tests__/helpers/create-test-app'
import { buildProgram } from '@/__tests__/helpers/program-test.helper'
import { Channel } from '@/xml-tv/entities/channel.entity'
import { Program } from '@/xml-tv/entities/program.entity'

describe('ProgramController', () => {
    let app: INestApplication<App>
    let channelRepository: Repository<Channel>
    let programRepository: Repository<Program>

    beforeEach(async () => {
        const { app: testApp, module } = await createTestApp()
        app = testApp
        channelRepository = module.get<Repository<Channel>>(getRepositoryToken(Channel))
        programRepository = module.get<Repository<Program>>(getRepositoryToken(Program))

        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()

        await channelRepository.save({
            xmlId: 'program-channel',
            displayName: 'Test Channel',
            icon: null,
        })
    })

    afterEach(async () => {
        await programRepository.createQueryBuilder().delete().execute()
        await channelRepository.createQueryBuilder().delete().execute()
        await app.close()
    })

    describe('GET /api/program/:id', () => {
        test('returns program by id', async () => {
            const program = await programRepository.save(
                buildProgram({
                    title: 'Current show',
                    start: new Date(Date.now() - 60 * 60 * 1000),
                    stop: new Date(Date.now() + 60 * 60 * 1000),
                }),
            )

            const response = await request(app.getHttpServer()).get(`/api/program/${program.id}`).expect(200)

            expect(response.body.id).toBe(program.id)
            expect(response.body.title).toBe('Current show')
        })

        test('returns 404 for unknown program', async () => {
            await request(app.getHttpServer()).get('/api/program/00000000-0000-0000-0000-000000000000').expect(404)
        })
    })

    describe('GET /api/programs/now', () => {
        test('returns only programs airing now', async () => {
            const now = Date.now()

            await channelRepository.save([
                {
                    xmlId: 'channel-1',
                    displayName: 'Channel One',
                    icon: null,
                },
                {
                    xmlId: 'channel-2',
                    displayName: 'Channel Two',
                    icon: 'https://example.com/icon.png',
                },
            ])

            await programRepository.save([
                buildProgram({
                    title: 'Past show',
                    start: subHours(now, 3),
                    stop: subHours(now, 2),
                    channelXmlId: 'channel-1',
                }),
                buildProgram({
                    title: 'Current show A',
                    start: subMinutes(now, 30),
                    stop: addMinutes(now, 30),
                    channelXmlId: 'channel-2',
                }),
                buildProgram({
                    title: 'Current show B',
                    start: subMinutes(now, 10),
                    stop: addMinutes(now, 50),
                    channelXmlId: 'channel-2',
                }),
                buildProgram({
                    title: 'Future show',
                    start: addHours(now, 1),
                    stop: addHours(now, 2),
                    channelXmlId: 'channel-2',
                }),
            ])

            const response = await request(app.getHttpServer()).get('/api/programs/now').expect(200)
            const programs = response.body.programs as Program[]

            expect(response.body.total).toBe(2)
            expect(response.body.count).toBe(2)
            expect(response.body.programs).toHaveLength(2)
            expect(programs.map((p: Program) => p.title).sort()).toEqual([
                'Current show A',
                'Current show B',
            ])
            expect(programs.at(0)?.channel.displayName).toEqual('Channel Two')
            expect(programs.at(1)?.channel.displayName).toEqual('Channel Two')
        })

        test('supports pagination and order', async () => {
            const now = Date.now()

            await programRepository.save([
                buildProgram({
                    title: 'Show 1',
                    start: subMinutes(now, 30),
                    stop: addMinutes(now, 30),
                }),
                buildProgram({
                    title: 'Show 2',
                    start: subMinutes(now, 25),
                    stop: addMinutes(now, 35),
                }),
                buildProgram({
                    title: 'Show 3',
                    start: subMinutes(now, 20),
                    stop: addMinutes(now, 40),
                }),
            ])

            const response = await request(app.getHttpServer()).get('/api/programs/now?page=2&limit=1&order=desc').expect(200)

            expect(response.body.total).toBe(3)
            expect(response.body.totalPages).toBe(3)
            expect(response.body.count).toBe(1)
            expect(response.body.limit).toBe(1)
            expect(response.body.programs[0].title).toBe('Show 2')
        })
    })

    describe('GET /api/programs/:day', () => {
        test('returns programs for a specific day', async () => {
            const targetDay = new Date('2026-05-22')
            const dayStart = new Date(targetDay)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(targetDay)
            dayEnd.setHours(23, 59, 59, 999)

            await programRepository.save([
                buildProgram({
                    title: 'Yesterday show',
                    start: subHours(dayStart, 5),
                    stop: subHours(dayStart, 1),
                }),
                buildProgram({
                    title: 'Today show 1',
                    start: addHours(dayStart, 2),
                    stop: addHours(dayStart, 3),
                }),
                buildProgram({
                    title: 'Today show 2',
                    start: addHours(dayStart, 6),
                    stop: addHours(dayStart, 7),
                }),
                buildProgram({
                    title: 'Tomorrow show',
                    start: addDays(dayEnd, 1),
                    stop: addDays(dayEnd, 2),
                }),
            ])

            const dayStr = format(targetDay, 'yyyy-MM-dd')
            const response = await request(app.getHttpServer()).get(`/api/programs/${dayStr}`).expect(200)

            expect(response.body.total).toBe(2)
            expect(response.body.count).toBe(2)
            expect(response.body.programs).toHaveLength(2)
            expect(response.body.programs.map((p: Program) => p.title)).toEqual([
                'Today show 1',
                'Today show 2',
            ])
        })

        test('returns programs sorted by startAt in ascending order', async () => {
            const targetDay = new Date('2026-05-22')
            const dayStart = new Date(targetDay)
            dayStart.setHours(0, 0, 0, 0)

            await programRepository.save([
                buildProgram({
                    title: 'Show at 20:00',
                    start: addHours(dayStart, 20),
                    stop: addHours(dayStart, 21),
                }),
                buildProgram({
                    title: 'Show at 08:00',
                    start: addHours(dayStart, 8),
                    stop: addHours(dayStart, 9),
                }),
                buildProgram({
                    title: 'Show at 14:00',
                    start: addHours(dayStart, 14),
                    stop: addHours(dayStart, 15),
                }),
            ])

            const dayStr = format(targetDay, 'yyyy-MM-dd')
            const response = await request(app.getHttpServer()).get(`/api/programs/${dayStr}`).expect(200)
            const programs = response.body.programs as Program[]

            expect(programs.map((p: Program) => p.title)).toEqual([
                'Show at 08:00',
                'Show at 14:00',
                'Show at 20:00',
            ])
        })

        test('supports pagination', async () => {
            const targetDay = new Date('2026-05-22')
            const dayStart = new Date(targetDay)
            dayStart.setHours(0, 0, 0, 0)

            await programRepository.save([
                buildProgram({
                    title: 'Show 1',
                    start: addHours(dayStart, 1),
                    stop: addHours(dayStart, 2),
                }),
                buildProgram({
                    title: 'Show 2',
                    start: addHours(dayStart, 3),
                    stop: addHours(dayStart, 4),
                }),
                buildProgram({
                    title: 'Show 3',
                    start: addHours(dayStart, 5),
                    stop: addHours(dayStart, 6),
                }),
            ])

            const dayStr = format(targetDay, 'yyyy-MM-dd')
            const response = await request(app.getHttpServer()).get(`/api/programs/${dayStr}?page=2&limit=1`).expect(200)

            expect(response.body.total).toBe(3)
            expect(response.body.totalPages).toBe(3)
            expect(response.body.count).toBe(1)
            expect(response.body.limit).toBe(1)
            expect(response.body.programs[0].title).toBe('Show 2')
        })

        test('returns 400 for invalid date format', async () => {
            const response = await request(app.getHttpServer()).get('/api/programs/22-05-2026').expect(400)

            expect(response.body.message).toContain('invalid_date')
        })
    })
})
