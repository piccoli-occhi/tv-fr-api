import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Channel } from './entities/channel.entity'
import { Program } from './entities/program.entity'
import { XmlTvController } from './xml-tv.controller'
import { XmlTvService } from './xml-tv.service'

@Module({
    imports: [TypeOrmModule.forFeature([Channel, Program])],
    controllers: [XmlTvController],
    providers: [XmlTvService],
})
export class XmlTvModule {}
