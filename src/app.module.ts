import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiController } from './api/api.controller'
import { ApiService } from './api/api.service'
import { Channel } from './xml-tv/entities/channel.entity'
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
                synchronize: config.get<string>('NODE_ENV') !== 'production',
            }),
        }),
        XmlTvModule,
        TypeOrmModule.forFeature([Channel]),
    ],
    controllers: [ApiController],
    providers: [ApiService],
})
export class AppModule {}
