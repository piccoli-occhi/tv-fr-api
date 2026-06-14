# tv-fr-api

Provides api for [XML-TV-Fr](https://github.com/racacax/XML-TV-Fr).

## Endpoints

Projets provides docs with [swagger](https://tv-api.miceli.click/api/docs).

You can test endpoints on [https://tv-api.miceli.click](https://tv-api.miceli.click/api/docs) (with rate-limit).

Api endpoints : 

- `/api/channels`
- `/api/channels/search?q=<term>`
- `/api/channels/:id`
- `/api/program/:id`
- `/api/programs/now`
- `/api/programs/:day`

Process endpoint (`x-internal-cron` header is required) : 

- `/api/xml-tv/run` # run cron to update database
- `/api/tmdb/init`  # handle new programs
- `/api/tmdb/sync`. # Load details on tmdb api for current programs
- `/api/tmdb/sync?title=<title>` # Load detaisl for a specific program

## Features

- Update programs and channels every day at 1 AM
- Get program details (score, poster, etc) from TMDB

## Environment variables

| Variable | Default |
|---|---|
| `DATABASE_HOST` | |
| `DATABASE_PORT` | `5432` |
| `DATABASE_USER` | |
| `DATABASE_PASSWORD` | |
| `DATABASE_NAME` | |
| `PORT` | `3000` |
| `THROTTLE_TTL` | `60000` |
| `THROTTLE_LIMIT` | `10` |
| `ALLOWED_FORWARD` | |
| `TMDB_API_KEY` | |
| `ENABLE_CRON` | `false` |

> **`ENABLE_CRON=true` is recommended in production** to activate automatic daily updates.

## Project setup

For easy command you can use [Just](https://github.com/casey/just).

```bash
# just install
npm install
npx lefthook install
```

## Compile and run the project

```bash
# development
$ npm run start # just start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# just tests
npm run test
npm run test:e2e
```
