import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        root: './',
        include: ['src/**/__tests__/**/*.e2e-spec.ts'],
        environment: 'node',
    },
    plugins: [
        swc.vite({
            module: { type: 'es6' },
            jsc: {
                parser: {
                    syntax: 'typescript',
                    decorators: true,
                },
                transform: {
                    legacyDecorator: true,
                    decoratorMetadata: true,
                },
                target: 'es2023',
            },
        }),
    ],
})
