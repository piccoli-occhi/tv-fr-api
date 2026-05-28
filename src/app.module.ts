import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiController } from './api/api.controller'
import { ApiService } from './api/api.service'
import { ChannelController } from './api/channel/channel.controller'
import { ChannelService } from './api/channel/channel.service'
import { ProgramController } from './api/program/program.controller'
import { ProgramService } from './api/program/program.service'
import { Channel } from './xml-tv/entities/channel.entity'
import { Program } from './xml-tv/entities/program.entity'
import { XmlTvModule } from './xml-tv/xml-tv.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DATABASE_HOST'),
                port: config.get<number>('DATABASE_PORT'),
                username: config.get<string>('DATABASE_USER'),
                password: config.get<string>('DATABASE_PASSWORD'),
                database: config.get<string>('DATABASE_NAME'),
                autoLoadEntities: true,
                synchronize: true,
            }),
        }),
        XmlTvModule,
        TypeOrmModule.forFeature([Channel, Program]),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        ttl: config.get<number>('THROTTLE_TTL') ?? 60000,
                        limit: config.get<number>('THROTTLE_LIMIT') ?? 10,
                    },
                ],
                errorMessage: 'rate_limit',
            }),
        }),
    ],
    controllers: [ApiController, ChannelController, ProgramController],
    providers: [
        ApiService,
        ChannelService,
        ProgramService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
