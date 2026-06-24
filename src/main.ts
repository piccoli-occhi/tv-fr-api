import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    app.setGlobalPrefix('api')

    const config = new DocumentBuilder()
        .setTitle('TV FR API')
        .setDescription('API for French TV channels and programs based on racacax/XML-TV-Fr')
        .setVersion('1.0')
        .addServer('https://tv-api.miceli.click')
        .build()

    SwaggerModule.setup(
        'api/docs',
        app,
        SwaggerModule.createDocument(app, config, {
            operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
        }),
    )

    await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
