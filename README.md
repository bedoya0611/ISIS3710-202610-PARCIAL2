# Library Loans API

Backend NestJS para gestionar prestamos de libros, revistas y equipos audiovisuales.

## Stack

- NestJS 10
- PostgreSQL 16 con Docker Compose
- TypeORM con migraciones
- JWT + Passport
- Swagger en `/api/docs`
- Validacion global con `ValidationPipe`

## Arranque rapido

```bash
# 1) Variables de entorno
cp .env.example .env

# 2) Base de datos
docker compose up -d

# 3) Dependencias
npm install

# 4) Migraciones
npm run migration:run

# 5) Desarrollo
npm run start:dev
```

La API queda en:

```text
http://localhost:3000/api
```

Swagger UI queda en:

```text
http://localhost:3000/api/docs
```

Si ya tienes PostgreSQL local usando `5432`, cambia `DB_PORT` en `.env` a un puerto libre, por ejemplo `5433`, y recrea el contenedor:

```bash
docker compose up -d --force-recreate
```

## Scripts

| Script                                                      | Descripcion                     |
| ----------------------------------------------------------- | ------------------------------- |
| `npm run start:dev`                                         | Arranca con hot reload.         |
| `npm run start:prod`                                        | Arranca el build de produccion. |
| `npm run build`                                             | Compila TypeScript a `dist/`.   |
| `npm run lint`                                              | Ejecuta ESLint con autofix.     |
| `npm run format`                                            | Ejecuta Prettier.               |
| `npm test`                                                  | Ejecuta tests unitarios.        |
| `npm run test:cov`                                          | Ejecuta tests con coverage.     |
| `npm run test:e2e`                                          | Ejecuta tests e2e.              |
| `npm run migration:generate src/database/migrations/Nombre` | Genera una migracion.           |
| `npm run migration:run`                                     | Aplica migraciones pendientes.  |
| `npm run migration:revert`                                  | Revierte la ultima migracion.   |

## Variables principales

El arranque valida estas variables con Joi:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_ACCESS_SECRET`, minimo 32 caracteres
- `JWT_REFRESH_SECRET`, minimo 32 caracteres
- `BCRYPT_SALT_ROUNDS`, default `10`
- `MAX_ACTIVE_LOANS`, default `3`
- `DAILY_FINE_RATE`, default `0.50`
- `MAX_LOAN_DAYS`, default `30`

## Usuarios de prueba

No se incluye seed de usuario admin. Para probar localmente, registra un usuario member:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"member@example.com\",\"password\":\"Password123!\",\"firstName\":\"Test\",\"lastName\":\"Member\"}"
```

La respuesta incluye `accessToken`. Para probar endpoints protegidos en Swagger, usa **Authorize** con:

```text
Bearer <accessToken>
```

Si necesitas un rol `admin` o `librarian` en desarrollo local, registra el usuario y actualiza su rol en Postgres:

```bash
docker exec -it library-loans-db psql -U loans -d loans \
  -c "UPDATE users SET role = 'admin' WHERE email = 'member@example.com';"
```

## Endpoints principales

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Items:

- `POST /items`
- `GET /items`
- `GET /items/:id`
- `PATCH /items/:id`
- `DELETE /items/:id`

Loans:

- `POST /loans`
- `GET /loans`
- `GET /loans/:id`
- `PATCH /loans/:id/return`
- `PATCH /loans/:id/mark-lost`

Todos los endpoints de items y loans requieren JWT.

## Reglas de negocio

`LoansService` aplica las reglas criticas:

- R1: `dueAt > loanedAt` y la duracion no puede exceder `MAX_LOAN_DAYS`.
- R2: un item no puede tener otro prestamo si ya existe uno `active` u `overdue`; el error incluye el `loanId` bloqueante.
- R3: un usuario no puede superar `MAX_ACTIVE_LOANS` prestamos simultaneos con status `active` u `overdue`.
- R4: al devolver, la multa usa `Math.ceil` sobre los dias de retraso:
  `fineAmount = daysOverdue * DAILY_FINE_RATE`.
- R5: `returned` y `lost` son terminales.

No se usa cron para vencer prestamos. La decision implementada es actualizar en BD los prestamos `active` vencidos (`dueAt < now()` y `returnedAt IS NULL`) a `overdue` antes de crear, listar, consultar, devolver o marcar perdido un prestamo. Por eso, `GET /loans?status=overdue` devuelve prestamos vencidos aunque no exista un job programado.

## Tests

```bash
npm test
```

Los tests unitarios del `LoansService` usan mocks de repositorios y no requieren base de datos real. Cubren:

- creacion exitosa de prestamo;
- conflicto si el item ya tiene prestamo activo;
- conflicto si el usuario ya tiene 3 prestamos activos;
- calculo de multa al devolver un prestamo vencido.

Tambien hay tests puros para el calculo de multa, incluyendo el caso de dias parciales con `Math.ceil`.
