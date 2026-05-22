import path from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, 'src') },
        ],
    },
    test: {
        globals: true,
        root: './',
        include: ['src/**/__tests__/**/*.spec.ts', 'src/**/*.spec.ts'],
        exclude: ['**/*.e2e-spec.ts', 'node_modules/**', 'dist/**'],
        environment: 'node',
        passWithNoTests: true,
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
