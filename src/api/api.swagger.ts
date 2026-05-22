import { ApiQueryOptions } from '@nestjs/swagger'
import { SwaggerEnumType } from 'node_modules/@nestjs/swagger/dist/types/swagger-enum.type'

type QueryOptions = {
    enum: SwaggerEnumType
    // biome-ignore lint: suspicious/noExplicitAny
    example: any
}

// biome-ignore lint: complexity/noStaticOnlyClass
export abstract class ApiQueryDetails {
    public static limit: ApiQueryOptions = {
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page (max 100, default 20)',
        example: 20,
    }

    public static page: ApiQueryOptions = {
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (min 1)',
        example: 1,
    }

    public static sort(options: QueryOptions): ApiQueryOptions {
        return {
            name: 'sort',
            required: false,
            enum: options.enum,
            description: 'Field to sort by',
            example: options.example,
        }
    }

    public static order(options: QueryOptions): ApiQueryOptions {
        return {
            name: 'order',
            required: false,
            enum: options.enum,
            description: 'Sort direction',
            example: options.example,
        }
    }
}
