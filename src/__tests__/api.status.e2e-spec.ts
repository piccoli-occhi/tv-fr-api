import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { App } from 'supertest/types'
import { createTestApp } from './helpers/create-test-app'

describe('GET /api/status (e2e)', () => {
    let app: INestApplication<App>

    beforeEach(async () => {
        const result = await createTestApp()
        app = result.app
    })

    afterEach(async () => {
        await app.close()
    })

    test('returns ok status', () => {
        return request(app.getHttpServer()).get('/api/status').expect(200).expect({
            status: 'ok',
            database: 'ok',
        })
    })
})
