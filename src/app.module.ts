import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiController } from './api/api.controller'
import { ApiService } from './api/api.service'
import { ChannelController } from './api/channel/channel.controller'
import { ChannelService } from './api/channel/channel.service'
import { ProgramController } from './api/program/program.controller'
import { ProgramService } from './api/program/program.service'
import { ProgramSubscriber } from './tmdb/entities/program-details-subscriber'
import { TmdbDetails } from './tmdb/entities/tmdb-details.entity'
import { TmdbController } from './tmdb/tmdb.controller'
import { TmdbService } from './tmdb/tmdb.service'
import { Channel } from './xml-tv/entities/channel.entity'
import { Program } from './xml-tv/entities/program.entity'
import { XmlTvModule } from './xml-tv/xml-tv.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ...(process.env.ENABLE_CRON === 'true' ? [ScheduleModule.forRoot()] : []),
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
                subscribers: [ProgramSubscriber],
            }),
        }),
        XmlTvModule,
        TypeOrmModule.forFeature([Channel, Program, TmdbDetails]),
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
    controllers: [ApiController, ChannelController, ProgramController, TmdbController],
    providers: [
        ApiService,
        ChannelService,
        ProgramService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        TmdbService,
    ],
})
export class AppModule {}
