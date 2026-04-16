# Tawfic Tracker — Backend

NestJS REST API for the Tawfic doctor visit tracker. Backed by Supabase (Postgres).

## Stack

- **Framework**: NestJS 10 with Express
- **Language**: TypeScript
- **Database**: Supabase (Postgres via `@supabase/supabase-js`)
- **Validation**: `class-validator` + `class-transformer` (global `ValidationPipe`)
- **Docs**: Swagger/OpenAPI at `/docs`

## Dev Commands

```bash
npm run start:dev    # watch mode (port 3001)
npm run build        # compile to dist/
npm run start:prod   # run compiled output
```

## Project Structure

```
src/
  main.ts                          # Bootstrap: CORS, ValidationPipe, Swagger, port 3001
  app.module.ts                    # Root module

  supabase/
    supabase.module.ts             # Global module
    supabase.service.ts            # Wraps @supabase/supabase-js client

  doctors/
    doctors.controller.ts          # GET /doctors, GET /doctors/:id, POST, PATCH, DELETE
    doctors.service.ts             # Business logic + status computation
    dto/create-doctor.dto.ts       # Validation rules for new doctors
    dto/update-doctor.dto.ts       # PartialType(CreateDoctorDto)

  visits/
    visits.controller.ts           # POST /doctors/:id/visit, POST /doctors/:id/visit-today, DELETE /doctors/:id/visits/:visitId
    visits-export.controller.ts    # GET /visits/export?month=YYYY-MM (CSV download)
    visits.service.ts
    dto/record-visit.dto.ts
    dto/clear-visit.dto.ts

  plans/
    plans.controller.ts            # GET /plans/:day, GET /plans, PUT /plans/:day
    plans.service.ts
    dto/set-plan.dto.ts

  stats/
    stats.controller.ts            # GET /stats
    stats.service.ts

  common/
    filters/all-exceptions.filter.ts   # Global exception → structured JSON error
    utils/month.util.ts                # Month string helpers
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/doctors` | List with filters: `area`, `status`, `day`, `search`, `hideF` |
| GET | `/doctors/:id` | Single doctor with visits |
| POST | `/doctors` | Create doctor |
| PATCH | `/doctors/:id` | Update doctor (partial) |
| DELETE | `/doctors/:id` | Delete doctor |
| POST | `/doctors/:id/visit` | Record visit on specific date `{ date: "YYYY-MM-DD" }` |
| POST | `/doctors/:id/visit-today` | Record today as visit |
| DELETE | `/doctors/:id/visits/:visitId` | Remove a visit |
| GET | `/visits/export` | CSV export, optional `?month=YYYY-MM` |
| GET | `/plans/week` | Plans for the Mon–Sat week containing `?date=YYYY-MM-DD` (defaults to today) |
| GET | `/plans` | All saved plans |
| GET | `/plans/:date` | Plan for a specific date (YYYY-MM-DD) |
| PUT | `/plans/:date` | Set plan for a date `{ doctorIds: number[] }` |
| GET | `/stats` | Dashboard statistics |

## Validation Rules

**Doctor class**: must be one of `A`, `a`, `B`, `F` — enforced with `@IsIn(['A','a','B','F'])`.

**Doctor days**: each item must be one of `Mon Tue Wed Thu Fri Sat` (exact casing).

**Optional string fields** (`phone`, `location`, `time`, `request`, `note`): decorated with both `@IsOptional()` and `@IsString()`. `@IsOptional()` causes class-validator to skip all other validators when the value is `null` or `undefined`, so sending `null` to clear a field is safe and valid.

## Key Behaviors

**`hideF` query param**: defaults to `true` — class-F (colleague) doctors are hidden from list unless `hideF=false` is passed.

**Status sort order**: DEAL → NEVER → NEED_VISIT → RECENT → F, then alphabetically by area, then by name.

**NEED_VISIT threshold**: last visit > 12 days ago.

**DEAL doctors**: hardcoded by name — Abdulrazak Othman, Ayad Fallah, Ahmad Moustafa.

**CORS**: controlled by `CORS_ORIGIN` env var (comma-separated origins). If unset, all origins are allowed (development only — lock down in production).

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase `service_role` or `anon` key |
| `PORT` | No (default 3001) | HTTP port |
| `CORS_ORIGIN` | No | Comma-separated allowed origins |

## Supabase Tables

- **`doctors`** — main doctor records (`id`, `name`, `specialty`, `area`, `location`, `phone`, `days`, `time`, `class`, `request`, `note`, `schedules`)
- **`visits`** — visit log (`id`, `doctor_id`, `visited_at`, `created_at`)
- **`plans`** — weekly day plans (`day`, `doctor_ids`)

## Swagger Docs

Available at `http://localhost:3001/docs` when running locally.
