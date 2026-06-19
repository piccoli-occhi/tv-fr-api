# tv-fr-api

Provides api based on [XML-TV-Fr](https://github.com/racacax/XML-TV-Fr).

## Endpoints

Projets provides docs with [swagger](https://tv-api.miceli.click/api/docs).

You can test endpoints on [https://tv-api.miceli.click](https://tv-api.miceli.click/api/docs) (with rate-limit).

### Data endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Health check |
| `GET /api/channels` | Paginated list of channels |
| `GET /api/channels/tnt` | TNT channels in broadcast order |
| `GET /api/channels/search?q=<term>` | Search channels by name |
| `GET /api/channel/:id` | Channel + current and daily programs |
| `GET /api/program/:id` | Get a program by id |
| `GET /api/programs/now` | Currently airing programs |
| `GET /api/programs/:day` | Programs for a given day |

### XML-TV endpoints (`x-internal-cron` header required)

| Endpoint | Description |
|---|---|
| `GET /api/xml-tv/run` | Download, parse and store channels/programs |

### TMDB endpoints (`x-internal-cron` header required)

| Endpoint | Description |
|---|---|
| `GET /api/tmdb/init` | Create placeholder TmdbDetails for new programs |
| `GET /api/tmdb/sync` | Sync TMDB score/poster for current programs (TNT first) |
| `GET /api/tmdb/sync?title=<title>` | Sync TMDB details for one program |

### SearXNG endpoints (`x-internal-cron` header required)

| Endpoint | Description |
|---|---|
| `GET /api/searxng/sync` | Sync poster images for programs without one |
| `GET /api/searxng/sync?title=<title>` | Sync poster for one program |

## Packages

SDKs are generated from the OpenAPI spec and published for JS and PHP.

### JS

```bash
npm install @amiceli/tv-fr-api
```

```ts
import { ChannelsApi } from '@amiceli/tv-fr-api'

const api = new ChannelsApi()

const channels = await api.getTntChannels()
```

`basePath` defaults to `https://tv-api.miceli.click`, pass a `Configuration` to override it:

```ts
import { Configuration, ChannelsApi } from '@amiceli/tv-fr-api'

const api = new ChannelsApi(new Configuration({ basePath: 'http://localhost:3000' }))
```

Beta versions are published under the `beta` npm tag:

```bash
npm install @amiceli/tv-fr-api
```

### PHP

```bash
composer require amiceli/tv-fr-api
```

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');

$api = new Amiceli\TvFrApi\Api\ChannelsApi(new GuzzleHttp\Client());
$channels = $api->getTntChannels();
```

Beta versions use a `-beta.x` suffix and follow Composer's stability flags:

```bash
composer require amiceli/tv-fr-api:1.2.0-beta.1
```

## Features

- Sync channels and programs from XML-TV daily at 1 AM
- Enrich current programs with score/poster from TMDB, TNT channels first
- Fallback poster search via [SearXNG](https://github.com/searxng/searxng) daily at 3 AM
- Paginated, sortable channels/programs with search by name
- TNT channels endpoint with broadcast order and current program
- Rate-limiting on public endpoints
- Internal endpoints protected by `x-internal-cron` header

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_HOST` | | DB host |
| `DATABASE_PORT` | `5432` | DB port |
| `DATABASE_USER` | | DB user |
| `DATABASE_PASSWORD` | | DB password |
| `DATABASE_NAME` | | DB name |
| `PORT` | `3000` | HTTP port |
| `THROTTLE_TTL` | `60000` | Rate-limit window in ms |
| `THROTTLE_LIMIT` | `10` | Max requests per window |
| `ALLOWED_FORWARD` | | Token required by `x-internal-cron` header |
| `TMDB_API_KEY` | | TMDB API key |
| `SEARXNG_URL` | | SearXNG instance URL |
| `TZ` | | Timezone used for day boundaries (e.g. `Europe/Paris`) |
| `ENABLE_CRON` | `false` | Enable scheduled cron jobs |

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
