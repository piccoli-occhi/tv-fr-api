import { randomUUID } from 'node:crypto'
import { DataType, newDb } from 'pg-mem'
import type { DataSource, DataSourceOptions } from 'typeorm'

export const createPgMemDataSource = async (options?: DataSourceOptions): Promise<DataSource> => {
    const db = newDb({
        autoCreateForeignKeyIndices: true,
    })

    db.public.registerFunction({
        name: 'version',
        args: [],
        returns: DataType.text,
        implementation: () => 'PostgreSQL 17 (pg-mem)',
    })

    db.public.registerFunction({
        name: 'current_database',
        args: [],
        returns: DataType.text,
        implementation: () => 'pg-mem',
    })

    db.public.registerFunction({
        name: 'uuid_generate_v4',
        args: [],
        returns: DataType.uuid,
        implementation: () => randomUUID(),
        impure: true,
    })

    db.registerExtension('uuid-ossp', () => {})

    db.public.interceptQueries((sql) => {
        if (sql.includes('information_schema')) {
            return []
        }

        return null
    })

    const dataSource: DataSource = await db.adapters.createTypeormDataSource(options)
    await dataSource.initialize()

    return dataSource
}
