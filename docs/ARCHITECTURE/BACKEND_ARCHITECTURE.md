# Project Architecture & Engineering Conventions

> **Scope:** This document describes an **engineering system** for a NestJS backend — its layering,
> folder organization, naming, dependency flow, and abstraction patterns. It deliberately excludes
> the business domain. Every rule is stated as a rule: there are no tolerated exceptions, no
> "dominant variants", and no patterns you are expected to weigh before following.
>
> **How to use it:** An AI agent or developer starting an empty repository should be able to read
> this file and build a *completely different* application that is structurally indistinguishable
> from this one.
>
> Throughout the document, domain names are replaced with generic placeholders:
> `<domain>` / `Widget` for a business entity, `<audience>` for an API consumer group,
> `<tech>` for a third-party technology.

---

## 1. Purpose

This blueprint captures a **layered, module-per-domain NestJS architecture** with these defining
characteristics:

1. **Typed, validated configuration** isolated in a `config/` layer, one folder per configuration
   concern, consumed only through injectable getter services.
2. **Infrastructure and third-party integrations** isolated in a `providers/` layer that never
   depends on business code.
3. **Business domains** isolated in `modules/`, each owning its service(s), abstract repository
   contract, concrete ORM implementation, mapper, entity, DTOs, enums, and internal types.
4. **Audience-scoped API composition modules** that assemble controllers from many domains into a
   single consumer-facing API surface, each with its own OpenAPI document.
5. **Repositories declared as abstract classes** used directly as dependency-injection tokens, so
   services depend on a contract and never on the ORM.
6. **A single-direction mapper layer** that converts persistence payloads into domain entities, so
   ORM types never escape the repository.
7. **Response DTOs that own their own mapping** in constructors, so controllers stay thin.
8. **A centralized exception normalization pipeline** that translates any thrown error — domain,
   ORM, HTTP client, validation — into one canonical error shape before serialization.

The intent of the architecture is that **business logic has exactly one home (services)**, and every
other layer is a translator: controllers translate HTTP into service calls, mappers translate
persistence rows into entities, response DTOs translate entities into wire format, and exception
mappers translate failures into responses.

---

## 2. Architectural Philosophy

### 2.1 Core principles observed in the code

| Principle | How the codebase expresses it |
| --- | --- |
| **Dependency inversion at the data boundary** | Services inject `abstract class <Domain>Repository`; the module binds it to a concrete `<Domain>Prisma<Repository>` via `useClass`. |
| **Dependency inversion at the integration boundary** | The provider declares a callback *interface*; the business module *implements* it and passes itself in. The provider never imports business code. |
| **One direction of knowledge** | `modules/` may import from `providers/`, `config/`, and `common/`. None of those may import from `modules/`, without exception. |
| **Explicit contracts over inference** | Input/output shapes are declared as named types in `defs/` rather than inlined or inferred from ORM types. |
| **Composition over inheritance** | Inheritance is used only for genuine base-type reuse (`BaseEntity`, `BaseConfigService`, `BaseModelResponseDto`, `AppException`); everything else composes via constructor injection. |
| **RO-RO (Receive Object, Return Object)** | Service and repository methods with more than one meaningful parameter take a single named input object. |
| **Wire format is never the domain model** | Three distinct representations exist for the same concept: persistence payload → entity → response DTO. |
| **Fail loudly, translate centrally** | Code throws freely; a global filter normalizes, logs, reports, and sanitizes. |

### 2.2 The three representations rule

This is the single most important idea to internalize. For any concept, three types coexist and
must not be conflated:

```
Persistence payload            Domain entity              Wire representation
<Domain>Type                   <Domain>Entity             <Domain>Response / <Domain>ResponseDto
(derived from the ORM)   →     (class, business shape) →  (class, decorated for OpenAPI)
types/<domain>-details-        entity/<domain>.entity.ts  dto/response/model/<domain>.response.ts
  schema.type.ts
        │                            │                            │
        └── mapper/<domain>.mapper.ts┘                            │
                                     └── response DTO constructor ┘
```

**Rule:** a persistence payload type must never reach a controller, and a response DTO must never
reach a repository.

### 2.3 Where each kind of logic belongs

| Kind of logic | Home | Never in |
| --- | --- | --- |
| Business rules, invariants, state transitions, orchestration | `modules/<domain>/<domain>.service.ts` | controllers, repositories, mappers, providers |
| HTTP shape, status codes, route wiring, OpenAPI annotation | controllers + DTOs | services |
| Query construction, ORM specifics, `include`/`where`/`take` building | `modules/<domain>/repository/<domain>-prisma.repository.ts` | services, controllers |
| Third-party SDK / external protocol details | `providers/<tech>/` | any `modules/` file |
| Environment variable reading & validation | `config/<concern>/` | anywhere else (`process.env` outside `config/` is an anti-pattern) |
| Cross-domain reusable primitives (guards, filters, pipes, decorators, base classes, helpers) | `common/` | duplicated inside modules |
| Type conversion between layers | `mapper/` (persistence→entity) and DTO constructors (entity→wire) | services |

---

## 3. High-Level Architecture

### 3.1 Runtime composition

```
main.ts  (bootstrap)
  │  app.use(helmet())                    ── security headers, before routes
  │  enableCors({ origin: <explicit list from config>, … })
  │  useGlobalPipes(new InputValidationPipe())
  │  SwaggerProvider.setupSwagger(app)
  │  reads port from AppConfigService
  ▼
AppModule
  ├── ConfigsModule      ── typed configuration (loaded first, @Global)
  ├── ProviderModule     ── infrastructure & third-party integrations
  ├── FeatureBundleModule── aggregates all audience API modules
  ├── HealthModule       ── /health/live and /health/ready
  ├── ThrottlerModule    ── global rate-limit floor
  ├── APP_GUARD          ── ThrottlerGuard
  └── APP_FILTER × N     ── GlobalExceptionFilter, ValidationExceptionFilter
```

### 3.2 Request flow

```
HTTP request
  ▼
Global pipe  ──────────── InputValidationPipe (class-validator + class-transformer)
  ▼
Guards       ──────────── authentication guard → authorization guard → operational-policy guard
  ▼
Param decorators ─────── inject authenticated principal / request metadata
  ▼
Controller (in an audience API module)
  │   • validates nothing itself (the pipe did it)
  │   • unwraps the request DTO into a named service input object
  │   • wraps the returned entity in a response DTO
  ▼
Service (in the domain module)
  │   • business rules, invariants, cross-domain orchestration
  │   • throws framework/domain exceptions on rule violations
  ▼
Abstract repository (DI token, no implementation)
  ▼
Concrete ORM repository
  │   • builds the query
  │   • calls the ORM client from providers/
  │   • converts the raw payload through the mapper
  ▼
Mapper  ──── returns a domain entity
  ▼
Database / external system
```

### 3.3 Error flow

```
anything thrown anywhere
  ▼
GlobalExceptionFilter (@Catch())
  ▼
normalizeException()
  ├── try specialized mappers first (ORM errors, HTTP-client errors, …)
  ├── then well-known framework/domain exception types
  └── else generic internal-server-error
  ▼
GeneralTypeException  (canonical normalized shape)
  ▼
log  →  report to monitoring (non-user-friendly, non-local only)
  ▼
sanitize if the environment must hide internals
  ▼
transport-specific return handler → serialized response body
```

### 3.4 Two distinct module roles

The word "module" means two different things in this architecture, and conflating them breaks the
design:

| Role | File | Declares | Does **not** declare |
| --- | --- | --- | --- |
| **Domain module** | `modules/<domain>/<domain>.module.ts` | `imports`, `providers` (services + repository bindings), `exports` (services) | `controllers` |
| **Audience API module** | `modules/<audience>-api.module.ts` | `imports` (domain modules), `controllers` (from many domains), `providers` (guards) | services, repositories |

Every `modules/<domain>/<domain>.module.ts` omits `controllers`; the controllers those domains own
are registered in `modules/<audience>-api.module.ts`, one file per consumer group.

**Why:** it lets one OpenAPI document be generated per audience by including only that audience's
module (`swagger-document.definitions.ts` → `include: [<Audience>ApiModule]`), and it lets a single
domain expose different endpoint sets to different consumers without leaking them to each other.

---

## 4. Project Structure

### 4.1 Actual top-level layout

```
backend/
├── src/
│   ├── main.ts                     # bootstrap only
│   ├── app.module.ts               # root composition root
│   │
│   ├── health/                     # liveness & readiness probes
│   │   ├── health.module.ts
│   │   ├── health.controller.ts    # GET /health/live, GET /health/ready
│   │   └── health.service.ts       # dependency checks, each with a timeout
│   │
│   ├── config/                     # typed, validated configuration
│   │   ├── configs.module.ts       # the single ConfigModule.forRoot(); @Global
│   │   ├── base-config.service.ts  # shared typed accessor
│   │   ├── environment.ts          # environment-kind enum
│   │   ├── app/
│   │   │   ├── app-configs.ts          # namespace registration
│   │   │   ├── app-config.schema.ts    # this concern's validation rules
│   │   │   └── app-config.service.ts   # typed getters
│   │   ├── database/
│   │   ├── jwt/
│   │   └── swagger/
│   │
│   ├── providers/                  # infrastructure & third-party integrations
│   │   ├── provider.module.ts      # aggregator
│   │   ├── database/
│   │   │   ├── database-provider.module.ts
│   │   │   └── prisma/
│   │   │       ├── prisma-provider.module.ts
│   │   │       ├── prisma-provider.service.ts
│   │   │       └── prisma-transaction-runner.ts   # implements the TransactionRunner contract
│   │   ├── jwt/
│   │   │   ├── jwt-provider.module.ts
│   │   │   ├── jwt-token.service.ts
│   │   │   └── exceptions/
│   │   ├── <tech>/                 # e.g. an external messaging platform
│   │   │   ├── <tech>-provider.module.ts
│   │   │   ├── <tech>-manager.service.ts
│   │   │   ├── defs/               # provider-owned data shapes
│   │   │   └── interfaces/         # callback contracts the domain implements
│   │   └── swagger/
│   │       ├── swagger.provider.ts
│   │       ├── swagger-document.factory.ts
│   │       ├── swagger-document.definitions.ts
│   │       └── consts.ts
│   │
│   ├── authentication/             # authentication concern (peer of modules/)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── forget-password.controller.ts
│   │   ├── forget-password.service.ts
│   │   ├── strategies/
│   │   ├── dto/{request,response}/
│   │   └── types/
│   │
│   ├── modules/                    # business domains + API composition
│   │   ├── feature-bundle.module.ts
│   │   ├── <audience>-api.module.ts        # one per API audience
│   │   └── <domain>/
│   │       ├── <domain>.module.ts
│   │       ├── <domain>.service.ts
│   │       ├── <domain>.controller.ts
│   │       ├── <domain>.<audience>.controller.ts
│   │       ├── defs/
│   │       ├── dto/{request,response}/
│   │       ├── dto/response/model/
│   │       ├── entity/
│   │       ├── enum/
│   │       ├── exceptions/
│   │       ├── mapper/
│   │       ├── repository/
│   │       ├── types/
│   │       └── zod/
│   │
│   └── common/                     # cross-cutting, domain-agnostic building blocks
│       ├── auth/                   # Principal contract
│       ├── base/                   # BaseEntity, TransactionRunner + TransactionContext
│       ├── constants/
│       ├── decorators/{requests,route}/
│       ├── exceptions/             # AppException, ErrorKind, semantic bases
│       ├── filter/
│       │   ├── global-exception.filter.ts
│       │   ├── validation-exception.filter.ts
│       │   ├── exception_mappers/
│       │   └── exception_return_handler/
│       ├── guards/
│       ├── helpers/
│       └── pipes/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── legacy-sql/                    # historical loose SQL; not executed by Migrate
│   └── migrations/
│       ├── migration_lock.toml
│       └── <timestamp>_<name>/migration.sql
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── eslint.config.mjs
├── .prettierrc
├── .editorconfig
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

### 4.2 Layer dependency diagram

```
                 ┌──────────────────────────────┐
                 │      main.ts / AppModule     │
                 └──────────────┬───────────────┘
                                │
        ┌───────────────┬───────┴────────┬──────────────────┐
        ▼               ▼                ▼                  ▼
   ConfigsModule   ProviderModule   FeatureBundleModule   APP_FILTERs
        │               │                │
        │               │                ▼
        │               │      <audience>-api.module.ts  ── controllers
        │               │                │
        │               │                ▼
        │               │        modules/<domain>/  ── services ── repositories
        │               │                │  │
        │               └────────────────┘  │   providers may be injected into
        │      (modules → providers, one way)│   services and repositories
        │                                    │
        └────────────────────────────────────┘
               (modules → config, one way)

        common/  ← imported by every layer; imports nothing from modules/, ever
```

---

## 5. Folder Responsibilities

For each folder: purpose, what belongs, what does not, when to add a file, and whether it is
mandatory.

### 5.1 `src/main.ts` — mandatory, shared

* **Purpose:** process bootstrap only.
* **Belongs:** application factory call, security-header middleware, the explicit CORS policy, global
  pipe registration, documentation setup, request body-size limit, reading the listen port from the
  configuration service, startup logging.
* **Does not belong:** any business logic, any route, any direct `process.env` read, any provider
  instantiation.
* **Rule:** global *filters* and *guards* are registered declaratively in the root module via
  `APP_FILTER` / `APP_GUARD`, not imperatively here — they need dependency injection.
* **Rule:** security headers are installed before anything else, and CORS is always configured with
  an explicit origin list (§19.2).

### 5.2 `src/app.module.ts` — mandatory, shared

* **Purpose:** the composition root.
* **Belongs:** the three aggregator imports (configuration, providers, features), the health module,
  the rate-limiter registration, and global filter/guard registrations.
* **Does not belong:** individual domain modules, individual providers, individual config concerns.
  Aggregators exist so this file never grows.

### 5.3 `src/config/` — mandatory, shared

* **Purpose:** turn untyped environment variables into validated, typed, injectable values.
* **Belongs:** one subfolder per configuration *concern* (application, database, token signing,
  documentation, and any new one), each with three files; plus the shared base accessor, the
  environment-kind enum, and the aggregator.
* **Does not belong:** business constants (those go to `common/constants/`), secrets (they live only
  in the environment), consumption logic.
* **Add a file when:** a new *group* of related environment variables is introduced.
* **Detail:** [§7](#7-configuration-architecture).

### 5.4 `src/providers/` — mandatory, shared

* **Purpose:** own all knowledge of the outside world — databases, SDKs, external protocols,
  documentation tooling.
* **Belongs:** one subfolder per external technology, each with a module and one or more services;
  optional `defs/` for provider-owned data shapes, `interfaces/` for callback contracts,
  `exceptions/` for provider-specific error types.
* **Does not belong:** business rules, domain entities, domain enums, or any import from
  `modules/`. A provider must be reusable in a different application without modification.
* **Add a file when:** integrating any new external system or SDK.
* **Detail:** [§8](#8-provider--infrastructure-architecture).

### 5.5 `src/modules/` — mandatory

* **Purpose:** business domains, plus the audience API composition layer.
* **Belongs (root level):** the feature aggregator and one `<audience>-api.module.ts` per API
  consumer group. Nothing else.
* **Belongs (per domain folder):** the domain module, its services, its controllers, and the
  supporting subfolders in [§6](#6-module-architecture).
* **Does not belong:** shared utilities, framework plumbing, provider code.
* **Detail:** [§6](#6-module-architecture).

### 5.6 `src/authentication/` — optional, shared

* **Purpose:** the authentication concern — credential verification, passport strategies, token
  issuance endpoints, credential-recovery flow.
* **Belongs:** the module, its services, its controllers, `strategies/`, `dto/{request,response}/`,
  and `types/` for token payload shapes.
* **Does not belong:** authorization decisions (those are guards in `common/guards/`), principal
  persistence (that belongs to the principal's own domain module, which this module imports), and its
  own `controllers` — those are registered by each audience module that exposes them, see
  [§9.6](#96-where-controllers-are-registered).

### 5.7 `src/common/` — mandatory, shared

* **Purpose:** domain-agnostic building blocks used by two or more places.
* Subfolders:

| Subfolder | Contains | Mandatory |
| --- | --- | --- |
| `auth/` | the `Principal` contract shared guards and decorators authorize against | yes |
| `base/` | base entity, base response classes, shared schema primitives, generic type utilities, the `TransactionRunner` contract and its opaque `TransactionContext` | yes |
| `constants/` | frozen literal values shared across domains | yes |
| `decorators/requests/` | parameter decorators that extract data from the request | yes |
| `decorators/route/` | metadata-setting decorators consumed by guards | yes |
| `exceptions/` | `AppException`, the `ErrorKind` enum, and one semantic base per kind | yes |
| `filter/` | exception filters, plus `exception_mappers/` and `exception_return_handler/` | yes |
| `guards/` | authentication and role-authorization guards | yes |
| `helpers/` | pure stateless functions and small utility classes | yes |
| `pipes/` | validation and transformation pipes | yes |

* **Does not belong:** anything used by exactly one domain, anything domain-named, anything
  requiring knowledge of a specific business rule.
* **Detail:** [§14](#14-shared--common-architecture).

### 5.8 `prisma/` — mandatory (data layer definition)

* **Purpose:** the single source of truth for the database schema, migrations, and local seed data.
* **Belongs:** the schema file, generated migration folders (`migrations/<timestamp>_<name>/migration.sql`), `migration_lock.toml`, and the seeding script.
* **Does not belong:** any query. Queries live in repository implementations. Loose `migrations/<name>.sql` files are not Prisma migrations; historical copies live in `legacy-sql/` and are not executed.

### 5.9 `test/` — mandatory

* **Purpose:** end-to-end tests and their dedicated runner configuration.
* **Does not belong:** unit specs — those are colocated in `src/` beside the file under test, per the
  runner configuration. See [§20](#20-testing-architecture).

---

## 6. Module Architecture

### 6.1 What defines a domain module

A domain module is a folder under `modules/` named after one business concept, containing a NestJS
module class that:

1. imports the infrastructure modules and peer domain modules it needs;
2. provides its services and binds each abstract repository to a concrete implementation;
3. exports **only its services** (and, where a peer domain legitimately needs raw data access, its
   repository token);
4. declares **no controllers**.

**Evidence — the pattern repeats identically across five domains:**

```ts
// modules/<domain>/<domain>.module.ts
@Module({
  imports: [DatabaseProviderModule, /* peer domain modules */],
  providers: [
    <Domain>Service,
    { provide: <Domain>Repository, useClass: <Domain>PrismaRepository },
  ],
  exports: [<Domain>Service],
})
export class <Domain>Module {}
```

### 6.2 Canonical module template

```
modules/<domain>/
├── <domain>.module.ts                   # MANDATORY — wiring only
├── <domain>.service.ts                  # MANDATORY — business logic
├── <domain>-<aspect>.service.ts         # OPTIONAL  — second service for a cohesive sub-concern
├── <domain>.controller.ts               # OPTIONAL  — default-audience endpoints
├── <domain>.<audience>.controller.ts    # OPTIONAL  — audience-specific endpoints
│
├── decorators/                          # OPTIONAL  — decorators needing a domain type
│   └── <purpose>.decorator.ts
│
├── defs/                                # MANDATORY when methods take multi-field inputs
│   ├── <domain>-service.defs.ts         #   *ServiceInput types
│   └── <domain>-repository.defs.ts      #   *RepoInput types
│
├── dto/                                 # MANDATORY when the domain has endpoints
│   ├── request/
│   │   └── <verb>-<domain>-request.dto.ts
│   └── response/
│       ├── model/
│       │   └── <domain>.response.ts     #   reusable entity projection
│       └── <purpose>-response.dto.ts    #   endpoint envelopes
│
├── entity/                              # MANDATORY when the domain is persisted
│   └── <domain>.entity.ts
│
├── enum/                                # OPTIONAL
│   └── general.enum.ts
│
├── exceptions/                          # OPTIONAL  — domain conditions worth naming
│   └── <domain>-<reason>.exception.ts   #   extends a semantic base from common/exceptions/
│
├── guards/                              # OPTIONAL  — guards that inject this domain's services
│   └── <purpose>.guard.ts
│
├── mapper/                              # MANDATORY when the domain is persisted
│   └── <domain>.mapper.ts
│
├── repository/                          # MANDATORY when the domain is persisted
│   ├── <domain>.repository.ts           #   abstract class = DI token
│   ├── <domain>-prisma.repository.ts    #   concrete implementation
│   ├── <domain>-read-model.repository.ts        # OPTIONAL — cross-domain report queries
│   └── <domain>-read-model-prisma.repository.ts #   read-only, projections only
│
├── types/                               # MANDATORY when relations are loaded
│   ├── <domain>-details-schema.type.ts  #   persistence payload type
│   └── <domain>-details.include.ts      #   reusable relation selection
│
└── zod/                                 # COMMON — entity shape schema
    └── <domain>.zod.ts
```

### 6.3 Mandatory vs optional, by module complexity

There are three tiers. Match the tier to actual need — do not create empty folders.

| Tier | When | Files present |
| --- | --- | --- |
| **Minimal** | read-only or query-only concern, no owned table | module + service (+ its request DTO). Types may be declared inline in the service file. |
| **Standard** | one persisted concept | module, service, entity, mapper, abstract + concrete repository, `defs/`, `dto/`, `types/`, `zod/` |
| **Rich** | a persisted concept with sub-aspects and several audiences | Standard, plus additional `<domain>-<aspect>.service.ts`, additional entities/repositories for satellite tables, and one controller per audience |

A domain moves up a tier when the need appears, never in anticipation: add `zod/` when the entity
exists, add a second service when one accumulates two unrelated responsibilities, add a second
controller when a second audience needs a different endpoint set.

### 6.4 How modules expose functionality

* **Exposed:** services, via the module's `exports` array. A service is the public API of a domain.
* **Also exposed in some cases:** the abstract repository token, when a peer domain needs unmapped
  data access. Treat this as a deliberate, reviewed exception rather than a default.
* **Never exposed:** concrete repository implementations, mappers, entities-as-contracts (they are
  importable types but must not be constructed outside the domain), private helper services.

### 6.5 How modules communicate

Cross-module communication is **synchronous constructor injection of the peer domain's service**.
There is no event bus, no message queue, and no mediator — the call graph is the architecture, and
keeping it explicit is what makes ownership readable.

```ts
// modules/<domain-a>/<domain-a>.module.ts
@Module({ imports: [DomainBModule], … })

// modules/<domain-a>/<domain-a>.service.ts
constructor(
  private readonly domainARepository: DomainARepository,   // own data access
  private readonly domainBService: DomainBService,          // peer domain, via its service
) {}
```

**Rules:**

1. A service may call another domain's **service**. It must never call another domain's
   **repository** unless that repository token is explicitly exported and the dependency is
   reviewed.
2. Orchestration across domains belongs in the service of the domain that *owns the outcome*.
3. Avoid mutual imports. If two domains need each other, the shared behaviour belongs in a third
   module or the direction of ownership is wrong.
4. Where a module needs to be importable by a peer that it also depends on, verify no cycle exists.
   Never leave a module symbol imported while `imports: []` — either the dependency is real and
   declared, or the import should be gone.

### 6.6 Registering a new module

```
modules/<domain>/<domain>.module.ts        ← create
modules/<audience>-api.module.ts           ← add the domain module to `imports`
                                             and its controller(s) to `controllers`
```

The feature aggregator and root module require **no change** when a new domain is added — only the
relevant audience module does. This is the intended extension point.

---

## 7. Configuration Architecture

### 7.1 Structure

**The framework's `ConfigModule.forRoot()` is called exactly once, in `configs.module.ts`.** A
configuration concern is not a Nest module — it is a folder of three plain files that the root
composes:

```
config/<concern>/
├── <concern>-configs.ts        # namespace registration; the only place process.env is read
├── <concern>-config.schema.ts  # this concern's validation rules, as a plain rule object
└── <concern>-config.service.ts # typed getters over the namespace
```

Plus three shared files at the `config/` root:

```
config/
├── configs.module.ts        # the single ConfigModule.forRoot(); provides + exports every config service
├── base-config.service.ts   # generic typed accessor all config services extend
└── environment.ts           # enum of environment kinds
```

**Why once.** `ConfigModule.forRoot()` loads the environment file, applies a validation schema, and
builds the configuration store. Calling it per concern re-runs that work, and — because each call
validates only its own subset — no single invocation ever sees the whole environment. That makes
validation results depend on module resolution order, and it lets an unknown or misspelled variable
pass everywhere because no schema claims it. One root call with one merged schema validates the
entire environment once, at startup, before anything is constructed.

### 7.2 The three files, generically

**1 — namespace registration.** Maps `UPPER_SNAKE_CASE` environment variables to a namespaced,
camelCase object. This is the *only* place `process.env` may be read.

```ts
// config/<concern>/<concern>-configs.ts
import { registerAs } from '@nestjs/config';

export default [
  registerAs('<concern>', () => ({
    url: process.env.API_BASE_URL,
    apiKey: process.env.THIRD_PARTY_API_KEY,
  })),
];
```

A concern may register **several sub-namespaces** in the same array when its variables form distinct
groups (`'<concern>.<group>'`).

**2 — validation rules.** The concern owns the rules for *its* variables and exports them as a plain
object, so the root can merge every concern into one schema.

```ts
// config/<concern>/<concern>-config.schema.ts
export const <concern>ConfigSchema = {
  API_BASE_URL: Joi.string().uri().required(),
  THIRD_PARTY_API_KEY: Joi.string().required(),
  OPTIONAL_FLAG: Joi.string().default('default-value'),
} as const;
```

**3 — config service.** Exposes one typed getter per value. Getters are named for the *domain
meaning*, not the variable name.

```ts
// config/<concern>/<concern>-config.service.ts
@Injectable()
export class <Concern>ConfigService extends BaseConfigService {
  get url(): string {
    return this.getValue<string>('<concern>.url');
  }

  get apiKey(): string {
    return this.getValue<string>('<concern>.apiKey');
  }
}
```

The shared base provides the single generic accessor:

```ts
// config/base-config.service.ts
@Injectable()
export class BaseConfigService {
  constructor(private readonly configService: ConfigService) {}

  getValue<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing configuration key: ${key}`);
    }
    return value;
  }
}
```

The throw is not defensive noise. Every getter declares a non-optional return type, so a mistyped
namespace path would otherwise hand back `undefined` behind a `: string` signature and surface much
later as a mysterious default. Failing at the first read turns that into an immediate, named error.

**The root module — the only `forRoot()`.** It loads every concern's namespaces, validates the merged
schema, and exposes every concern's typed service. This is the one module where `@Global()` is
warranted (§8.4): configuration is a leaf dependency with no cycles, needed nearly everywhere, and
importing it explicitly into every module communicates nothing.

```ts
// config/configs.module.ts
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [...appConfigs, ...databaseConfigs, ...tokenConfigs],
      validationSchema: Joi.object({
        ...appConfigSchema,
        ...databaseConfigSchema,
        ...tokenConfigSchema,
      }),
      validationOptions: { abortEarly: false, allowUnknown: false },
    }),
  ],
  providers: [AppConfigService, DatabaseConfigService, TokenConfigService],
  exports: [AppConfigService, DatabaseConfigService, TokenConfigService],
})
export class ConfigsModule {}
```

`allowUnknown: false` is the payoff of merging: with every concern's rules in one schema, a variable
nobody declared is a startup failure rather than a silent typo.

### 7.3 Conventions

| Aspect | Convention |
| --- | --- |
| Environment variable names | `UPPER_SNAKE_CASE`, prefixed by concern (`DATABASE_URL`, `API_BASE_URL`, `THIRD_PARTY_API_KEY`, `TOKEN_SECRET_KEY`, `TOKEN_EXPIRES_IN`) |
| Namespace keys | lowercase, dot-separated (`'app'`, `'db'`, `'token.access'`) |
| Property names inside a namespace | `camelCase` |
| Getter names | domain meaning, no `get` prefix (`url`, `port`, `apiKey`, `env`) |
| Required vs optional | required secrets use `.required()`; non-secret values use `.default(…)` |
| Environment kinds | a dedicated enum, referenced in validation via `.valid(...Object.values(Enum))` |
| Secrets | never committed, never defaulted, never logged; only names appear in code |

### 7.4 Consumption rule

> **Configuration is consumed only through an injected `<Concern>ConfigService`.**
> Never inject the framework's generic config service into business code. Never read `process.env`
> outside `config/<concern>/<concern>-configs.ts`.

Two consumption sites exist and both are legitimate:

* **Injected**, in services, guards, filters, and provider factories.
* **Resolved from the application instance** during bootstrap, before the injector is available to
  request-scoped code (`app.get(<Concern>ConfigService)`).

Configuration also drives conditional infrastructure: documentation is registered only for a
whitelisted set of environment kinds, and error detail is suppressed outside development-like
environments.

The merged API's video integration follows the same centralized configuration path. `VIDEO_ENABLED`
defaults to `false`; in that state the API neither requires LiveKit credentials nor constructs the
LiveKit SDK provider. Video endpoints return `503` with `VIDEO_SERVICE_UNAVAILABLE`, while appointment
video joins/completions, webhook processing, and room cleanup remain side-effect free. Set
`VIDEO_ENABLED=true` to require `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` and bind the
LiveKit provider. The feature flag is consumed through `LivekitConfigService`, not read by business
code directly from the environment.

### 7.5 Adding a new configuration value — procedure

1. Add the variable to the environment file and to any example/template file, **name only**.
2. If it belongs to an existing concern: add it to that concern's registration object, add a rule to
   that concern's schema object, and add one typed getter to that concern's config service.
3. If it starts a new concern: create the three-file folder, then spread its namespaces into `load`
   and its rules into the merged `validationSchema` in `configs.module.ts`, and register its service
   in that module's `providers`/`exports`. Never add a second `ConfigModule.forRoot()`.
4. Consume it by injecting the config service. Never widen an unrelated concern to host it.
5. Verify the getter path matches the `registerAs` key exactly — the base accessor will throw on a
   mismatch, but only when that getter is first read.

### 7.6 Provider factories consume configuration asynchronously

Third-party modules that need configuration at construction time use the async factory form. Because
the configuration root is global, the factory injects the typed service without importing a config
module:

```ts
@Module({
  imports: [
    <Vendor>Module.registerAsync({
      inject: [<Concern>ConfigService],
      useFactory: async (configService: <Concern>ConfigService) => ({
        secret: configService.secretKey,
        options: { expiresIn: configService.expiresIn },
      }),
    }),
  ],
})
```

Inject the **typed** service here, never the framework's generic `ConfigService` — the factory is
exactly where an untyped `get('some.key')` would go unnoticed.

---

## 8. Provider / Infrastructure Architecture

### 8.1 What qualifies as a provider

A provider is any code whose reason to change is an **external system**, not a business rule:

* database clients and connection lifecycle
* third-party SDK wrappers and external protocol clients
* token signing/verification
* API documentation generation
* (by extension) mail transports, object storage, payment gateways, push notification services

**Test:** if you could copy the folder into an unrelated application and it would still compile and
make sense, it is correctly placed in `providers/`.

### 8.2 Structure

```
providers/
├── provider.module.ts          # aggregator; re-exports providers needed by domain modules
├── database/
│   ├── database-provider.module.ts   # technology-neutral grouping module
│   └── <orm>/
│       ├── <orm>-provider.module.ts  # @Global — the database client is one of the two exceptions
│       └── <orm>-provider.service.ts # client + lifecycle hooks
├── <vendor>/
│   ├── <vendor>-provider.module.ts
│   ├── <vendor>-token.service.ts     # or <vendor>-manager.service.ts
│   └── exceptions/
│       └── <vendor>-<reason>.exception.ts
└── <tech>/
    ├── <tech>-provider.module.ts
    ├── <tech>-manager.service.ts
    ├── defs/
    │   └── <tech>-manager.defs.ts    # provider-owned data shapes
    └── interfaces/
        └── <tech>-event-handlers.interface.ts  # callback contract
```

### 8.3 Naming conventions

| Artifact | Convention | Example |
| --- | --- | --- |
| Folder | lowercase technology name | `providers/<tech>/` |
| Module file | `<tech>-provider.module.ts` | class `<Tech>ProviderModule` |
| Service file | `<tech>-<role>.service.ts` where role is `manager`, `token`, `provider`, … | class `<Tech>ManagerService` |
| Data shapes | `defs/<tech>-<subject>.defs.ts` | `interface <Tech>ClientSession` |
| Callback contract | `interfaces/<tech>-<subject>.interface.ts` | `interface <Tech>EventHandlers` |
| Provider exception | `exceptions/<tech>-<reason>.exception.ts` | class `<Tech>InvalidException` |
| Non-injectable helper | `<tech>.provider.ts` with `static` methods, or `<tech>-*.factory.ts` with an exported function | `class SwaggerProvider`, `createSwaggerDocument()` |

### 8.4 Grouping and globality

* A **technology family** gets a neutral grouping module that imports the concrete implementation
  module (`database-provider.module.ts` → `<orm>-provider.module.ts`). This is what makes swapping
  the implementation a one-line change.
* Non-global providers are imported explicitly by the modules that use them, and re-exported by the
  grouping module if a consumer needs them transitively.

**`@Global()` is a closed list, not a convenience.** A module's `imports` array is the honest
declaration of what it depends on; making a provider global deletes that declaration everywhere at
once. The cost is not theoretical — you lose the ability to read a module and know what it touches,
`grep` for consumers of an integration, or replace a provider in one test module without affecting
another. Exactly two categories qualify, and both share the same property: they are leaf
infrastructure with no domain meaning, so listing them would communicate nothing.

| Module | Global? | Why |
| --- | --- | --- |
| Configuration root (`ConfigsModule`) | **Yes** | Needed by nearly every layer, depends on nothing, and its presence in an `imports` array tells a reader nothing they did not assume. |
| Database client provider | **Yes** | Every repository needs it and only repositories use it; the ORM client is already the one unavoidable infrastructure dependency. |
| Every third-party integration (payments, messaging, storage, email, search, …) | **No** | Which modules talk to a payment gateway is exactly the kind of fact the dependency graph should make visible. |
| Every domain module | **No** | Never, under any circumstances. |

If a third integration starts to feel like it "should" be global, that is a signal too many modules
depend on it — the answer is to look at why, not to hide it. New global modules require the same
scrutiny as a new layer.

### 8.5 Lifecycle ownership

Providers own connection and session lifecycles through framework lifecycle hooks, never the domain:

```ts
@Injectable()
export class <Orm>Service extends <OrmClient> implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> { await this.connect(); }
  async onModuleDestroy(): Promise<void> { await this.disconnect(); }
}
```

Long-lived external sessions are held in provider-private state (e.g. a `Map` keyed by owner id) and
cleaned up in `onModuleDestroy`.

### 8.6 The inversion-of-control pattern for stateful integrations — key design

When an external system pushes events, the provider must react to them *without knowing anything
about the business*. The codebase solves this by having the **provider declare the callback
contract** and the **domain module implement it**:

```
providers/<tech>/interfaces/<tech>-event-handlers.interface.ts
    interface <Tech>EventHandlers {
      handle<Event>(session: <Tech>ClientSession, payload: <Payload>): Promise<void>;
      …
    }
              ▲                                       │
              │ implements                            │ accepts as a parameter
              │                                       ▼
modules/<domain>/<tech>-event-handlers-implements.service.ts
    @Injectable()
    class <Tech>EventHandlersImplementsService implements <Tech>EventHandlers { … }
```

The provider's initialization method takes the handler object and binds it to the SDK's events:

```ts
// provider
async initializeSession(ownerId: number, eventHandlers: <Tech>EventHandlers): Promise<void> { … }

private async setupClientEvents(session, eventHandlers): Promise<void> {
  client.on('<event>', eventHandlers.handle<Event>.bind(eventHandlers, session));
}
```

The domain service supplies the implementation:

```ts
// modules/<domain>/<domain>.service.ts
await this.<tech>Manager.initializeSession(ownerId, this.<tech>EventHandlersImplementsService);
```

**Result:** the dependency arrow points from `modules/` to `providers/` only. Persistence side
effects triggered by external events live in the domain module, where they belong; SDK wiring lives
in the provider.

**Rule:** never let a provider import a repository, entity, service, or enum from `modules/`. If a
provider seems to need one, invert with an interface instead.

### 8.7 Provider error handling

Two deliberate strategies coexist; pick per operation semantics:

| Strategy | Use when | Shape |
| --- | --- | --- |
| **Throw a typed provider exception** | the caller must react to this specific failure | a class in `providers/<tech>/exceptions/` extending the application exception base, with `code`, `kind` (usually `DEPENDENCY_FAILURE`), and a user-friendliness flag — never a status code |
| **Log and return a boolean/null** | the operation is best-effort or bulk, and partial failure is normal | `catch` → `logger.error(...)` → `return false` / `return null` |

Errors raised by external HTTP clients and by the ORM are **not** wrapped at the call site; they are
normalized centrally by the exception mappers ([§17](#17-error-handling)).

### 8.8 How business modules consume providers

```ts
// modules/<domain>/<domain>.module.ts
@Module({ imports: [<Tech>ProviderModule], … })

// modules/<domain>/<domain>.service.ts
constructor(private readonly <tech>Manager: <Tech>ManagerService) {}
```

The domain service is a **thin façade with business meaning**: it translates domain vocabulary into
provider calls, adds ownership/authorization context, records outcomes through its repository, and
aggregates bulk results. It must not contain SDK types, connection handling, or protocol formatting.

### 8.9 Documentation as a provider — the audience-scoped document pattern

Documentation generation lives in `providers/swagger/` and is composed of four files:

```
consts.ts                       # UI root path, per-audience JSON paths, display names
swagger-document.definitions.ts # data table: one entry per audience
swagger-document.factory.ts     # pure function: (app, config, definition) → document
swagger.provider.ts             # static setup class: guards by environment, registers routes + UI
```

The definition table is the extension point — adding an audience means adding one entry:

```ts
export type SwaggerDocumentDefinition = {
  readonly name: string;
  readonly titleSuffix: string;
  readonly description: string;
  readonly jsonPath: string;
  readonly include: readonly Type<unknown>[];   // the audience API module
  readonly hasBearerAuth: boolean;
};

export const SWAGGER_DOCUMENT_DEFINITIONS: readonly SwaggerDocumentDefinition[] = [ … ] as const;
```

Note the style markers used consistently in this provider: `readonly` on every field, `as const` on
the table, `satisfies`-free explicit typing, and a pure factory function separated from the
imperative registration class.

---

## 9. API Architecture

### 9.1 Structure and audience scoping

Controllers live **inside their domain folder** but are **registered in an audience API module**.

```
modules/
├── <audience>-api.module.ts            # registers controllers from many domains
└── <domain>/
    ├── <domain>.controller.ts          # default audience
    ├── <domain>.<audience>.controller.ts
    └── …
```

```ts
// modules/<audience>-api.module.ts
@Module({
  imports: [AuthModule, <DomainA>Module, <DomainB>Module],
  controllers: [<DomainA><Audience>Controller, <DomainB><Audience>Controller],
  providers: [AuthenticationGuard, AuthorizationGuard],
})
export class <Audience>ApiModule {}
```

### 9.2 Controller file and class naming

| Situation | File | Class |
| --- | --- | --- |
| Single/default audience | `<domain>.controller.ts` | `<Domain>Controller` |
| Audience-specific | `<domain>.<audience>.controller.ts` | `<Domain><Audience>Controller` |

The audience token is an **infix segment separated by dots**, not a suffix or a folder. Route paths
carry the audience prefix where the audience is privileged: `@Controller('<audience>/<resource>')`.

### 9.3 Controller anatomy

```ts
@ApiTags('<Audience> - <Resource>')
@Controller('<audience>/<resource>')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Roles(Role.<PRIVILEGED>)
@ApiBearerAuth()
export class <Domain><Audience>Controller {
  constructor(
    private readonly <domain>Service: <Domain>Service,
    private readonly <aspect>Service: <Aspect>Service,
  ) {}

  @Post()
  @ApiOperation({ summary: '…' })
  @ApiBody({ type: Create<Domain>RequestDto })
  @ApiResponse({ status: 201, type: Create<Domain>ResponseDto })
  async create<Domain>(
    @Body() input: Create<Domain>RequestDto,
    @LoggedInUser() currentUser: PrincipalEntity,
  ): Promise<Create<Domain>ResponseDto> {
    const entity = await this.<domain>Service.create<Domain>({
      fieldA: input.fieldA,
      fieldB: input.fieldB,
      ownerId: currentUser.id,
    });
    return new Create<Domain>ResponseDto(entity);
  }
}
```

Decorator order is consistent throughout: class-level `@ApiTags` → `@Controller` → `@UseGuards` →
`@Roles` → `@ApiBearerAuth`; method-level HTTP verb → `@ApiOperation` → `@ApiParam`/`@ApiBody` →
`@ApiResponse`(s) → handler.

### 9.4 Controller responsibilities

**Must do — and nothing more:**

1. Declare the route, verb, guards, and OpenAPI metadata.
2. Bind inputs via `@Body`, `@Query`, `@Param('id', ParseIntPipe)`, and parameter decorators for
   request context.
3. **Explicitly destructure** the request DTO into the service's named input object — field by field,
   never by spreading the whole DTO. This is what keeps the wire contract and the service contract
   independently evolvable.
4. Derive scoping values from the authenticated principal rather than trusting the client.
5. Wrap the returned entity in a response DTO: `new <Purpose>ResponseDto(entity)`, or
   `entities.map((e) => new <Domain>Response(e))` for collections.

**Must not do:** query the database, call a repository, contain business branching, perform
validation the pipe already performs, or return an entity directly.

**Observed acceptable exception:** a controller may throw an HTTP exception for a *request-shape*
precondition that is not a business rule — e.g. the authenticated principal lacks a scoping
attribute the route requires. Anything that is a business invariant belongs in the service.

### 9.5 Validation, authentication, authorization at the API layer

| Concern | Mechanism | Location |
| --- | --- | --- |
| Input validation | a global validation pipe with `transform: true` and a custom exception factory | `common/pipes/` |
| Authentication | a passport-based guard, bypassable via a public-route metadata decorator | `common/guards/` + `common/decorators/route/` |
| Authorization by role | a reflector-based guard reading role metadata from handler or class | `common/guards/` + `common/decorators/route/` |
| Operational policy | a guard injecting a domain service to assert the principal's account may act | `modules/<domain>/guards/` — it depends on a domain service |
| Alternative token scheme | a bespoke guard extracting a custom header, validating via a domain token service, and attaching the payload to the request | `modules/<domain>/guards/`, with its parameter decorator in `modules/<domain>/decorators/` |

Guards are applied per controller or per handler with `@UseGuards(...)`, and are also listed in the
audience module's `providers` array so their dependencies resolve. There is no global guard.

### 9.6 Where controllers are registered

Controllers are registered in the audience API module that serves them, and nowhere else. A domain
module never declares `controllers`, and neither does a cross-cutting concern module such as
authentication — a concern that exposes routes to every audience is registered in every audience
module, which keeps each OpenAPI document complete and makes the route inventory of an audience
readable from a single file.

**Rule:** one registration site per controller, always an `<audience>-api.module.ts`.

### 9.7 Response formatting

There is **no global response envelope or serialization interceptor**. Each handler returns a
concrete DTO instance, and the framework serializes it. The DTO *is* the contract.

Consequences to respect:

* Every handler's return type must be an explicit DTO class (or a primitive/inline object for
  trivial diagnostics).
* Response shaping happens in DTO constructors, not in interceptors.
* A shared `BaseMessageResponse` (`{ message, status }`) is the standard return for commands with no
  meaningful payload.
* A shared `BaseModelResponseDto` (`{ id, createdAt, updatedAt }`) is the base class for every entity
  projection.

### 9.8 Pagination, filtering, sorting

Uniform across every list endpoint:

| Concern | Convention |
| --- | --- |
| Pagination | `limit` / `offset` query parameters, optional, `@IsNumber()` + `@Min(…)` + `@Transform(({ value }) => parseInt(value))` |
| Defaults | applied in the **service** or **repository** (`input.limit ?? 20`, `input.offset ?? 0`), never in the DTO |
| Filtering | one optional query field per filter; the repository conditionally builds a `where` object, adding a clause only when the field is defined |
| Sorting | fixed per query inside the repository (`orderBy`), not client-controlled |
| Totals | `total` is a **real count of all matching rows**, produced by a count query — see below |

**`total` is never derived from the page.** A response that says `total: 20` for a page of twenty
rows out of four hundred and fifty is not an approximation, it is a wrong answer: the client renders
one page of pagination controls and the remaining four hundred and thirty rows become unreachable. A
field named `total` is a promise about the whole result set, and page length cannot keep it.

So a list endpoint picks one of exactly two shapes, and states which in its response DTO:

**Offset pagination with a real count** — the default. The repository returns the page and the count
from the same filter, in one round trip:

```ts
const [items, total] = await this.<orm>Service.$transaction([
  this.<orm>Service.<domain>.findMany({ where, take, skip, orderBy }),
  this.<orm>Service.<domain>.count({ where }),
]);
```

The count must use the **same `where`** as the page. Two filters that drift apart produce a total
that contradicts its own list.

**Cursor pagination with `hasMore`** — for large or hot collections where counting every matching row
on each request is too expensive, and for infinite-scroll clients that never render page numbers. The
repository fetches `limit + 1` rows, returns `limit` of them, and reports whether the extra row
existed. The envelope then exposes `hasMore` and `nextCursor` and **omits `total` entirely** — an
absent field is honest, a fabricated one is not.

Never return `total: null`, `total: -1`, or `total` computed from `items.length` as a placeholder.
If you cannot count it, do not claim it.

Canonical filter construction in the repository:

```ts
const where: <Orm>.<Domain>WhereInput = {};
if (input.status) where.status = input.status;
if (input.ownerId) where.ownerId = input.ownerId;
if (input.dateFrom || input.dateTo) {
  where.date = {};
  if (input.dateFrom) where.date.gte = input.dateFrom;
  if (input.dateTo) where.date.lte = input.dateTo;
}
```

### 9.9 API versioning

**Not implemented, deliberately.** There is no URI version segment, no header versioning, and no
framework versioning enabled; routes are mounted at the root. Audience segmentation
(`<audience>/<resource>` + separate OpenAPI documents) plays the role that versioning would in other
projects: a consumer group's contract changes independently of the others without a version axis.

**Rule:** do not invent a versioning scheme unless required. If versioning becomes necessary,
introduce it once, globally, at bootstrap — not per controller.

---

## 10. Service Architecture

### 10.1 Service kinds

Terminology inferred from actual responsibilities, not imported from a methodology:

| Kind | Location | Role | Injects |
| --- | --- | --- | --- |
| **Domain service** | `modules/<domain>/<domain>.service.ts` | business rules, invariants, orchestration; the domain's public API | own abstract repository, peer domain services |
| **Domain aspect service** | `modules/<domain>/<domain>-<aspect>.service.ts` | a cohesive sub-concern of the same domain (state/lifecycle, ledger, tokens) | own aspect repository, sometimes a provider |
| **Integration façade service** | `modules/<domain>/<domain>.service.ts` in an integration-backed domain | translates domain vocabulary into provider calls and records outcomes | a provider service + own repository |
| **Callback implementation service** | `modules/<domain>/<tech>-event-handlers-implements.service.ts` | implements a provider-declared interface; performs persistence side effects for external events | own repository |
| **Query/reporting service** | `modules/<reporting-domain>/<domain>.service.ts` | composes and formats cross-domain aggregate reads | its own abstract read-model repository (§11.8) — never other domains' repositories |
| **Infrastructure service** | `providers/<tech>/*.service.ts` | external system access | SDK clients, config services |
| **Authentication service** | `authentication/*.service.ts` | credential verification, recovery flow | the principal domain's service, token provider, config services |

### 10.2 Responsibilities

**Belongs in a service:**

* validating business preconditions and throwing on violation
* state-transition guards (assert current state before moving to the next)
* ownership/tenancy checks (verify the resource belongs to the caller's scope)
* hashing/derivation of sensitive values before persistence
* multi-step orchestration across peer domains
* applying default values for pagination and optional inputs
* aggregating and logging results of bulk operations
* computing derived values that are not persisted

**Does not belong in a service:**

* ORM calls, `where`/`include`/`select` construction, ORM types
* HTTP concerns: status codes, headers, request objects, response DTOs, and framework
  `HttpException`s — a service names the condition and lets the filter choose the status (§17.0)
* SDK/protocol details
* `process.env` reads
* entity↔wire conversion

### 10.3 Method naming — established vocabulary

| Prefix | Semantics | Return on absence |
| --- | --- | --- |
| `create<Noun>` | command, inserts | the created entity |
| `update<Noun>` / `update<Field>` | command, mutates | the updated entity |
| `delete<Noun>` | command, removes | `void` |
| `find<Noun>` / `find<Noun>s` | query, absence is normal | `Entity \| null` / `Entity[]` |
| `get<Noun>` | query, absence is an error | entity, else **throws** a `NOT_FOUND` exception |
| `<verb><Noun>` (domain verb) | state transition | the updated entity |
| `assert<Condition>` | policy check | `void`, else **throws** an `ACCESS_DENIED` exception |
| `is<Condition>` / `has<Condition>` / `can<Condition>` | predicate | `boolean` |
| `send<Noun>` / `initialize<Noun>` / `restart<Noun>` | integration command | `boolean` or `void` |

**The `find` / `get` pair is a hard convention and appears in every persisted domain:**

```ts
async find<Domain>ById(id: number): Promise<<Domain>Entity | null> {
  return this.<domain>Repository.findById(id);
}

async get<Domain>ById(id: number): Promise<<Domain>Entity> {
  const entity = await this.find<Domain>ById(id);
  if (!entity) throw new ResourceNotFoundException('<Domain>', id);
  return entity;
}
```

Callers that need a guarantee use `get…`; callers that branch on absence use `find…`. This removes
null-checking noise from every consumer.

### 10.4 Input and output conventions (RO-RO)

* Multi-field inputs are a **single named object type** declared in `defs/<domain>-service.defs.ts`
  and named `<Verb><Noun>ServiceInput`.
* Single-identifier inputs are passed positionally (`getById(id: number)`).
* Return types are always explicit; entities are returned, never DTOs and never ORM payloads.
* Optional inputs use a default parameter (`input: GetsServiceInput = {}`) rather than null checks.
* Never inline an ad-hoc object type in a method signature — declare it in `defs/` and name it.

### 10.5 Interaction with repositories

* A service injects **the abstract repository class**, never a concrete implementation.
* A service passes an explicitly constructed `*RepoInput` object — it does not forward its
  `*ServiceInput` wholesale, so the two contracts stay decoupled.
* A service must not build queries, must not reference ORM types, and must not import the ORM package.

### 10.6 Interaction with providers

The service is the only place a provider meets business context:

```ts
async send<Noun>(input: Send<Noun>ServiceInput): Promise<boolean> {
  const { ownerId, target, payload } = input;
  return await this.<tech>Manager.send(ownerId, target, payload);
}
```

Bulk integration work uses `Promise.allSettled`, then iterates results and logs per-item success and
failure — partial failure is expected and never aborts the batch.

### 10.7 Error handling inside services

Services throw and never catch for control flow. **The vocabulary is domain exceptions — never the
framework's HTTP exceptions.** A service that throws `NotFoundException` has an opinion about a
transport it is not supposed to know exists; it names the business condition instead, and the filter
layer decides what that condition means over HTTP (§17.0):

| Situation | Throw | Kind |
| --- | --- | --- |
| Entity absent where required | `ResourceNotFoundException` or a domain subclass | `NOT_FOUND` |
| Business precondition or state transition violated | `InvalidStateException` or a domain subclass | `INVALID_STATE` |
| Uniqueness or concurrent-modification conflict | `ResourceConflictException` or a domain subclass | `CONFLICT` |
| Principal not allowed / account not operational | `AccessDeniedException` | `ACCESS_DENIED` |
| Missing or invalid credentials | `AuthenticationFailedException` | `UNAUTHENTICATED` |
| An external system failed | `DependencyFailureException` | `DEPENDENCY_FAILURE` |

Every one of these extends the application exception base, so every one carries a stable `code`
without extra ceremony. Reach for a domain-specific subclass in `modules/<domain>/exceptions/` as soon
as a caller might want to distinguish the condition, or the message needs domain vocabulary.

Message style is diagnostic and human-readable, and states expectation versus reality:
`` `<Noun> cannot be <verb>ed. Current status: ${current}. Expected status: ${expected}` ``.

Deliberate ownership-obfuscation is a pattern worth noting: when a resource exists but belongs to
another scope, the service throws **not-found rather than access-denied**, so existence is not leaked.

### 10.8 Transactions

There are two cases, and conflating them is what produces god repositories.

**Case 1 — writes within one aggregate.** The repository owns the transaction. It holds the full ORM
client (§11.1), so it can open one directly, and it uses the transactional client for every statement
inside:

```ts
const [updated, record] = await this.<orm>Service.$transaction(async (tx) => {
  const balance = await tx.<balanceTable>.upsert({ … });
  const entry   = await tx.<ledgerTable>.create({ … });
  return [balance, entry];
});
```

**Case 2 — one business operation spanning several aggregates.** "Create the order, reserve the
inventory, record the payment, append the audit entry" is one atomic use case owned by a service, and
forcing it behind a single repository would merge four aggregates into one class and destroy the
boundaries the repository pattern exists to protect. Instead, the **service opens an explicit
transaction boundary** through an abstraction, and each participating repository runs inside it:

```ts
// common/base/transaction-runner.ts — the contract, ORM-free
export abstract class TransactionRunner {
  abstract run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
```

```ts
// modules/<domain>/<domain>.service.ts
async place<Domain>(input: Place<Domain>ServiceInput): Promise<<Domain>Entity> {
  return await this.transactionRunner.run(async (context) => {
    const order = await this.orderRepository.create(toCreateInput(input), context);
    await this.inventoryService.reserve({ orderId: order.id, lines: input.lines }, context);
    await this.paymentRepository.record({ orderId: order.id, amount: input.amount }, context);
    return order;
  });
}
```

Every repository method that may participate takes an optional trailing `context?: TransactionContext`
and uses the transactional client when one is supplied, its own client otherwise. `TransactionContext`
is an **opaque token** declared in `common/`, not the ORM's transaction client — the concrete runner
in `providers/database/` is the only code that knows what it really is, so business code gains a
transaction boundary without gaining ORM knowledge.

**Rules:**

* A service never imports the ORM client, and never touches `$transaction` directly — it depends on
  the abstract `TransactionRunner`.
* Single-aggregate atomicity stays inside the repository. Do not route it through the runner just
  because the runner exists.
* Reach for the runner only when two or more aggregates must commit or fail together. If you find
  yourself wrapping a read, or wrapping calls that could safely be sequential, the boundary is wrong.
* Never widen a repository's responsibility to another aggregate's tables to avoid using the runner.
  The repository *can* reach those tables — it holds the full client (§11.1) — which is exactly why
  this is a design rule rather than something the type system prevents.
* A repository given a `TransactionContext` uses it and never falls back to its own client inside
  that call, or the two paths open competing transactions and the outer one no longer guarantees
  anything.
* Keep the transactional block short and free of network I/O. Sending an email or calling a payment
  gateway inside an open transaction holds a database connection for the duration of a remote call —
  do that work after commit.

### 10.9 Dependency injection style

* Constructor injection with `private readonly` on every dependency. No property injection, no
  `@Inject()` by string token, no service locator.
* Loggers are instance fields, not injected: `private readonly logger = new Logger(<Class>.name);`
* Services are singletons (default scope). No request-scoped providers exist.
* A service must not be instantiated manually anywhere.

---

## 11. Repository / Data Access Architecture

### 11.1 The two-file repository pattern — the architecture's central abstraction

```
modules/<domain>/repository/
├── <domain>.repository.ts          # abstract class — the contract AND the DI token
└── <domain>-prisma.repository.ts   # concrete implementation
```

**Contract:**

```ts
// modules/<domain>/repository/<domain>.repository.ts
export abstract class <Domain>Repository {
  abstract create(input: Create<Domain>RepoInput): Promise<<Domain>Entity>;
  abstract findById(id: number): Promise<<Domain>Entity | null>;
  abstract findAll(input: Get<Domain>sRepoInput): Promise<<Domain>Entity[]>;
  abstract update(input: Update<Domain>RepoInput): Promise<<Domain>Entity>;
  abstract delete(id: number): Promise<void>;
}
```

**Implementation:**

```ts
// modules/<domain>/repository/<domain>-prisma.repository.ts
@Injectable()
export class <Domain>PrismaRepository implements <Domain>Repository {
  constructor(private readonly <orm>Service: <Orm>Service) {}

  async findById(id: number): Promise<<Domain>Entity | null> {
    const result = await this.<orm>Service.<table>.findUnique({
      where: { id },
      include: <domain>DetailsInclude,
    });
    if (!result) return null;
    return <Domain>Mapper.toEntity(result);
  }
}
```

**Binding:**

```ts
// modules/<domain>/<domain>.module.ts
providers: [
  { provide: <Domain>Repository, useClass: <Domain>PrismaRepository },
],
```

**Why an abstract class rather than an interface + symbol token:** a TypeScript interface has no
runtime value and cannot be a DI token, which would force a string/symbol token and `@Inject()` at
every injection site. An abstract class is both the compile-time contract and the runtime token, so
services inject it by type with zero ceremony. **This is the load-bearing decision of the data
layer — preserve it.**

**The database dependency is the full ORM client service — never a narrowed reference.** A concrete
repository injects `<Orm>Service` whole:

```ts
@Injectable()
export class <Domain>PrismaRepository implements <Domain>Repository {
  constructor(private readonly <orm>Service: <Orm>Service) {}   // the full client
}
```

Not a model delegate (`<orm>Service.<table>`), not a per-domain wrapper, not a generated "scoped
client" that exposes only this domain's tables. That narrowing looks like discipline and is actually
three problems:

* **It makes atomicity impossible.** `$transaction` lives on the client root, not on a model
  delegate. A repository holding only its own table cannot open a transaction at all, so the first
  operation that needs one either leaks the real client back in through a side door or gets written
  as a sequence of unprotected writes.
* **It blocks legitimate multi-table work inside a single aggregate.** An aggregate is rarely one
  table: satellite rows, join tables, status-history entries, and an append-only ledger belong to the
  same consistency unit. A page read needs `count` beside `findMany` (§9.8). Occasionally a query the
  builder cannot express needs raw SQL. All of that is correct repository work.
* **It is a boundary in the wrong place.** The boundary that matters is the **abstract contract**:
  nothing above the repository can reach the client, because nothing above the repository holds one.
  Narrowing the client adds a second, weaker boundary *inside* the layer that is already trusted with
  database access, and buys nothing the first boundary does not already provide.

So the rule is: **repositories are domain-oriented by design, not by restricted access.** What keeps
a repository inside its domain is the meaning of the methods on its contract, reviewed like any other
design decision — not a crippled dependency. Full access is what lets it implement correct atomic
operations instead of artificially decomposing them.

This is a statement about *capability*, and it does not change §10.8, which is about *placement*:

| Writes | Where the transaction is opened | Client used |
| --- | --- | --- |
| Within one aggregate (its tables and satellites) | inside the repository method | its own injected `<Orm>Service` |
| Across aggregates, one business use case | the service, via the abstract `TransactionRunner` | the runner's client, handed to each repository as an opaque `TransactionContext` |

Both rest on the same full client — the concrete `TransactionRunner` in `providers/database/` is
built from it too. A repository that participates in a cross-aggregate boundary does not reach for
its own client; it uses the context it was passed, so the two paths never open competing
transactions.

### 11.2 Naming

| Artifact | Convention |
| --- | --- |
| Abstract file / class | `<domain>.repository.ts` / `<Domain>Repository` |
| Concrete file / class | `<domain>-<orm>.repository.ts` / `<Domain><Orm>Repository` |
| Satellite aggregate | `<domain>-<aspect>.repository.ts` + `<domain>-<aspect>-<orm>.repository.ts` |
| Input types | `<Verb><Noun>RepoInput` in `defs/<domain>-repository.defs.ts` |
| Page types | `<Domain>Page` / `<Domain>CursorPage` in `defs/<domain>-repository.defs.ts` |
| Relation selection | `<domain>DetailsInclude` in `types/<domain>-details.include.ts` |
| Payload type | `<Domain>Type` in `types/<domain>-details-schema.type.ts` |

### 11.3 Repository method conventions

* Every read returns an **entity or entities**, produced by the mapper. Raw payloads never escape.
* A paginated read returns a named page type — `<Domain>Page` (`{ entities, total }`) or
  `<Domain>CursorPage` (`{ entities, hasMore, nextCursor }`) — declared in
  `defs/<domain>-repository.defs.ts`. The count is produced here, next to the filter it counts, never
  reconstructed by a caller (§9.8). Unpaginated reads still return a plain array.
* Absence returns `null` (single) or an empty page; repositories do not throw not-found — services do.
* `create`/`update` take a single `*RepoInput` object; `delete`/`findById` take an id.
* Any write method that a cross-aggregate use case may include takes an optional trailing
  `context?: TransactionContext` and resolves its client from it when present (§10.8). Reads do not.
* Partial updates use explicit `!== undefined` guards so that clearing a value stays distinguishable
  from not touching it:

```ts
const data: <Orm>.<Domain>UncheckedUpdateInput = {};
if (input.fieldA !== undefined) data.fieldA = input.fieldA;
if (input.fieldB !== undefined) data.fieldB = input.fieldB;
```

* Relation loading is either a **static shared constant** (uniform reads) or a **private builder
  method** driven by boolean `include*` flags (caller-controlled reads):

```ts
private build<Domain>Include(input: <Domain>RelationIncludeInput): <Orm>.<Domain>Include | undefined {
  const include: <Orm>.<Domain>Include = {};
  if (input.includeOwner) include.owner = true;
  if (input.includeChildren) include.children = { include: childDetailsInclude };
  return Object.keys(include).length > 0 ? include : undefined;
}
```

* Repository-private helpers are `private`; anything reusable belongs in the mapper.

### 11.4 The `types/` folder — two distinct artifacts

**1 — the persistence payload type.** Derived from the ORM's generated types so it automatically
tracks schema changes, then relaxed so that entities without loaded relations remain assignable:

```ts
// modules/<domain>/types/<domain>-details-schema.type.ts
import type { <Orm> } from '<orm-client>';
import { OptionalRelations } from '@/common/base/base.entity';

export type <Domain>Type = OptionalRelations<
  <Orm>.<Domain>GetPayload<{ include: { owner: true; children: true } }>
>;
```

The shared `OptionalRelations<T>` utility makes object/array fields optional while keeping scalars
and dates required — it lives in `common/base/` because every domain needs it.

**2 — the reusable relation selection.** Typed with `satisfies` so it stays checked while keeping its
literal type:

```ts
// modules/<domain>/types/<domain>-details.include.ts
export const <domain>DetailsInclude = {
  owner: true,
  children: true,
} satisfies <Orm>.<Domain>Include;
```

**Note:** the payload type may legitimately include *more* relations than the default include
constant, so the same entity type can be produced from several query shapes.

### 11.5 The `zod/` folder — entity shape schemas, not request validation

This is easy to misread. The Zod schemas here **describe the entity's construction shape**, are
consumed only as a `z.infer` type by the entity constructor, and have nothing to do with validating
HTTP input (that is `class-validator` on request DTOs).

```ts
// modules/<domain>/zod/<domain>.zod.ts
export type <Domain>ZodType = z.infer<typeof <Domain>ZodSchema>;

export const <Domain>ZodSchema = BaseZodSchema.extend({
  fieldA: ZodString,
  fieldB: ZodStringNullable,
  fieldC: ZodNumber,
  status: z.nativeEnum(<Domain>Status),
  owner: (z.any() as z.ZodType<OwnerZodType | null | undefined>).optional(),
  children: (z.any().nullish() as z.ZodType<ChildZodType[] | null | undefined>).optional(),
});
```

Shared primitives and the base schema live in `common/base/base.zod.ts`:
`ZodString`, `ZodNumber`, `ZodBoolean`, `ZodDate`, `ZodJson`, their `*Nullable` variants, and
`BaseZodSchema` (`id`, `createdAt`, `updatedAt`, `deletedAt`).

Relations are typed via a cast rather than a real nested schema — a deliberate trade-off to avoid
circular schema definitions between domains. Follow it.

These schemas are a **type-declaration mechanism only**: entity constructors assign in bulk and do
not call `.parse()`. The persistence boundary is already typed by the ORM's generated payload, so
re-validating it at runtime would cost per-row work to re-prove something the compiler knows.
Request validation belongs to `class-validator` on the request DTO, never to Zod.

If you decide the trade-off differently and want runtime parsing, make it a whole-project decision
and apply it in the entity base class — not one entity at a time.

### 11.6 Entity conventions

```ts
// modules/<domain>/entity/<domain>.entity.ts
export class <Domain>Entity extends BaseEntity {
  fieldA: string;
  fieldB: string;
  status: <Domain>Status;
  ownerId: number;

  derivedField: Date;            // computed, not persisted

  owner?: OwnerEntity;           // relations optional
  children?: ChildEntity[];

  constructor(data: <Domain>ZodType) {
    super();
    Object.assign(this, data);
    this.setDerivedField();
  }

  setDerivedField(): void {
    this.derivedField = /* computed from own fields and a shared constant */;
  }
}
```

Rules:

* Extends `BaseEntity` (`id`, `createdAt`, `updatedAt`, `deletedAt?`).
* Constructor takes the domain's `*ZodType` and assigns in bulk.
* Relations are optional properties typed as **other domains' entities** — entity-level cross-domain
  references are allowed and expected.
* Derived, non-persisted values are computed in the constructor via a small `set…` method. This is
  the only behaviour entities carry; they are otherwise data holders.
* Enums are the domain's own enum types, not the ORM's generated enums.

**Secondary/satellite entities** for supporting tables are plain field-only classes with no base
class and no constructor, used purely as structural types. Use the full pattern for the domain's
primary aggregate and the light pattern for satellites.

### 11.7 Is direct ORM access from a service allowed?

| Pattern | Status |
| --- | --- |
| Service → abstract repository → concrete repository → ORM | **Required**, without exception |
| Service → ORM client directly | **Forbidden** |

**Rule:** no service injects the ORM client, ever. Every module gets a repository pair, and every
query — including aggregates and reports — is a repository method with an explicit named return type.

### 11.8 Cross-domain reads: the read-model repository

A reporting or dashboard query legitimately spans several domains. Two tempting answers are both
wrong: injecting the ORM client into a reporting service abandons the abstraction, and injecting five
domains' repositories into one service is barely better — those repositories are the *internal*
contracts of their domains, and a consumer that holds all of them can bypass every domain service and
its invariants. A domain's repository is a boundary, and boundaries do not come in bulk.

Instead, a read-only cross-domain query gets its **own repository pair**, owned by the reporting
module, sitting beside the domain repositories rather than above them:

```
modules/<reporting-domain>/repository/
├── <reporting-domain>-read-model.repository.ts        # abstract contract
└── <reporting-domain>-read-model-<orm>.repository.ts  # concrete implementation
```

```ts
export abstract class <Reporting>ReadModelRepository {
  abstract getPlatformOverview(): Promise<PlatformOverview>;
  abstract countByStatus(input: CountByStatusRepoInput): Promise<StatusCount[]>;
}
```

Rules that keep this from becoming a back door:

* **Read-only.** A read-model repository never writes, and never participates in a transaction.
* **Projections, not entities.** It returns explicitly named result types (`PlatformOverview`,
  `StatusCount`), never another domain's entity. It is a query surface, not a second way to load an
  aggregate — if a caller wants a domain object, it asks that domain's service.
* **One owner.** It belongs to the module that serves the report. No other module injects it.
* **No business rules.** Its service composes and formats; any rule about what a number *means*
  belongs to the domain that owns the concept.

### 11.9 Complex queries

* Aggregates and grouped counts are issued in parallel with `Promise.all`, then reduced into an
  explicitly typed result object.
* Cross-table reads use nested relation filters and `select` projections rather than loading whole
  rows.
* Return shapes for reporting queries are exported named types declared beside the repository
  contract that produces them.

### 11.10 Implementing data access for a new domain — procedure

1. Add the model to the schema; generate a migration.
2. `types/<domain>-details-schema.type.ts` — payload type from the ORM's generated payload helper,
   wrapped in `OptionalRelations`.
3. `types/<domain>-details.include.ts` — the default relation selection, with `satisfies`.
4. `zod/<domain>.zod.ts` — entity shape schema extending the base schema.
5. `entity/<domain>.entity.ts` — entity class extending the base entity.
6. `mapper/<domain>.mapper.ts` — `static toEntity(schema): Entity`.
7. `defs/<domain>-repository.defs.ts` — `*RepoInput` types.
8. `repository/<domain>.repository.ts` — abstract contract.
9. `repository/<domain>-<orm>.repository.ts` — implementation returning mapped entities.
10. Bind the token in the domain module and import the database provider module.

---

## 12. DTO Architecture

### 12.1 Location and layout

DTOs are always **domain-local**, never shared in `common/`:

```
modules/<domain>/dto/
├── request/
│   ├── create-<domain>-request.dto.ts
│   ├── update-<domain>-request.dto.ts
│   ├── get-<domain>s-request.dto.ts
│   └── <verb>-<domain>-request.dto.ts
└── response/
    ├── model/
    │   └── <domain>.response.ts            # reusable entity projection
    ├── create-<domain>-response.dto.ts     # single-entity envelope
    ├── get-<domain>s-response.dto.ts       # collection envelope + total
    └── <domain>-<purpose>-response.dto.ts  # composite envelope
```

### 12.2 Naming

| Kind | File | Class |
| --- | --- | --- |
| Request | `<verb>-<domain>-request.dto.ts` | `<Verb><Domain>RequestDto` |
| Model projection | `model/<domain>.response.ts` | `<Domain>Response` (**no** `Dto` suffix) |
| Response envelope | `<purpose>-response.dto.ts` | `<Purpose>ResponseDto` |
| Nested request item | declared in the parent request DTO file | `<Item>Dto` |

The `Response` vs `ResponseDto` distinction is meaningful and must be preserved:
**`<Domain>Response` = a reusable projection of one entity; `<Purpose>ResponseDto` = one endpoint's
top-level payload.**

Response envelope files always use the hyphenated suffix `-response.dto.ts`. The dotted form
`.response.dto.ts` is not used. The only dotted response filename is the model projection
`model/<domain>.response.ts`, which is not a DTO and carries no `.dto` segment.

### 12.3 Request DTOs

```ts
export class Create<Domain>RequestDto {
  @ApiProperty({ description: '…', example: '…', minLength: 1 })
  @IsString()
  @IsNotEmpty()
  fieldA: string;

  @ApiProperty({ description: '…', example: '…', required: false })
  @IsOptional()
  @IsString()
  fieldB?: string;

  @ApiProperty({ description: '…', example: '…', format: 'email' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  contactEmail: string;

  @ApiProperty({ description: '…', minLength: 8, maxLength: 255, format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  @Matches(SHARED_PATTERN, { message: 'Weak value' })
  secret: string;
}
```

Rules:

1. **Every property carries `@ApiProperty`** with a description and an example. Optional properties
   add `required: false`; enums add `enum: <Enum>`.
2. Validation is `class-validator`. `@IsOptional()` comes **first** on optional fields.
3. Decorator order: `@ApiProperty` → `@IsOptional` → type validators → constraint validators →
   `@Transform`.
4. Normalization uses `@Transform` from `class-transformer` — lowercasing identifiers, coercing
   numeric query strings with `parseInt`.
5. Shared regular expressions come from `common/constants/`, never inlined.
6. Optional properties are marked `?` in TypeScript as well as in the decorator.
7. Query DTOs are ordinary request DTOs bound with `@Query()`; there is no separate query-DTO family.

### 12.4 Response DTOs — self-mapping constructors

The defining rule: **a response DTO maps itself from entities in its constructor.** Controllers never
map field by field.

**Model projection (extends the shared base, composes peer projections):**

```ts
export class <Domain>Response extends BaseModelResponseDto {
  @ApiProperty({ description: '…', example: '…' })
  fieldA: string;

  @ApiProperty({ description: '…', enum: <Domain>Status })
  status: <Domain>Status;

  @ApiProperty({ description: '…', type: () => OwnerResponse, required: false })
  owner?: OwnerResponse;

  @ApiProperty({ description: '…', type: () => [ChildResponse], required: false })
  children?: ChildResponse[];

  constructor(data: <Domain>Entity) {
    super(data);
    this.fieldA = data.fieldA;
    this.status = data.status;
    this.owner = data.owner ? new OwnerResponse(data.owner) : undefined;
    this.children = data.children?.map((child) => new ChildResponse(child));
  }
}
```

**Single-entity envelope:**

```ts
export class <Domain>ResponseDto {
  @ApiProperty({ type: () => <Domain>Response })
  <domain>: <Domain>Response;

  constructor(entity: <Domain>Entity) {
    this.<domain> = new <Domain>Response(entity);
  }
}
```

**Collection envelope:**

```ts
export class Get<Domain>sResponseDto {
  @ApiProperty({ type: () => [<Domain>Response] })
  <domain>s: <Domain>Response[];

  @ApiProperty({ description: 'Total rows matching the filter, across all pages', example: 450 })
  total: number;

  constructor(page: <Domain>Page) {
    this.<domain>s = page.entities.map((e) => new <Domain>Response(e));
    this.total = page.total;
  }
}
```

`total` is a **required** constructor input, never an optional one defaulting to page length (§9.8).
Making it required is what forces the count query to exist: an optional total is a fallback waiting
to be taken, and the fallback is always wrong.

The cursor variant drops `total` rather than faking it:

```ts
export class Get<Domain>sResponseDto {
  @ApiProperty({ type: () => [<Domain>Response] })
  <domain>s: <Domain>Response[];

  @ApiProperty({ description: 'Whether more rows exist after this page', example: true })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Cursor for the next page; absent on the last page' })
  nextCursor?: string;

  constructor(page: <Domain>CursorPage) {
    this.<domain>s = page.entities.map((e) => new <Domain>Response(e));
    this.hasMore = page.hasMore;
    this.nextCursor = page.nextCursor;
  }
}
```

**Composite envelope** (data from several services) takes a **named object**, not positional
arguments:

```ts
export class <Domain>DetailResponseDto {
  @ApiProperty({ type: () => <Domain>Response })
  <domain>: <Domain>Response;

  @ApiProperty({ type: () => <Aspect>ResponseDto, required: false })
  aspect?: <Aspect>ResponseDto;

  constructor(data: { <domain>: <Domain>Entity; aspect: <Aspect>Entity | null }) {
    this.<domain> = new <Domain>Response(data.<domain>);
    this.aspect = data.aspect ? new <Aspect>ResponseDto(data.aspect) : undefined;
  }
}
```

Rules: relation types always use the lazy form `type: () => X` / `type: () => [X]` to avoid circular
resolution; absent optional data becomes `undefined`, never `null`; response DTOs never contain
business logic beyond null-guarding and delegation.

### 12.5 Reuse across modules

| Direction | Allowed? |
| --- | --- |
| Importing another domain's **model projection** (`<Domain>Response`) to nest it | **Yes** — this is the intended composition mechanism |
| Importing another domain's **request DTO** or nested item DTO | **No** — declare a local DTO even if it is field-identical today; two endpoints that share a class cannot evolve independently |
| Importing another domain's **response envelope** (`*ResponseDto`) | **Avoid** — envelopes belong to one endpoint |
| Placing DTOs in `common/` | **No** — only the two generic bases live there |

### 12.6 Creating a new DTO — procedure

1. Decide direction: request or response.
2. Requests → `dto/request/<verb>-<domain>-request.dto.ts`; one class, `@ApiProperty` +
   `class-validator` on every field, `@Transform` where normalization is needed.
3. Responses → does a `model/<domain>.response.ts` projection already exist? Reuse it. Otherwise
   create it extending the shared model base.
4. Add the endpoint envelope in `dto/response/`, mapping in its constructor.
5. Reference the DTO in the controller via `@ApiBody({ type: … })` / `@ApiResponse({ type: … })` and
   as the handler's declared return type.

---

## 13. Mapper Architecture

### 13.1 Purpose

Mappers exist for exactly one reason: **to stop ORM-generated types from leaking out of the
repository.** They are the boundary translator between persistence payloads and domain entities.

### 13.2 Location, naming, shape

```
modules/<domain>/mapper/<domain>.mapper.ts   →   class <Domain>Mapper
```

```ts
export class <Domain>Mapper {
  static toEntity(schema: <Domain>Type): <Domain>Entity {
    return new <Domain>Entity({
      id: schema.id,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      fieldA: schema.fieldA,
      status: schema.status as <Domain>Status,
      normalizedField: schema.relation?.value ?? schema.fallbackValue,
      owner: schema.owner ? OwnerMapper.toEntity(schema.owner) : null,
      children: schema.children ? schema.children.map((c) => ChildMapper.toEntity(c)) : null,
    });
  }
}
```

### 13.3 Conventions

| Aspect | Convention |
| --- | --- |
| Style | **static methods on a plain class**; never injectable, never instantiated |
| Method name | `toEntity` |
| Direction | **persistence payload → entity only**. There is no `toPersistence`/`fromEntity` anywhere |
| Input type | the domain's `<Domain>Type` from `types/` |
| Output type | the domain's entity |
| Field assignment | **explicit, field by field** — never spread the payload |
| Relations | delegate to the related domain's mapper; guard presence and pass `null` when absent |
| Collections | `schema.relation.map((item) => <Related>Mapper.toEntity(item))` |
| Enum crossing | cast the ORM enum to the domain enum (`as <Domain>Status`) — this is where the two enum worlds are reconciled |
| Normalization | light fallback/denormalization is allowed (`?? fallback`) |
| Called from | repository implementations only |

### 13.4 Where mapping happens for each boundary

| Boundary | Mechanism | Location |
| --- | --- | --- |
| Persistence payload → entity | `<Domain>Mapper.toEntity()` | `mapper/` |
| Entity → wire response | **response DTO constructor** | `dto/response/` |
| Request DTO → service input | **explicit destructuring in the controller** | controller body |
| Service input → repository input | **explicit object construction in the service** | service body |
| External provider payload → domain data | the domain's callback-implementation service, writing through its repository | `modules/<domain>/` |
| Thrown error → canonical error | exception mapper functions | `common/filter/exception_mappers/` |

**Only the first of these uses a `mapper/` file.** Do not create a mapper class for the others.

### 13.5 When to create a mapper — and when not to

**Create one when:** the domain owns a persisted aggregate whose payload is read through a
repository. This is effectively always, for persisted domains.

**Do not create one when:**

* converting entity → response DTO (the DTO constructor owns that)
* converting request DTO → service input (the controller owns that)
* the "mapping" is a single field rename inside one layer
* a satellite table's projection is trivial — small `private map<Noun>(row)` helpers inside the
  repository are acceptable for satellites, though a proper mapper class is the cleaner default

### 13.6 Exception mappers are a different pattern with the same name

`common/filter/exception_mappers/` contains **functions**, not classes:

```ts
export function map<Source>Exception(exception: unknown): GeneralTypeException | null { … }
```

Convention: `map<Source>Exception`, returns the canonical error type or `null` so callers can chain
candidates. Do not confuse these with domain mappers; they live in `common/filter/`, are functions,
and are named `map…` rather than `toEntity`.

---

## 14. Shared / Common Architecture

### 14.1 What exists

There is **one** shared root, `common/`. There is no `shared/`, no top-level `utils/`, no top-level
`types/`, and no top-level `constants/`. This is intentional and should be preserved: a single shared
root with purpose-named subfolders is far easier to police than several overlapping ones.

```
common/
├── auth/         # the Principal contract shared code authorizes against
├── base/         # base classes and generic type utilities
├── constants/    # shared frozen literals
├── decorators/
│   ├── requests/ # parameter decorators (extract from request)
│   └── route/    # metadata decorators (consumed by guards)
├── exceptions/   # application exception hierarchy
├── filter/       # exception filters + mappers + return handlers
├── guards/       # authentication / role authorization
├── helpers/      # pure functions and small utility classes
└── pipes/        # validation & transformation pipes
```

### 14.2 Per-folder contract

| Folder | Belongs | Does **not** belong |
| --- | --- | --- |
| `base/` | base entity, base response classes, shared schema primitives, generic type utilities like `OptionalRelations<T>` | any domain field, any business rule |
| `constants/` | values referenced by ≥2 domains: shared regular expressions, route prefixes, shared numeric policy constants | single-domain constants (put them in the domain), configuration values (put them in `config/`) |
| `decorators/requests/` | `createParamDecorator` implementations extracting the principal, request metadata, or an alternative auth payload | business logic, database access |
| `decorators/route/` | `SetMetadata` wrappers, each exporting its metadata key alongside the decorator | anything that reads metadata (that is a guard's job) |
| `exceptions/` | the application exception base and generic subclasses (e.g. validation) | domain-specific exceptions (put them in the domain), provider-specific exceptions (put them in the provider) |
| `filter/` | exception filters, `exception_mappers/` (error-source translators), `exception_return_handler/` (transport serializers + the canonical error type) | business error decisions |
| `auth/` | the `Principal` contract that shared code uses to describe the authenticated caller | the concrete principal entity, the role vocabulary |
| `guards/` | authentication and role-authorization guards — those expressible against `Principal` alone | any guard that injects a domain service or reads a domain field (see §14.4) |
| `helpers/` | pure stateless functions (`hashString`, `compareHashString`, string normalization, code generation) and request-inspection utility classes | stateful services, anything needing DI, anything domain-specific |
| `pipes/` | pipes extending the framework's validation pipe and shaping validation errors into the application's exception type | ad-hoc per-controller validation |

### 14.3 Export conventions and barrel files

* **Default: no barrel files.** Every consumer imports the exact file, everywhere in `src/`.
* **The single justified use of a barrel** is hiding an optional-dependency fallback behind a stable
  import path, as in `common/helpers/` and its nested `helpers/request/` (§14.5). A barrel that only
  saves keystrokes is not justified: it hides the dependency graph and invites cycles.
* **All exports are named.** The only `export default` occurrences are configuration registration
  arrays in `config/*/`, which the framework's `load` option consumes.
* **One primary export per file** for classes (module, controller, service, repository, mapper,
  entity, DTO). Files whose purpose *is* a group of related declarations may export several: enum
  files, `defs/*` type files, decorator files (decorator + its metadata key), and constant files.

### 14.4 Keeping shared code domain-agnostic — the `Principal` contract

Shared request helpers, the current-principal parameter decorator, and the role guard all need to
talk about "the authenticated caller", which is tempting to type as the principal entity from
`modules/`. That import would invert the layering. Instead, `common/` declares the minimal contract
it actually needs and the domain implements it:

```ts
// common/auth/principal.interface.ts
export interface Principal {
  id: number;
  role: string;
}
```

```ts
// modules/<principal-domain>/entity/<domain>.entity.ts
export class <Domain>Entity extends BaseEntity implements Principal { … }
```

Shared code then depends only on `Principal`. The role *vocabulary* stays in the domain that owns it:
the metadata decorator is generic over the role type (`<TRole extends string>`), so call sites keep
enum-level type inference while `common/` never learns the role names.

**Two consequences worth internalizing:**

1. A guard that needs more than `id` and `role` does not belong in `common/`. If it injects a domain
   service or reads a domain-specific field, it is a domain guard: put it in
   `modules/<domain>/guards/` and register it in that domain's module. `common/guards/` holds only
   guards that are expressible against `Principal` and framework primitives.
2. The same applies to an alternative-token-scheme guard and its parameter decorator: if they
   validate through a domain token service, they live in that domain, not in the shared root.

**Rule:** no file under `common/` may import from `modules/`. When shared code appears to need a
domain type, declare the narrow contract in `common/` and implement it in the domain, or move the
code into the domain.

### 14.5 Optional-dependency helpers behind one import path

A helper whose implementation depends on an optional package is split into a minimal version and an
extended version, with a barrel that picks between them at load time:

| File | Role |
| --- | --- |
| `<subject>/<subject>-base.helper.ts` | the implementation with no optional dependency |
| `<subject>/<subject>-<extension>.helper.ts` | the extended implementation, re-exporting the base and falling back to it when the optional package is absent |
| `<subject>/index.ts` | the single import path, exporting the extended version |

**Rule:** call sites import the barrel and nothing else. Never let two import paths for the same
helper circulate — when an implementation is superseded, migrate the call sites and delete the old
file in the same change rather than leaving a deprecated re-export behind.

### 14.6 How to decide "shared or not"

Apply in order:

1. **Used by exactly one domain?** → keep it in that domain. Do not pre-share.
2. **Used by two or more domains and free of domain concepts?** → `common/<appropriate-subfolder>/`.
3. **Used by two or more domains but carries domain concepts?** → it is not a utility; it is a
   domain service. Put it in the owning domain and export it.
4. **Is it about an external system?** → `providers/`, not `common/`.
5. **Is it an environment value?** → `config/`, not `common/constants/`.

### 14.7 Keeping the shared root from becoming a dumping ground

* Every file must fit one of the existing subfolders. **If it does not fit, it probably is not
  shared** — that is the signal, not a reason to create another folder.
* Never create `misc/`, `utils/`, `common/common/`, or a catch-all `helpers.ts`.
* Helper files are named by subject with a role suffix (`<subject>.helper.ts`) and contain only
  closely related functions.
* A shared file must have **at least two real importers** at the moment it is created.
* Shared code must never import from a specific domain — no exceptions (§14.4).

---

## 15. Naming Conventions

### 15.1 Files — `kebab-case` + role suffix

The universal pattern is `<subject>[.<qualifier>].<role>.ts`.

```
<domain>.module.ts                        <domain>.service.ts
<domain>.controller.ts                    <domain>.<audience>.controller.ts
<domain>-<aspect>.service.ts              <domain>.mapper.ts
<domain>.repository.ts                    <domain>-<orm>.repository.ts
<domain>.entity.ts                        <domain>-<aspect>.entity.ts
<domain>.zod.ts                           general.enum.ts
<verb>-<domain>-request.dto.ts            <purpose>-response.dto.ts
<domain>.response.ts                      <domain>-service.defs.ts
<domain>-repository.defs.ts               <domain>-details-schema.type.ts
<domain>-details.include.ts               <subject>.helper.ts
<subject>.constant.ts                     <subject>.guard.ts
<subject>.decorator.ts                    <subject>.pipe.ts
<subject>.exception.ts                    <subject>.filter.ts
<concern>-config.schema.ts                <concern>-config.service.ts
<concern>-configs.ts                      <tech>-provider.module.ts
<tech>-<role>.service.ts                  <tech>-<subject>.interface.ts
<audience>-api.module.ts                  <subject>.type.ts
```

Role suffixes in use: `.module`, `.controller`, `.service`, `.repository`, `.entity`, `.mapper`,
`.dto`, `.response`, `.defs`, `.type`, `.include`, `.zod`, `.enum`, `.guard`, `.decorator`, `.pipe`,
`.filter`, `.exception`, `.helper`, `.constant`, `.interface`, `.strategy`, `.provider`, `.factory`,
`.definitions`.

### 15.2 Folders

* `kebab-case`, always **singular** for a role: `entity/`, `mapper/`, `repository/`, `dto/`, `enum/`,
  `type` → `types/` and `defs/` are the two plural exceptions actually present.
* Domain folders are singular nouns naming the concept.
* Multi-word domain folders use kebab-case (`<parent>-<child>/`).
* Request/response split lives under `dto/`; the reusable projection lives under `dto/response/model/`.
* `snake_case` never appears in a folder name.

### 15.3 Classes — `PascalCase` + role suffix

```
<Domain>Module           <Domain>Controller        <Domain><Audience>Controller
<Domain>Service          <Domain><Aspect>Service   <Domain>Repository (abstract)
<Domain><Orm>Repository  <Domain>Mapper            <Domain>Entity
<Verb><Domain>RequestDto <Purpose>ResponseDto      <Domain>Response
<Concern>ConfigService   <Tech>ProviderModule      <Tech>ManagerService
<Subject>Guard           <Subject>Decorator        <Subject>Pipe
<Subject>Exception       <Subject>Filter           <Audience>ApiModule
```

* Interfaces: `PascalCase`, **no `I` prefix** (`<Tech>EventHandlers`, `Principal`).
* Type aliases: `PascalCase` (`<Verb><Noun>ServiceInput`, `<Verb><Noun>RepoInput`, `<Domain>Type`,
  `<Domain>ZodType`).
* Enums: `PascalCase` name, `UPPER_SNAKE_CASE` members. Member *values* are lowercase or upper
  snake strings matching the database enum literals.

### 15.4 Functions and methods — `camelCase`, verb-first

| Category | Convention | Examples |
| --- | --- | --- |
| Commands | `<verb><Noun>` | `create<Noun>`, `update<Noun>`, `delete<Noun>`, `send<Noun>`, `initialize<Noun>`, `restart<Noun>` |
| Queries (absence normal) | `find<Noun>` / `find<Noun>s` / `findAll` / `findBy<Field>` | `find<Noun>ById`, `findBy<Field>` |
| Queries (absence is an error) | `get<Noun>` | `get<Noun>ById` |
| Predicates | `is…` / `has…` / `can…` | `isValidFor<Noun>`, `hasPermission`, `can<Verb><Noun>` |
| Assertions | `assert<Condition>` | `assert<Noun>Can<Verb>` |
| Builders (private) | `build<Noun>` | `build<Noun>Include` |
| Setup / lifecycle | `setup<Noun>` / `on<Event>` | `setupClientEvents`, `onModuleInit`, `onModuleDestroy` |
| Event handlers | `handle<Event>` | `handle<Event>` |
| Mapping | `toEntity` (domain) / `map<Source>Exception` (errors) / `map<Noun>` (private) | — |
| Normalization | `normalize<Noun>` | `normalizeException` |
| Factories | `create<Noun>` returning a constructed artifact | `create<Noun>Document` |
| Bootstrap | `bootstrap` | — |

`async` is **not** encoded in the name; the return type carries it. Every method has an explicit
return type, including `Promise<void>`.

### 15.5 Variables

| Category | Convention |
| --- | --- |
| Locals & parameters | `camelCase` |
| Booleans | `is…` / `has…` / `should…` / `can…` (`isReady`, `isPasswordValid`, `hasBearerAuth`, `isExpired`) |
| Identifiers | `id` for own key, `<noun>Id` for a foreign key, `<noun>Ids` for a list |
| Timestamps | `<verb>edAt` (`createdAt`, `updatedAt`, `deletedAt`, `sentAt`, `expiresAt`, `lastSeen`) |
| Date-only / range bounds | `<noun>Date`, `<noun>From` / `<noun>To` |
| Collections | plural nouns (`entities`, `results`, `rows`, `items`) |
| Query results | `result` (single), `results` / `rows` (many) |
| Method input object | `input`; controller-bound DTOs are `input`, `body`, `query`, or `<noun>Dto` |
| Injected dependencies | the camelCase class name minus nothing (`<domain>Service`, `<domain>Repository`, `<orm>Service`, `configService`) |
| Constants | `UPPER_SNAKE_CASE` at module scope; `camelCase` for module-scope shared literals like an include constant |
| Loop/index | `i` for a numeric index; name every other callback parameter for what it holds |
| Unused parameters | `_`-prefixed (enforced by the lint configuration) |

### 15.6 Route naming

* Resource paths are lowercase kebab-case, singular for a resource root, kebab-case for
  multi-word actions: `<resource>`, `<audience>/<resource>`, `:id/<action>`,
  `:id/<multi-word-action>`.
* Path parameters are always parsed: `@Param('id', ParseIntPipe)`.
* Actions that are not CRUD are `POST :id/<verb>`.
* Nested collections read as `<resource>/:id/<sub-resource>`.

### 15.7 Documentation comments

* JSDoc block comments on classes whose purpose is not obvious from the name, on interface members
  that form a contract, and on non-trivial public methods. Roughly: **contracts and non-obvious
  intent get JSDoc; plain CRUD does not.**
* Inline `//` comments are used sparingly to explain *why*. Comments that narrate *what* the next
  line does are noise and are already over-represented in a few files — do not add more.

---

## 16. Import & Dependency Conventions

### 16.1 The alias rule — hard rule

`tsconfig.json` defines a single path alias:

```json
{ "baseUrl": "./", "paths": { "@/*": ["src/*"] } }
```

> **HARD RULE:** every cross-folder import uses `@/…`. Relative imports (`./`, `../`) are permitted
> **only** for a file in the same directory, and even then `@/…` is acceptable and more common. Never
> write `../../`.

```ts
// correct
import { <Domain>Service } from '@/modules/<domain>/<domain>.service';
import { <Orm>Service } from '@/providers/database/<orm>/<orm>-provider.service';
import { <Concern>ConfigService } from '@/config/<concern>/<concern>-config.service';

// wrong
import { <Domain>Service } from '../../<domain>/<domain>.service';
```

### 16.2 Import ordering

Enforced by the formatter/lint setup and consistently visible in the well-maintained files:

```ts
// 1 — framework packages
import { Injectable, Logger } from '@nestjs/common';
// 2 — third-party packages
import { <Orm> } from '<orm-client>';
// 3 — blank line, then internal alias imports, alphabetized by path
import { BaseEntity } from '@/common/base/base.entity';
import { <Domain>Entity } from '@/modules/<domain>/entity/<domain>.entity';
// 4 — blank line, then same-directory relative imports (if any)
import { <Domain>Service } from './<domain>.service';
```

Rules: groups separated by blank lines; `import type { … }` for type-only imports of ORM namespaces
and payload-only types; multi-symbol imports wrapped one-per-line by the formatter at the configured
width.

### 16.3 Allowed import directions

```
main.ts / app.module.ts  →  config/, providers/, modules/, common/
modules/<audience>-api   →  modules/<domain>/, authentication/, common/guards/
modules/<domain>/        →  own files, other modules/<domain>/ (service + entity + enum),
                            providers/, config/, common/
authentication/          →  modules/<domain>/ (principal domain), providers/, config/, common/
providers/               →  config/, common/, own files
config/                  →  own files, common/
common/                  →  common/, framework, third-party
```

### 16.4 Forbidden and discouraged imports

**Forbidden:**

* `providers/**` importing from `modules/**` — invert with an interface instead.
* `config/**` importing from `modules/**` or `providers/**`.
* `common/**` importing from `modules/**` — declare a narrow contract in `common/` and implement it in
  the domain instead (§14.4).
* Any file importing a **concrete** repository implementation from outside its own domain module.
* A service importing the ORM client to bypass its repository.
* `process.env` outside `config/*/…-configs.ts`.
* Cyclic module imports.

**Discouraged:**

* Importing another domain's repository token (allowed only where deliberately exported).
* Importing another domain's request DTO.
* Deep relative traversal (`../../`).
* Adding new barrel files.

### 16.5 Avoiding cycles

* Modules form a directed graph via `imports`; ownership decides direction. If A orchestrates B, A
  imports B, never the reverse.
* Entities and mappers may reference each other across domains for relation mapping. This is safe
  only because the references are erased at compile time — use `import type` for the type-level ones
  so no runtime cycle can form.
* Response DTO relations always use the lazy `type: () => X` form specifically to survive circular
  references in the documentation metadata.
* Zod relation fields are cast rather than nested, again to break schema cycles.
* If you need a runtime cycle between two services, the design is wrong — extract the shared
  behaviour into a third module.

---

## 17. Error Handling

### 17.0 The governing decision: business code throws domain exceptions

The service layer knows nothing about HTTP (§10.2), and that has a consequence this architecture
accepts in full: **business code never throws a framework HTTP exception.** No `NotFoundException`,
no `BadRequestException`, no `ForbiddenException` in a service, guard, mapper, or repository.

The pragmatic alternative — letting services throw `HttpException` subclasses — is common in NestJS
and it works. It is rejected here for three reasons. It makes the service layer untestable without
the HTTP framework in scope; it silently decides transport semantics in the middle of a business
rule, where nobody reviews them; and it breaks entirely the moment the same service is reached over
a second transport, from a scheduled job, or from another service that wanted to *handle* the
condition rather than return it to a client.

Instead, business code throws an `AppException` subclass that names the **business condition**, and a
single translation layer decides what that condition means to each transport. `HttpException` still
exists in the system — the framework itself throws it for unmatched routes, oversized payloads, and
rate-limit rejections — so the filter must understand it. It just never originates in your code.

### 17.1 The hierarchy

```
Error
└── AppException                       common/exceptions/app.exception.ts
    │     { message, code, kind, userFriendly }
    ├── ValidationExceptions           common/exceptions/validation.exception.ts
    │     + validationErrorObjects: ValidationErrorObject[]
    ├── <semantic base exceptions>     common/exceptions/  — the shared vocabulary below
    ├── <Subject><Reason>Exception     modules/<domain>/exceptions/  — domain-specific
    ├── <Tech>InvalidException         providers/<tech>/exceptions/  — provider-specific
    └── GeneralTypeException           common/filter/exception_return_handler/type/…
          + stack        ← the canonical normalized form
```

The base carries the condition, not the response. `kind` is a transport-neutral classification;
`code` is a stable machine-readable identifier for clients; `userFriendly` decides whether the
message may be shown to a client in a hardened environment:

```ts
export class AppException extends Error {
  readonly code: string;
  readonly kind: ErrorKind;
  readonly userFriendly: boolean;

  constructor(data: AppExceptionInput) {
    const { message, code = 'UNKNOWN_CODE', kind = ErrorKind.INTERNAL, userFriendly = false } = data;
    super(message);
    this.code = code;
    this.kind = kind;
    this.userFriendly = userFriendly;
  }
}
```

**There is no `statusCode` on a domain exception.** An HTTP status is a fact about a transport, and
the thrower is not the layer that knows the transport. `kind` is the whole vocabulary:

```ts
export enum ErrorKind {
  VALIDATION = 'VALIDATION',                   // input failed structural validation
  NOT_FOUND = 'NOT_FOUND',                     // referenced thing does not exist in caller's scope
  CONFLICT = 'CONFLICT',                       // uniqueness / concurrent modification
  INVALID_STATE = 'INVALID_STATE',             // precondition or state transition violated
  UNAUTHENTICATED = 'UNAUTHENTICATED',         // no or invalid credentials
  ACCESS_DENIED = 'ACCESS_DENIED',             // authenticated, not permitted
  DEPENDENCY_FAILURE = 'DEPENDENCY_FAILURE',   // an external system failed
  INTERNAL = 'INTERNAL',                       // a defect
}
```

`common/exceptions/` provides one thin semantic base per kind, so the common cases need no new class:

```ts
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier: string | number) {
    super({
      message: `${resource} with identifier ${identifier} was not found`,
      code: 'RESOURCE_NOT_FOUND',
      kind: ErrorKind.NOT_FOUND,
      userFriendly: true,
    });
  }
}
```

A domain-specific exception subclasses the matching semantic base when it needs its own stable code
and message — this is what a service throws when the condition is meaningful to the business:

```ts
// modules/<domain>/exceptions/<domain>-not-<state>.exception.ts
export class <Domain>Not<State>Exception extends InvalidStateException {
  constructor(current: <Domain>Status) {
    super({
      message: `<Domain> cannot be processed. Current status: ${current}. Expected status: ${<Domain>Status.<STATE>}`,
      code: '<DOMAIN>_NOT_<STATE>',
      userFriendly: true,
    });
  }
}
```

The payoff is that a caller can write `catch (error) { if (error instanceof <Domain>Not<State>Exception) … }`
and handle a business condition, which is impossible when the only signal is "someone threw a 400".

### 17.2 The normalization pipeline

```
common/filter/
├── global-exception.filter.ts             @Catch()  — catches everything
├── validation-exception.filter.ts         @Catch(ValidationExceptions)
├── exception_mappers/
│   ├── exception-mapper.ts                normalizeException() + mapper chain
│   ├── <orm>-exception-handler.ts         map<Orm>Exception()
│   ├── <http-client>-error-handler.ts     map<HttpClient>ErrorException()
│   └── …                                  one file per error source
└── exception_return_handler/
    ├── http_exception.handler.ts          serializes to an HTTP body
    ├── graphql_exception.handler.ts        serializes for the alternative transport
    └── type/general-type.exception.ts     the canonical normalized type
```

**Normalization order — specific before generic, and everything unrecognized is a defect:**

```ts
function tryMapSpecialExceptions(exception: unknown): GeneralTypeException | null {
  return (
    map<Orm>Exception(exception) ||
    map<HttpClient>ErrorException(exception) ||
    mapSchemaException(exception) ||
    null
  );
}

export function normalizeException(exception: unknown): GeneralTypeException {
  const mapped = tryMapSpecialExceptions(exception);
  if (mapped) return mapped;
  // Our own vocabulary: kind → status happens here, once.
  if (exception instanceof AppException) return fromAppException(exception);
  // The framework's own throws: unmatched route, payload too large, rate limit.
  if (exception instanceof HttpException) return fromHttpException(exception);
  // Anything else is a defect we did not anticipate.
  return new GeneralTypeException({
    message: exception instanceof Error ? exception.message : 'Unknown Error',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    userFriendly: false,
    stack: exception instanceof Error ? exception.stack : undefined,
  });
}
```

**`TypeError` has no branch, and neither does any other built-in runtime error.** `TypeError`,
`RangeError`, and `ReferenceError` mean the program did something impossible — read a property of
`undefined`, called a non-function, exhausted a bound. That is a bug in the server, not a mistake by
the caller. Mapping it to a client error is actively harmful: it returns `400` for a crash, tells the
caller to fix a request that was fine, hides the defect from every "5xx rate" alert, and invites the
message of an internal failure into a response body. These fall through to the final branch: **500,
never user-friendly, always logged with a stack.**

The rule generalizes. If a real client-input failure is currently surfacing as a `TypeError`, the fix
is never a mapper branch — it is that something was parsed or dereferenced before it was validated.
Validate it at the boundary and throw a named `VALIDATION` exception, so the 400 is a decision
somebody made rather than a crash that happened to be catchable.

**Kind-to-status is one table, in one place:**

| `ErrorKind` | HTTP | Notes |
| --- | --- | --- |
| `VALIDATION` | 422 | body carries `validationErrorObjects` |
| `NOT_FOUND` | 404 | also used for out-of-scope resources, so existence is not leaked (§10.7) |
| `CONFLICT` | 409 | uniqueness, concurrent modification |
| `INVALID_STATE` | 400 | precondition or transition violated |
| `UNAUTHENTICATED` | 401 | |
| `ACCESS_DENIED` | 403 | |
| `DEPENDENCY_FAILURE` | 503 | external system unavailable |
| `INTERNAL` | 500 | never user-friendly |

Adding a transport means adding a second table beside this one, not touching a single throw site.

### 17.3 Source-specific mappers

Each external error source gets one file exporting `map<Source>Exception(exception): GeneralTypeException | null`.

**ORM errors** are switched on the driver's error code and translated into an HTTP status, a stable
application code, and a user-friendliness decision:

| Error class | Handling |
| --- | --- |
| known request error | `switch` on the driver code → unique-violation → `CONFLICT`; record-not-found → `NOT_FOUND`; foreign-key/relation violation → `INVALID_STATE`; schema error → `INTERNAL`; timeout → `DEPENDENCY_FAILURE` |
| unknown request error | `INTERNAL`, not user-friendly, timestamped |
| validation error | `VALIDATION`, user-friendly |
| initialization error | `DEPENDENCY_FAILURE`, not user-friendly, timestamped |

A mapper translating an unrecognized code must fall through to `INTERNAL` rather than guessing a
client error — a driver code you have not classified is a case you have not thought about.

Non-user-friendly messages are enriched with a timestamp, the driver code, and metadata for the log;
user-friendly ones stay short and safe.

**HTTP-client errors** are flattened into one diagnostic message containing timestamp, method,
resolved URL, status, response body, params, and request body.

### 17.4 The global filter

```ts
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly appConfigService: AppConfigService) {}

  catch(exception: any, host: ArgumentsHost): any {
    let normalized = normalizeException(exception);
    this.logError(normalized);
    this.reportErrorToMonitoring(normalized);
    if (!normalized.userFriendly && this.shouldHideErrorDetails()) {
      normalized = this.createSafeProductionError(normalized);
    }
    return this.formatErrorResponse(normalized, host);
  }
}
```

Four private steps, each a single responsibility:

1. **log** — the normalized object plus message and stack;
2. **report** — send to the monitoring SDK when the error is not user-friendly and the environment is
   not local;
3. **sanitize** — outside development-like environments, replace non-user-friendly errors with a
   generic internal-error (client-side statuses collapse to not-found so internals are not probed);
4. **format** — dispatch to the transport-specific return handler based on the request type.

Both filters are registered in the root module through `APP_FILTER` so they can be injected with the
configuration service.

### 17.5 Response body shape

```ts
interface HttpExceptionResponseBody {
  message: string;
  code: string;                                     // stable, machine-readable
  statusCode: number;                               // decided here, from ErrorKind — not by the thrower
  stack?: string;                                   // suppressed in hardened environments
  validationErrorObjects?: ValidationErrorObject[]; // only for validation failures
}
```

This is the one place in the system where a status code is assigned. The `kind` is deliberately not
exposed: clients branch on `code`, which is stable, rather than on an internal classification that
may be re-mapped.

### 17.6 Validation errors

The global pipe replaces the framework's default error with the application's own type, and flattens
nested errors into a property-path list:

```ts
@Injectable()
export class InputValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[]) =>
        new ValidationExceptions({
          message: 'Invalid input',
          code: 'BAD_USER_INPUT',
          kind: ErrorKind.VALIDATION,
          validationErrorObjects: InputValidationPipe.getFactoryErrors(validationErrors),
        }),
    });
  }
}
```

Nested properties are flattened recursively into `` `${parentProperty}${property}` `` so clients get
dotted paths.

### 17.7 Where to create and where to handle

| Action | Location |
| --- | --- |
| **Throw** a business/validation/authorization error | services (the normal case), guards (authorization), controllers (request-shape preconditions only) — always an `AppException` subclass |
| **Define** a reusable typed exception | `common/exceptions/` if generic; `providers/<tech>/exceptions/` if provider-specific; `modules/<domain>/exceptions/` if domain-specific |
| **Translate** an external error source | a new `map<Source>Exception` file in `common/filter/exception_mappers/`, added to the chain |
| **Decide** an HTTP status | the kind-to-status table in the return handler — nowhere else |
| **Catch** | only in a global filter, or locally to add context / implement a best-effort fallback |
| **Log & report** | the global filter, centrally — not at throw sites |

**Rules:** never throw an `HttpException` from business code; never put a status code in a `throw`;
never catch to swallow; never `return null` in place of a genuine error in a service; never format an
error response outside the filter layer; when adding a new error source, extend the mapper chain
rather than adding `try/catch` at call sites.

---

## 18. Authentication & Authorization

### 18.1 Layout

```
authentication/                     # the concern: who the caller is
├── auth.module.ts
├── auth.controller.ts              # credential exchange → token
├── auth.service.ts                 # credential verification
├── forget-password.controller.ts   # recovery flow endpoints
├── forget-password.service.ts      # recovery flow logic
├── strategies/
│   ├── <scheme>-auth.strategy.ts   # token-based strategy
│   └── local.strategy.ts           # credential-based strategy
├── dto/{request,response}/
└── types/
    ├── <scheme>-auth-token-payload.type.ts
    └── <scheme>-reset-password-payload.type.ts

common/auth/                        # the contract shared code authorizes against
└── principal.interface.ts

common/guards/                      # enforcement expressible against Principal alone
├── <scheme>-auth.guard.ts
├── local-auth.guard.ts
└── roles.guard.ts

modules/<domain>/guards/            # enforcement needing a domain service or field
├── <policy>.guard.ts
└── <alternative>-auth.guard.ts

common/decorators/route/            # declaration: what a route requires
├── public-route.decorator.ts
└── roles.decorator.ts

common/decorators/requests/         # extraction: request context into handler params
├── logged-in-user.decorator.ts
└── get-request-info.decorator.ts

modules/<domain>/decorators/        # extraction of a domain-specific auth payload
└── <alternative>-auth.decorator.ts

providers/<vendor>/                 # mechanics: signing and verification
└── <vendor>-token.service.ts
```

The separation is the point: **strategies verify identity, guards enforce access, decorators declare
requirements and extract context, and the provider does the cryptography.**

### 18.2 Strategies

Passport strategies extend the framework's strategy mixin and are provided by the authentication
module. Each `validate` returns the **principal entity**, which the framework attaches to the request.

```ts
@Injectable()
export class <Scheme>AuthStrategy extends PassportStrategy(Strategy, '<scheme>') {
  constructor(
    <concern>ConfigService: <Concern>ConfigService,
    private readonly principalService: PrincipalService,
  ) {
    super({
      tokenFromRequest: ExtractToken.fromAuthHeaderAsBearerToken(),
      secretOrKey: <concern>ConfigService.secretKey,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: <Scheme>TokenPayload): Promise<PrincipalEntity> {
    const principal = await this.principalService.find<Principal>ById(payload.principalId);
    if (!principal) throw new AuthenticationFailedException();
    return principal;
  }
}
```

The credential strategy delegates verification to the authentication service and throws with a
deliberately non-specific message so it does not reveal which factor failed.

### 18.3 Guards

| Guard | Pattern |
| --- | --- |
| Token authentication | extends the passport auth guard for its strategy; overrides `getRequest` to use the shared request helper; overrides `handleRequest` to throw unauthorized on any failure; overrides `canActivate` to short-circuit `true` when the public-route metadata is present |
| Credential authentication | thin subclass of the passport auth guard for the credential strategy |
| Role authorization | implements `CanActivate`; reads role metadata with `reflector.getAllAndOverride(KEY, [handler, class])`; returns `true` when no roles are declared; throws an `ACCESS_DENIED` domain exception when the principal's role is not allowed |
| Alternative token scheme | implements `CanActivate`; extracts a custom header, validates it through a domain token service, optionally checks a required-permission metadata key, attaches the payload to the request, returns `true` |
| Operational policy | implements `CanActivate`; injects a domain service and calls its `assert…` method; passes through for privileged roles and unauthenticated requests so other guards own those cases |

Composition is explicit and ordered: `@UseGuards(AuthenticationGuard, AuthorizationGuard)` — identity
before permission. Guards must also be listed in the audience module's `providers`.

### 18.4 Metadata decorators

Each declaration decorator exports its metadata key next to it, so the guard imports the key from the
decorator file — never a duplicated string literal:

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const PublicRoute = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### 18.5 Principal context

The authenticated principal reaches handlers **only** through a parameter decorator:

```ts
export const LoggedInUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => getUserFromRequestUseContext(context) as Principal,
);
```

Usage: `async handler(@LoggedInUser() currentUser: PrincipalEntity)`. The decorator itself resolves
the shared `Principal` contract (§14.4); the handler annotates the concrete entity its audience
actually receives.

**Rules:** never inject the raw request into a controller to read the principal; never trust a
client-supplied owner/tenant identifier — always derive scoping from the principal
(`currentUser.id`, `currentUser.<scope>Id`). There is no request-scoped context or CLS service, and
introducing one is a deliberate architecture decision, not a convenience: pass scoping values
explicitly down to services so every signature states what it depends on.

### 18.6 Token handling

All signing and verification is centralized in the token provider service, which is the only place
the signing library is touched. Tokens are differentiated by:

* **purpose-specific secrets and lifetimes** from the configuration layer (access vs recovery), and
* **issuer/audience claims** for tokens intended for a specific consumer.

Payload shapes are declared as interfaces in `types/`, named `<Purpose>Payload`, and passed as the
generic argument to the create/verify calls, so payloads are typed end to end.

Verification failures are translated into a typed provider exception that distinguishes expiry from
invalidity.

### 18.7 Roles and permissions

Two orthogonal models coexist by design:

| Model | Declaration | Enforcement |
| --- | --- | --- |
| **Role-based** (principal-authenticated APIs) | `@Roles(Role.X)` on class or handler | the role guard, against the principal's single role field |
| **Permission-based** (alternative token scheme) | `@RequireMobilePermission('<permission>')`-style metadata on the handler | the alternative guard, against a permission array inside the token payload |

Roles are a domain enum owned by the principal's module. Permissions are plain strings embedded in
the token at issuance. There is no permission table and no policy engine.

**Rule:** put the *role/permission requirement* in a decorator and the *evaluation* in a guard. Never
inline `if (user.role === …)` in a controller or service. Business-state policies (as opposed to
identity policies) belong in a domain service's `assert…` method, invoked by a policy guard.

---

## 19. Cross-Cutting Concerns

### 19.1 Mechanisms

| Concern | Mechanism | Where new code belongs |
| --- | --- | --- |
| **Validation** | global pipe extending the framework validation pipe, `transform: true`, custom exception factory; rules declared with `class-validator` on request DTOs | rules → the request DTO; mechanism → `common/pipes/` |
| **Serialization** | response DTO constructors; no interceptor, no global envelope | `dto/response/` |
| **Exception handling** | two global filters + mapper chain + transport return handlers | `common/filter/` |
| **Logging** | the framework `Logger` as a private instance field named after the class, in services and providers that perform I/O — never `console.*`, including inside a filter | `private readonly logger = new Logger(<Class>.name)` |
| **Error monitoring** | monitoring SDK invoked from the global filter only, gated on environment and the user-friendliness flag | the global filter — never at throw sites |
| **Transactions** | repository-local by default; cross-aggregate through the abstract `TransactionRunner` | repository implementations, or the service owning the use case (§10.8) |
| **Guards** | authentication and role in `common/guards/`; alternative-scheme and operational-policy guards in `modules/<domain>/guards/` because they depend on domain services | by dependency: `Principal`-only → `common/guards/`, otherwise the domain |
| **Decorators** | parameter decorators for context extraction; metadata decorators for route requirements | `common/decorators/{requests,route}/` |
| **Interceptors** | **none exist** | do not introduce one without a decision; response shaping belongs in DTOs |
| **Middleware** | security headers only, applied at bootstrap | prefer a guard or pipe for anything request-specific |
| **Security headers** | a hardening middleware installed at bootstrap, before routes | `main.ts` (§19.2) |
| **CORS** | an explicit, configuration-driven policy — never bare `enableCors()` | `main.ts` + a config concern (§19.2) |
| **Rate limiting** | a throttler guard: a conservative global default, tightened per route on credential endpoints | root module + `@Throttle` on the route (§19.2) |
| **Caching** | configuration caching only (`cache: true` on the root config module); no data cache | would be a new `providers/cache/` |
| **Events** | no internal event bus. External events arrive through the provider callback-interface pattern | provider `interfaces/` + a domain callback-implementation service |
| **Queues / schedulers** | **none exist** | would be a new provider plus a domain service |
| **Notifications** | an outbound-notification provider wrapping the transport SDK, called by a domain service | `providers/<transport>/` + a domain service |
| **Auditing** | domain-level only: state-change tables recording actor and reason, and an append-only ledger table | model it in the domain as a satellite entity + repository, not as a framework hook |
| **Metrics** | none beyond error reporting | — |
| **Health check** | two endpoints: liveness and readiness | `health/` (§19.3) |
| **API documentation** | audience-scoped OpenAPI documents generated from audience modules; enabled only in whitelisted environments | `providers/swagger/` definition table |

**Guidance:** cross-cutting machinery is kept deliberately minimal — a small set of guards, two
filters, one pipe, no interceptors, and no middleware beyond security headers. Prefer solving a
problem with the existing primitives before adding a new cross-cutting mechanism, and if you must add
one, register it in the root module (for filters and globally-applied guards) or explicitly per
controller, matching the existing style.

### 19.2 Security baseline

Authentication and authorization (§18) protect *identity*. These three protect the *surface*, they
are not optional in a production-facing service, and none of them belongs in a domain module.

**1 — Security headers.** A hardening middleware is installed before any route is registered, so
every response — including error responses and the documentation UI — carries it:

```ts
app.use(helmet());
```

Do not selectively disable directives to make something work. If the documentation UI or an embedded
asset conflicts with the content-security policy, scope the exception to that path rather than
weakening the policy globally.

**2 — CORS is an explicit policy.** `app.enableCors()` with no arguments reflects any origin, which
turns every cookie- or header-authenticated endpoint into a target for any site a user visits. The
allowed origins come from configuration, so each environment differs by value, not by code:

```ts
app.enableCors({
  origin: appConfigService.allowedOrigins,   // explicit list from configuration; never '*'
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS,
});
```

`origin: '*'` and `credentials: true` are mutually exclusive in every correct implementation. If you
find yourself wanting both, the requirement is wrong.

**3 — Rate limiting.** A throttler guard is registered globally with a conservative default, and
credential-adjacent routes tighten it individually. The global default alone is not enough: a limit
loose enough for normal browsing is far too loose for password guessing.

```ts
// root module — the floor for every route
ThrottlerModule.forRoot([{ ttl: DEFAULT_THROTTLE_TTL_MS, limit: DEFAULT_THROTTLE_LIMIT }]),
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

```ts
// authentication controller — far stricter, and keyed per identifier, not only per IP
@Throttle({ default: { ttl: LOGIN_THROTTLE_TTL_MS, limit: LOGIN_THROTTLE_LIMIT } })
@Post('login')
```

Routes that **must** carry a tightened limit: sign-in, password reset request, password reset
confirmation, token refresh, one-time-code verification, registration, and any unauthenticated
endpoint that sends an email or a message. On these, key the limit on the submitted identifier as
well as the client address, or an attacker spreads attempts across addresses and never hits the
limit. Rejections surface as the framework's own throttling exception and are normalized like any
other framework throw (§17.2).

Two more baseline rules that cost nothing and are easy to forget: cap the request body size at the
smallest value the API actually needs, and never disable the global validation pipe's whitelisting
for convenience — an accepted-but-unexpected property is how mass assignment happens.

### 19.3 Health and readiness are two different questions

A single endpoint returning a literal answers "is the process running", and orchestrators treat that
as permission to send traffic. It is not: a process with a dead database connection pool answers that
endpoint perfectly while failing every real request. Separate the two questions, because they have
different consumers and different consequences:

| Endpoint | Question | Checks | Consumer | On failure |
| --- | --- | --- | --- | --- |
| `GET /health/live` | Is the process alive and its event loop responsive? | nothing external — returns a literal | orchestrator liveness probe | the process is **restarted** |
| `GET /health/ready` | Can it serve a real request right now? | database round trip, plus any dependency without which requests fail | load balancer / readiness probe | traffic is **withheld**, process kept alive |

The distinction matters in exactly the case that hurts: when the database is briefly unreachable,
readiness must fail (stop sending traffic) while liveness keeps succeeding (do not restart every
instance in a loop and turn a recoverable blip into an outage).

Rules:

* Liveness performs **no** I/O — no database call, no external request, no disk access.
* Readiness checks dependencies the service cannot function without, with a **short timeout** on each,
  and never blocks indefinitely.
* Readiness does not check optional dependencies. If the service can degrade gracefully without a
  cache or a third-party integration, that dependency failing must not remove the instance from
  rotation.
* Both endpoints are public (§9.5), cheap, and unauthenticated; neither returns diagnostic internals —
  a health endpoint that names a failing host is a free reconnaissance tool.
* Health lives in its own small module, not scattered across the root module.

---

## 20. Testing Architecture

### 20.1 The two runners

Testing is split into two independently configured runners, and the split determines where a test
file goes:

| Runner | Configuration | Location | Scope |
| --- | --- | --- | --- |
| Unit | `package.json` → `jest.rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"` | colocated beside the file under test | one class, dependencies mocked |
| End-to-end | `test/jest-e2e.json` → `rootDir: "."`, `testRegex: ".e2e-spec.ts$"` | `test/` | one audience API module through HTTP |

A unit test never boots the application. **Default e2e tests use the real repository implementation
against an isolated test database** — that is the baseline, and a test that mocks a repository purely
to avoid database setup has quietly become a slow unit test.

The word is "default", not "never". A justified substitution exists: verifying behaviour that a real
database cannot be made to produce on demand — a connection failure, a deadlock, a driver-level
timeout — where a fake repository is the only way to reach the code path. Substitute for that reason,
name the reason in the test, and keep it to the one case; if a suite's happy paths run against
doubles, the suite is no longer testing what it claims. If a test wants both a mocked repository and
the full HTTP stack for ordinary behaviour, it is really two tests.

### 20.2 Structure

```
src/
└── modules/<domain>/
    ├── <domain>.service.ts
    ├── <domain>.service.spec.ts          # colocated unit test
    ├── <domain>.controller.ts
    ├── <domain>.controller.spec.ts
    └── repository/
        └── <domain>-<orm>.repository.spec.ts

test/
├── jest-e2e.json
├── <audience>-<resource>.e2e-spec.ts     # one per API surface
└── fixtures/, factories/                 # shared builders, created when first needed
```

Naming: unit/integration → `<subject>.spec.ts` **colocated**; end-to-end → `<subject>.e2e-spec.ts` in
`test/`.

### 20.3 How the architecture makes testing easy — exploit this

The abstract-repository pattern exists partly for testability. A service test needs **no database**:

```ts
describe('<Domain>Service', () => {
  let service: <Domain>Service;
  let mock<Domain>Repository: jest.Mocked<<Domain>Repository>;

  beforeEach(async () => {
    // Arrange
    mock<Domain>Repository = { findById: jest.fn(), create: jest.fn(), … } as unknown as jest.Mocked<<Domain>Repository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        <Domain>Service,
        { provide: <Domain>Repository, useValue: mock<Domain>Repository },
        { provide: PeerDomainService, useValue: { /* stubs */ } },
      ],
    }).compile();

    service = moduleRef.get(<Domain>Service);
  });

  it('throws when the entity is absent', async () => {
    // Arrange
    mock<Domain>Repository.findById.mockResolvedValue(null);
    // Act & Assert
    await expect(service.get<Domain>ById(1)).rejects.toThrow(ResourceNotFoundException);
  });
});
```

The abstract class is both the token and the type, so `{ provide: <Domain>Repository, useValue: mock }`
is all the wiring required.

### 20.4 What to test at each layer

| Layer | Test kind | Substitute | Assert |
| --- | --- | --- | --- |
| Service | unit | mock its abstract repository + peer domain services | business rules, invariants, state transitions, thrown exception types, that the correct repository input object was built |
| Repository implementation | integration | a real test database (or a mocked ORM client) | query correctness, relation loading, partial-update semantics, that an **entity** is returned |
| Mapper | unit | none (pure) | every field mapped, relations delegated, absent relations become `null` |
| Response DTO | unit | none (pure) | entity → wire shape, nested projections, optional handling |
| Controller | unit | mock the domain services | route wiring, correct destructuring into service input, correct DTO wrapping, guard metadata |
| Guard | unit | mock the reflector + execution context (+ domain service for policy guards) | allow/deny outcomes and thrown exception types |
| Exception mapper | unit | none (pure) | each error source/code → expected kind, code, and user-friendliness; unrecognized input falls through to `INTERNAL` |
| Kind-to-status table | unit | none (pure) | every `ErrorKind` has a status, and an unmapped throw produces 500 |
| Validation pipe | unit | none | nested error flattening and the produced exception type |
| API surface | e2e | real application, test database, provider services replaced with test doubles | status codes, response body shape, auth enforcement |

### 20.5 Conventions to adopt

* **Arrange–Act–Assert** in unit tests; **Given–When–Then** phrasing for e2e/acceptance descriptions.
* Variable naming: `input…`, `mock…`, `actual…`, `expected…`.
* One `describe` per class, nested `describe` per method, `it` sentences stating behaviour.
* **Always mock providers** in unit and e2e tests — never open a real external session or send real
  external messages from a test. Override with `.overrideProvider(<Tech>ManagerService).useValue(…)`.
* Create fixtures/factories only when duplication actually appears; place them under
  `test/factories/` and name them `<domain>.factory.ts` with `build<Domain>Entity(overrides)` helpers.
* Add a smoke test per controller (a trivially authenticated endpoint asserting 200) as the minimum
  bar for a new API surface.

---

## 21. Tooling & Scripts

### 21.1 Script vocabulary

| Script | Purpose |
| --- | --- |
| `build` | compile via the framework CLI |
| `start` / `start:dev` / `start:debug` / `start:prod` | run; watch; watch+debug; run compiled output |
| `format` | formatter write across `src/` and `test/` |
| `lint` | linter with autofix across source, apps, libs, and test |
| `test` / `test:watch` / `test:cov` / `test:debug` | unit runner variants |
| `test:e2e` | e2e runner with its dedicated config |
| `seed` | delegate to the ORM CLI's seed command |

Conventions: **colon-namespaced variants** (`<verb>:<variant>`); one script per concern; migrations
and client generation are invoked through the ORM CLI rather than wrapped in custom scripts (the seed
entry point is registered under the ORM's config key in `package.json`).

### 21.2 Build configuration

| File | Role |
| --- | --- |
| `nest-cli.json` | `sourceRoot: "src"`, `deleteOutDir: true` |
| `tsconfig.json` | compiler options, the `@/*` path alias, `outDir: "./dist"` |
| `tsconfig.build.json` | extends the base and excludes `node_modules`, `test`, `dist`, `**/*spec.ts` |

Compiler options: `strict: true`, `declaration: true`, `emitDecoratorMetadata: true`,
`experimentalDecorators: true`, `target: ES2022`, `skipLibCheck: true`, `incremental: true`.

**Enable `strict` from the first commit.** The conventions in this document — explicit return types,
no `any`, named input types — are the same discipline `strict` enforces mechanically, and the two
reinforce each other. Relaxing it later is a decision; adopting it later is a migration. In
particular, a permissive compiler lets a typed accessor return `undefined` behind a `: string`
signature, which turns a configuration mistake into a silent runtime fallback instead of a build
error.

### 21.3 Linting and formatting

* Flat lint configuration with the TypeScript plugin's recommended set, type-aware parsing wired to
  `tsconfig.json`, and the formatter integrated as a lint rule (`prettier/prettier: 'error'`).
* Notable rule choices: `explicit-function-return-type: off` (convention, not enforcement),
  `no-unused-vars: warn` with `argsIgnorePattern: '^_'`, `no-explicit-any: warn`, and two
  unsafe-access rules disabled.
* Formatter settings: single quotes, semicolons, trailing commas everywhere, print width 100,
  2-space indentation. Editor settings mirror this (LF, UTF-8, trim trailing whitespace, final
  newline).
* Two lint config files coexist (`.mjs` and `.mts`) — a duplication to avoid replicating; keep one.

### 21.4 Dependency management

* **pnpm** (a `pnpm-lock.yaml` is committed). Use it consistently; never mix package managers.
* Runtime vs development separation is respected — the framework, ORM client, validation,
  transformation, auth, and integration SDKs are dependencies; types, the runner, the linter, the
  formatter, the CLI, and the ORM CLI are development dependencies.
* Version style: caret ranges for most packages, an **exact pin for the ORM client** so the generated
  client and the CLI cannot drift.
* Type packages accompany every untyped runtime dependency.

### 21.5 Migrations and code generation

* Schema is the source of truth; migrations are generated, committed as timestamped folders with
  `migration.sql`, and never hand-edited after being applied.
* **Development (create a migration):** from `artifacts/api-server`, `pnpm run prisma:migrate:dev`.
* **Apply migrations (development and deployment):** `pnpm run prisma:migrate:deploy`. This is the
  executable workflow. It applies pending folders in checksum order and does not reset the database.
* **Status:** `pnpm run prisma:migrate:status` must report no pending migrations after a successful deploy.
* Do **not** use `prisma db push` as the primary local or deployment mechanism. `db push` syncs the
  Prisma datamodel only and skips data SQL, enum rebuilds, and partial unique indexes.
* SQL-only constraints (partial unique indexes, triggers) are committed as `migration.sql` in the
  Prisma folder layout. They are not optional extras outside migrate.
* Historical loose `prisma/migrations/<name>.sql` files were never discovered by Prisma; they are kept
  under `prisma/legacy-sql/` as an audit trail and must not be re-run against databases that already
  received those changes.
* Existing databases that were created with `db push` and already match the baseline schema should
  record the baseline with `prisma migrate resolve --applied <migration_name>` rather than executing
  `CREATE TABLE` again, then `prisma migrate deploy` for later folders.
* The ORM client is generated code and must never be edited or imported outside repositories,
  mappers' input types, and the ORM provider service.
* The seed script is a standalone module that instantiates its own client, is composed of small
  `seed<Subject>` functions, uses upsert-style idempotent writes, and always disconnects in both the
  success and failure paths.

### 21.6 CI

No CI configuration exists in the repository. If added, the pipeline that matches this tooling is:
install (frozen lockfile) → generate ORM client → lint → build → unit tests → migrate a test
database → e2e tests.

---

## 22. Dependency Rules

### 22.1 The canonical chains

```
Audience API module
    ↓
Controller
    ↓
Domain service            ←→  peer domain service (via the peer's exported service)
    ↓
Abstract repository (DI token)
    ↓
Concrete ORM repository   →   Mapper  →  Entity
    ↓
ORM provider service
    ↓
Database
```

```
Domain service
    ↓
Provider service (abstraction over the SDK)
    ↓
Third-party SDK / external system

  …and for inbound events:
Provider-declared handler interface
    ↑ implemented by
Domain callback-implementation service
    ↓
Domain repository
```

```
Any layer
    ↓
Config service (typed getters)
    ↓
Namespace registration (the only reader of process.env)
    ↓
Environment
```

```
Domain service (owns the use case)
    ↓
Abstract TransactionRunner        ← the boundary; no ORM type crosses it
    ↓
Concrete runner in providers/database/
    ↓
Opaque TransactionContext  →  passed to each participating repository
```

```
Anything that throws
    ↓
AppException subclass (message, code, kind, userFriendly)
    ↓
Normalization chain (source mappers → AppException → HttpException → 500)
    ↓
Kind-to-status table in the transport return handler
    ↓
Response body
```

### 22.2 Allowed

* Controller → domain service (its own or a peer's), response DTO, request DTO, guards, decorators.
* Domain service → its own abstract repository; peer domain **services**; provider services; config
  services; the abstract `TransactionRunner`; `common/` helpers, constants, exceptions.
* Concrete repository → the ORM provider service **in full** (including `$transaction` and raw
  queries), its own mapper, its own `defs/`, `types/`, entity.
* Mapper → its own entity, its own payload type, **other domains' mappers** (for relations).
* Entity → the base entity, its own enums/zod type, **other domains' entities** (for relations).
* Response DTO → the base response classes, its own entity, **other domains' model projections**.
* Provider → config services, `common/`, third-party SDKs, its own interfaces/defs/exceptions.
* Guard → the reflector, request helpers, and a domain service when enforcing a business policy.
* Audience API module → domain modules, the authentication module, guards.
* Everything → `common/` and `config/`.

### 22.3 Discouraged (compiles, weakens the architecture)

| Pattern | Why it is a problem | Do instead |
| --- | --- | --- |
| Injecting the ORM service into a domain service | bypasses the repository contract; makes the service untestable without a database | add a repository method |
| Importing a peer domain's repository token | skips that domain's business rules | call the peer's service |
| Declaring a controller in a domain module | breaks audience-scoped documentation and route grouping | register it in the audience module |
| Inline ad-hoc input object types in service/repository signatures | contract drifts and cannot be reused | declare a named type in `defs/` |
| Mapping fields inside a controller | duplicates response shaping | do it in the response DTO constructor |
| Spreading a request DTO into a service input | couples the wire contract to the service contract | destructure explicitly |
| Relative `../../` imports | fragile under refactors | use `@/…` |
| New barrel files | hides real dependencies and invites cycles | import the exact file |
| Reusing another domain's request DTO | couples two wire contracts | declare a local type |
| Adding a folder to `common/` | shared-root sprawl | fit an existing subfolder, or keep it in the domain |
| Importing a framework HTTP exception into a service | couples the domain to a transport | throw an `AppException` subclass |
| Injecting more than one domain's repository into a service | turns internal contracts into a public query surface | add a read-model repository |
| Marking a new module `@Global()` | hides the dependency graph | import it explicitly where used |

### 22.4 Forbidden (never introduce)

1. `providers/**` importing anything from `modules/**`.
2. `config/**` importing from `modules/**` or `providers/**`.
3. `common/**` files importing from `modules/**`.
4. Business rules inside a controller, repository, mapper, DTO, or provider.
5. ORM types (`<Orm>.<Model>`, generated payloads, generated enums) appearing in a service, controller,
   or DTO signature.
6. A raw persistence payload returned from a repository (always map to an entity).
7. An entity returned directly from a controller (always wrap in a response DTO).
8. `process.env` read outside `config/*/…-configs.ts`, and any `ConfigModule.forRoot()` outside
   `config/configs.module.ts`.
9. The ORM's transaction API called outside a repository — cross-aggregate boundaries go through the
   abstract `TransactionRunner`.
10. A cyclic runtime dependency between two services or two modules.
11. A concrete repository implementation injected anywhere by its concrete class.
12. Authorization logic inline in a controller or service (`if (user.role === …)`).
13. Secrets, credentials, or connection strings in source or in documentation examples.
14. Dead code committed as commented-out blocks or scratch files.
15. A framework `HttpException` thrown from a service, guard, mapper, or repository.
16. An HTTP status code assigned anywhere but the transport return handler's kind-to-status table.
17. `total` in a list response derived from the page length instead of a count query.
18. `enableCors()` without an explicit origin list, or a credential endpoint without a tightened rate
    limit.

---

## 23. Feature Implementation Workflow

The workflow below is derived from the file sets that actually exist in the mature domains. Steps
marked *(conditional)* are skipped when they do not apply.

### 23.1 New business domain

```
 1. Model the data
    prisma/schema.prisma                → add the model(s); generate a migration

 2. Create the domain folder
    modules/<domain>/

 3. Persistence-facing types
    types/<domain>-details-schema.type.ts   → <Domain>Type via OptionalRelations<payload>
    types/<domain>-details.include.ts       → <domain>DetailsInclude satisfies <Orm>.<Domain>Include

 4. Domain vocabulary
    enum/general.enum.ts                (conditional) → status/kind enums mirroring the DB literals

 5. Entity shape + entity
    zod/<domain>.zod.ts                 → <Domain>ZodSchema extends BaseZodSchema, <Domain>ZodType
    entity/<domain>.entity.ts           → <Domain>Entity extends BaseEntity, constructor(data)

 6. Boundary translation
    mapper/<domain>.mapper.ts           → static toEntity(schema): <Domain>Entity

 7. Data-access contract + implementation
    defs/<domain>-repository.defs.ts    → *RepoInput types + <Domain>Page
    repository/<domain>.repository.ts   → abstract class (the DI token)
    repository/<domain>-<orm>.repository.ts → @Injectable implementation returning mapped entities;
                                          list reads return a page with a real count

 8. Business logic
    defs/<domain>-service.defs.ts       → *ServiceInput types
    exceptions/<domain>-<reason>.exception.ts (conditional) → named domain conditions
    <domain>.service.ts                 → @Injectable service; find/get pair; rules; domain throws
    <domain>-<aspect>.service.ts        (conditional) → cohesive sub-concern

 9. Wire contracts
    dto/request/<verb>-<domain>-request.dto.ts   → @ApiProperty + class-validator (+ @Transform)
    dto/response/model/<domain>.response.ts      → projection extends BaseModelResponseDto
    dto/response/<purpose>-response.dto.ts       → endpoint envelopes, mapping in constructors

10. API layer
    <domain>.controller.ts              (conditional)
    <domain>.<audience>.controller.ts   (conditional) → guards, @Roles, OpenAPI decorators, thin handlers

11. Module wiring
    <domain>.module.ts                  → imports (DatabaseProviderModule + peer domains),
                                          providers (services + { provide: Abstract, useClass: Concrete }),
                                          exports (services). NO controllers.

12. Register with an audience
    modules/<audience>-api.module.ts    → add the domain module to imports,
                                          add the controller(s) to controllers

13. Infrastructure, if the feature integrates externally      (conditional)
    providers/<tech>/…                  → provider module + service (+ interfaces/ for callbacks)
    modules/<domain>/<tech>-event-handlers-implements.service.ts → implement the callback interface
    providers/provider.module.ts        → register/export the provider module

14. Configuration, if new environment values are needed        (conditional)
    config/<concern>/{…-configs.ts, …-config.schema.ts, …-config.service.ts}
    config/configs.module.ts            → spread into load + validationSchema; provide/export the service
    .env / example file                 → add variable NAMES only

15. Tests
    modules/<domain>/<domain>.service.spec.ts   → business rules with a mocked repository
    modules/<domain>/<domain>.controller.spec.ts
    test/<audience>-<domain>.e2e-spec.ts        → real repository against the test database,
                                                  providers replaced by doubles
```

### 23.2 New endpoint on an existing domain

```
1. Request DTO      → dto/request/<verb>-<domain>-request.dto.ts   (if it takes input)
2. Service input    → defs/<domain>-service.defs.ts                (if multi-field)
3. Service method   → business rules; reuse get…/find… helpers
4. Repository       → extend the abstract contract, then the implementation (+ RepoInput type)
5. Response DTO     → reuse the existing model projection; add an envelope if the shape is new
6. Controller       → add the handler with guards and OpenAPI decorators
7. Registration     → nothing to change if the controller is already registered
8. Tests            → service unit test + endpoint e2e test
```

### 23.3 New third-party integration

```
1. providers/<tech>/<tech>-provider.module.ts        → module, exports the service
2. providers/<tech>/<tech>-<role>.service.ts         → @Injectable SDK wrapper, lifecycle hooks
3. providers/<tech>/defs/<tech>-<subject>.defs.ts    → provider-owned data shapes
4. providers/<tech>/interfaces/…interface.ts         (conditional) → inbound-event contract
5. providers/<tech>/exceptions/…exception.ts         (conditional) → typed failures
6. config/<concern>/…                                (conditional) → credentials/endpoints
7. providers/provider.module.ts                      → import (and export if domains need it)
8. modules/<domain>/…                                → a service that consumes it with business meaning
9. common/filter/exception_mappers/…                 (conditional) → normalize its error type
```

---

## 24. Generic Feature Example

A fictional, domain-neutral feature: **`notification`** — an entity owned by a tenant, delivered
through an external transport, with an admin surface and a tenant surface.

### 24.1 File tree

```
src/
├── providers/
│   └── push/
│       ├── push-provider.module.ts
│       ├── push-manager.service.ts
│       ├── defs/push-manager.defs.ts
│       └── interfaces/push-event-handlers.interface.ts
│
├── config/
│   ├── configs.module.ts                   (edited: load + schema + service)
│   └── push/
│       ├── push-configs.ts
│       ├── push-config.schema.ts
│       └── push-config.service.ts
│
└── modules/
    ├── admin-api.module.ts                 (edited)
    ├── tenant-api.module.ts                (edited)
    └── notification/
        ├── notification.module.ts
        ├── notification.service.ts
        ├── notification-delivery.service.ts
        ├── push-event-handlers-implements.service.ts
        ├── notification.controller.ts
        ├── notification.admin.controller.ts
        ├── defs/
        │   ├── notification-service.defs.ts
        │   └── notification-repository.defs.ts
        ├── dto/
        │   ├── request/
        │   │   ├── create-notification-request.dto.ts
        │   │   ├── update-notification-request.dto.ts
        │   │   └── get-notifications-request.dto.ts
        │   └── response/
        │       ├── model/notification.response.ts
        │       ├── create-notification-response.dto.ts
        │       ├── get-notifications-response.dto.ts
        │       └── notification-delivery-response.dto.ts
        ├── entity/
        │   ├── notification.entity.ts
        │   └── notification-delivery.entity.ts
        ├── enum/general.enum.ts
        ├── mapper/notification.mapper.ts
        ├── repository/
        │   ├── notification.repository.ts
        │   ├── notification-prisma.repository.ts
        │   ├── notification-delivery.repository.ts
        │   └── notification-delivery-prisma.repository.ts
        ├── types/
        │   ├── notification-details-schema.type.ts
        │   └── notification-details.include.ts
        └── zod/notification.zod.ts
```

### 24.2 Selected files

**Enum**

```ts
// modules/notification/enum/general.enum.ts
export enum NotificationStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}
```

**Persistence types**

```ts
// modules/notification/types/notification-details-schema.type.ts
import type { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/base.entity';

export type NotificationType = OptionalRelations<
  Prisma.NotificationGetPayload<{ include: { tenant: true; deliveries: true } }>
>;
```

```ts
// modules/notification/types/notification-details.include.ts
import type { Prisma } from '@prisma/client';

export const notificationDetailsInclude = {
  tenant: true,
  deliveries: true,
} satisfies Prisma.NotificationInclude;
```

**Entity shape and entity**

```ts
// modules/notification/zod/notification.zod.ts
import { z } from 'zod';
import { BaseZodSchema, ZodNumber, ZodString, ZodStringNullable } from '@/common/base/base.zod';
import { NotificationStatus } from '@/modules/notification/enum/general.enum';

export type NotificationZodType = z.infer<typeof NotificationZodSchema>;

export const NotificationZodSchema = BaseZodSchema.extend({
  title: ZodString,
  body: ZodStringNullable,
  status: z.nativeEnum(NotificationStatus),
  tenantId: ZodNumber,
});
```

```ts
// modules/notification/entity/notification.entity.ts
import { BaseEntity } from '@/common/base/base.entity';
import { NotificationStatus } from '@/modules/notification/enum/general.enum';
import { NotificationZodType } from '@/modules/notification/zod/notification.zod';

export class NotificationEntity extends BaseEntity {
  title: string;
  body: string;
  status: NotificationStatus;
  tenantId: number;

  constructor(data: NotificationZodType) {
    super();
    Object.assign(this, data);
  }
}
```

**Mapper**

```ts
// modules/notification/mapper/notification.mapper.ts
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';
import { NotificationStatus } from '@/modules/notification/enum/general.enum';
import { NotificationType } from '@/modules/notification/types/notification-details-schema.type';

export class NotificationMapper {
  static toEntity(schema: NotificationType): NotificationEntity {
    return new NotificationEntity({
      id: schema.id,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      title: schema.title,
      body: schema.body,
      status: schema.status as NotificationStatus,
      tenantId: schema.tenantId,
    });
  }
}
```

**Repository contract and implementation**

```ts
// modules/notification/repository/notification.repository.ts
import {
  CreateNotificationRepoInput,
  GetNotificationsRepoInput,
  UpdateNotificationRepoInput,
} from '@/modules/notification/defs/notification-repository.defs';
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';

export abstract class NotificationRepository {
  abstract create(input: CreateNotificationRepoInput, context?: TransactionContext): Promise<NotificationEntity>;
  abstract findById(id: number): Promise<NotificationEntity | null>;
  abstract findAll(input: GetNotificationsRepoInput): Promise<NotificationPage>;
  abstract update(input: UpdateNotificationRepoInput, context?: TransactionContext): Promise<NotificationEntity>;
  abstract delete(id: number, context?: TransactionContext): Promise<void>;
}
```

```ts
// modules/notification/repository/notification-prisma.repository.ts
@Injectable()
export class NotificationPrismaRepository implements NotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(input: GetNotificationsRepoInput): Promise<NotificationPage> {
    const where: Prisma.NotificationWhereInput = {};
    if (input.tenantId) where.tenantId = input.tenantId;
    if (input.status) where.status = input.status;

    const [results, total] = await this.prismaService.$transaction([
      this.prismaService.notification.findMany({
        where,
        include: notificationDetailsInclude,
        take: input.limit ?? DEFAULT_PAGE_SIZE,
        skip: input.offset ?? 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.notification.count({ where }),
    ]);
    return { entities: results.map((result) => NotificationMapper.toEntity(result)), total };
  }
}
```

**Service**

```ts
// modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly tenantService: TenantService,
  ) {}

  async createNotification(input: CreateNotificationServiceInput): Promise<NotificationEntity> {
    await this.tenantService.getTenantById(input.tenantId);
    return this.notificationRepository.create({
      title: input.title,
      body: input.body,
      tenantId: input.tenantId,
    });
  }

  async findNotificationById(id: number): Promise<NotificationEntity | null> {
    return this.notificationRepository.findById(id);
  }

  async getNotificationById(id: number): Promise<NotificationEntity> {
    const notification = await this.findNotificationById(id);
    if (!notification) throw new ResourceNotFoundException('Notification', id);
    return notification;
  }

  async queueNotification(input: QueueNotificationServiceInput): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(input.id);
    if (input.tenantId && notification.tenantId !== input.tenantId) {
      throw new ResourceNotFoundException('Notification', input.id);
    }
    if (notification.status !== NotificationStatus.DRAFT) {
      throw new NotificationNotDraftException(notification.status);
    }
    return this.notificationRepository.update({ id: input.id, status: NotificationStatus.QUEUED });
  }
}
```

**Response DTOs**

```ts
// modules/notification/dto/response/model/notification.response.ts
export class NotificationResponse extends BaseModelResponseDto {
  @ApiProperty({ description: 'Notification title', example: 'Weekly summary' })
  title: string;

  @ApiProperty({ description: 'Current status', enum: NotificationStatus })
  status: NotificationStatus;

  constructor(data: NotificationEntity) {
    super(data);
    this.title = data.title;
    this.status = data.status;
  }
}
```

```ts
// modules/notification/dto/response/get-notifications-response.dto.ts
export class GetNotificationsResponseDto {
  @ApiProperty({ type: () => [NotificationResponse] })
  notifications: NotificationResponse[];

  @ApiProperty({ description: 'Total notifications matching the filter', example: 450 })
  total: number;

  constructor(page: NotificationPage) {
    this.notifications = page.entities.map((n) => new NotificationResponse(n));
    this.total = page.total;
  }
}
```

**Controller**

```ts
// modules/notification/notification.controller.ts
@ApiTags('Tenant - Notifications')
@Controller('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  @ApiBody({ type: CreateNotificationRequestDto })
  @ApiResponse({ status: 201, type: CreateNotificationResponseDto })
  async createNotification(
    @Body() input: CreateNotificationRequestDto,
    @LoggedInUser() currentUser: UserEntity,
  ): Promise<CreateNotificationResponseDto> {
    if (!currentUser.tenantId) {
      throw new AccessDeniedException('User must be associated with a tenant');
    }
    const notification = await this.notificationService.createNotification({
      title: input.title,
      body: input.body,
      tenantId: currentUser.tenantId,
    });
    return new CreateNotificationResponseDto(notification);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiResponse({ status: 200, type: GetNotificationsResponseDto })
  async getNotifications(
    @Query() query: GetNotificationsRequestDto,
    @LoggedInUser() currentUser: UserEntity,
  ): Promise<GetNotificationsResponseDto> {
    const page = await this.notificationService.getNotifications({
      tenantId: currentUser.tenantId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
    return new GetNotificationsResponseDto(page);
  }
}
```

**Module and registration**

```ts
// modules/notification/notification.module.ts
@Module({
  imports: [DatabaseProviderModule, TenantModule, PushProviderModule],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    PushEventHandlersImplementsService,
    { provide: NotificationRepository, useClass: NotificationPrismaRepository },
    { provide: NotificationDeliveryRepository, useClass: NotificationDeliveryPrismaRepository },
  ],
  exports: [NotificationService, NotificationDeliveryService],
})
export class NotificationModule {}
```

```ts
// modules/tenant-api.module.ts   (edited)
@Module({
  imports: [AuthModule, TenantModule, NotificationModule],
  controllers: [TenantController, NotificationController],
  providers: [JwtAuthGuard],
})
export class TenantApiModule {}
```

**Note what this example does *not* contain:** no ORM type in a service or controller, no query
outside the repository, no field mapping in the controller, no SDK call outside the provider, no
`process.env`, and no controller registered in the domain module.

---

## 25. Anti-Patterns

### 25.1 Architectural anti-patterns

| # | Anti-pattern | Why it breaks this architecture |
| --- | --- | --- |
| 1 | Business logic in a controller | the controller is a translator; rules become untestable and duplicated across audiences |
| 2 | Injecting the ORM service into a domain service | destroys the repository contract and makes the service require a database to test |
| 3 | Returning a raw persistence payload from a repository | ORM types leak upward and the entity layer becomes decorative |
| 4 | Returning an entity directly from a controller | internal fields (hashes, secrets, unmapped relations) leak to clients |
| 5 | ORM types in a service, controller, or DTO signature | couples business code to the ORM; changing the ORM becomes a rewrite |
| 6 | A provider importing from `modules/` | inverts the dependency direction; the provider stops being reusable — use a callback interface instead |
| 7 | SDK/protocol details inside a domain service | infrastructure knowledge spreads and cannot be swapped |
| 8 | Declaring controllers in a domain module | breaks audience-scoped documentation and route grouping |
| 9 | Calling a peer domain's repository instead of its service | bypasses that domain's invariants |
| 10 | Calling the ORM's `$transaction` from a service | the ORM leaks into business code; use the abstract `TransactionRunner` (§10.8) |
| 10a | Merging two aggregates into one repository to keep a transaction "repository-local" | produces a god repository and destroys the boundaries the pattern exists to protect |
| 10b | Injecting a model delegate or scoped client into a repository instead of the full ORM service | the repository can no longer open a transaction, count a page, or touch its own satellite tables — the boundary belongs on the abstract contract, not here (§11.1) |
| 11 | `process.env` outside the config namespace files | untyped, unvalidated, undiscoverable configuration |
| 12 | Injecting the generic config service into business code | loses typing and the namespaced-key discipline |
| 13 | Mapping fields in a controller instead of a DTO constructor | response shaping duplicates across handlers |
| 14 | Spreading a request DTO into a service input | the wire contract and the service contract fuse |
| 15 | A god-service accumulating unrelated concerns | split into `<domain>-<aspect>.service.ts` around cohesive sub-concerns |
| 16 | Cyclic module/service dependencies | unresolvable wiring; extract shared behaviour to a third module |
| 17 | Growing `common/` into a dumping ground | shared code that is not truly shared becomes a hidden coupling hub |
| 18 | Prematurely sharing single-use code | the shared root becomes a graveyard of one-consumer helpers |
| 19 | Adding an interceptor/middleware to shape responses | contradicts the DTO-owns-its-shape decision |
| 20 | Inventing a second architectural style alongside the existing one | the value here is uniformity; two styles is worse than either |
| 21 | Throwing `NotFoundException`/`BadRequestException` from a service | couples the domain to HTTP and makes the condition unhandleable by any non-HTTP caller (§17.0) |
| 22 | Mapping an unrecognized runtime error to a 4xx | returns a client error for a server defect and hides it from every 5xx alert (§17.2) |
| 23 | Reporting `total` as the page length | a wrong answer, not an approximation: the client cannot reach the remaining pages (§9.8) |
| 24 | Injecting several domains' repositories into one reporting service | a consumer holding every internal contract can bypass every domain's invariants — use a read-model repository (§11.8) |
| 25 | Marking a module `@Global()` for convenience | deletes the dependency declaration everywhere at once; only config root and the database client qualify (§8.4) |
| 26 | A liveness endpoint used as a readiness probe | traffic keeps arriving at an instance that cannot serve it, or a database blip restarts every instance (§19.3) |

### 25.2 Hygiene rules that keep the structure trustworthy

The patterns above only hold if the files themselves stay clean. These are the failures that most
often erode an otherwise correct structure:

| Failure | Correct practice |
| --- | --- |
| Committing commented-out blocks, scratch files, or half-finished branches | delete them; version control is the archive |
| Misspelled filenames, folders, or class names | spell identifiers correctly — a typo propagates through every future import |
| Two configuration files for the same tool (e.g. two lint configs) | keep exactly one |
| Constants, helpers, or providers that nothing consumes | apply them or delete them |
| Reading `process.env` outside the configuration layer, even as a fallback | add a typed config getter |
| Backward-compatibility overloads that branch on `typeof` inside a provider | pick one signature and migrate the call sites in the same change |
| `any` in repository or mapper helper signatures | type the row from the ORM's generated payload |
| Registering a concrete class both directly and via a token binding | register the token binding only, or you get two instances |
| Mixing `snake_case` and `kebab-case` folder names | kebab-case everywhere |
| Importing a peer module while declaring `imports: []` | remove unused imports and verify no cycle |
| Keeping a deprecated file alongside its replacement | migrate the call sites and delete the old file |

**Rule:** when you touch a file that carries one of these, fix the defect in a deliberate, separately
reviewable change — never half-rename an identifier or half-migrate a call site.

---

## 26. Architecture Rules

Every rule is actionable and unconditional. **[E]** marks a rule that must never be broken; **[C]**
marks a convention where a documented, project-wide decision may choose otherwise — but only once,
for the whole project, never file by file.

### Structure and modules

* **RULE-001 [E]** — Every business domain lives in its own folder under `modules/`, named after the
  concept in singular kebab-case.
* **RULE-002 [E]** — A domain module declares `imports`, `providers`, and `exports` only. It must not
  declare `controllers`.
* **RULE-003 [E]** — Controllers are registered in an audience API module (`<audience>-api.module.ts`),
  which is the sole place routes are grouped per consumer.
* **RULE-004 [E]** — A domain exposes itself through its **services** via `exports`. Concrete
  repositories, mappers, and internal helpers are never exported.
* **RULE-005 [E]** — Cross-domain communication is constructor injection of the peer domain's
  service. Never call a peer's repository.
* **RULE-006 [E]** — The root module imports only the three aggregators. New domains are registered in
  an audience module, never in the root module.
* **RULE-007 [C]** — Split a domain service when it accumulates an independent sub-concern; name the
  new file `<domain>-<aspect>.service.ts`.

### Layering and dependency direction

* **RULE-008 [E]** — `providers/` must never import from `modules/`. Invert with an interface declared
  by the provider and implemented by the domain.
* **RULE-009 [E]** — `config/` must never import from `modules/` or `providers/`.
* **RULE-010 [E]** — `common/` must never import from `modules/`. When shared code needs to describe a
  domain concept, declare the narrow contract in `common/` (e.g. `Principal`) and implement it in the
  domain. A guard or decorator that cannot be expressed that way belongs in `modules/<domain>/`.
* **RULE-011 [E]** — Business logic exists only in services. Controllers, repositories, mappers, DTOs,
  and providers must contain none.
* **RULE-012 [E]** — ORM types must not appear in the signature of a service, controller, or DTO.
* **RULE-013 [E]** — Third-party SDK details live only in `providers/<tech>/`.

### Data access

* **RULE-014 [E]** — Every persisted domain declares `abstract class <Domain>Repository` and binds it
  with `{ provide: <Domain>Repository, useClass: <Domain><Orm>Repository }`.
* **RULE-014a [E]** — A concrete repository injects the **full** ORM client service, never a model
  delegate, a per-domain wrapper, or a scoped client. The boundary is the abstract contract above it,
  not a narrowed dependency inside it; narrowing makes transactions, multi-table aggregate writes,
  page counts, and raw queries impossible or dishonest.
* **RULE-014b [E]** — Full access is capability, not licence. A repository stays inside its aggregate
  because its contract says so, and a repository handed a `TransactionContext` uses it rather than its
  own client.
* **RULE-015 [E]** — Services inject the abstract repository, never a concrete implementation.
* **RULE-016 [E]** — Repositories return **entities**, produced by the domain's mapper. Never raw
  payloads.
* **RULE-017 [E]** — All query construction (`where`, `include`, `take`, `skip`, `orderBy`) lives in the
  repository implementation.
* **RULE-018 [E]** — Partial updates guard each field with `!== undefined`.
* **RULE-019 [E]** — Single-aggregate transactions are opened inside the repository method, and every
  statement inside uses the transactional client.
* **RULE-019a [E]** — A use case spanning several aggregates opens its boundary through the abstract
  `TransactionRunner` in the service, passing the opaque `TransactionContext` to each participating
  repository. A service never touches the ORM client or `$transaction` directly, and no repository is
  widened to another aggregate's tables to avoid this.
* **RULE-019b [C]** — No network I/O inside an open transaction; do that work after commit.
* **RULE-020 [E]** — Repositories return `null`/an empty page for absence; they do not throw not-found.
* **RULE-020a [E]** — A paginated read returns a named page type (`<Domain>Page` with a real `total`,
  or `<Domain>CursorPage` with `hasMore`), never a bare array plus a count reconstructed elsewhere.
* **RULE-021 [E]** — No service injects the ORM client, ever.
* **RULE-021a [E]** — A cross-domain read goes through a dedicated read-model repository owned by the
  reporting module, returning named projection types. A service never injects several domains'
  repositories, and a read-model repository never writes.

### Types, entities, mappers

* **RULE-022 [E]** — The persistence payload type is derived from the ORM's generated payload helper
  and wrapped in `OptionalRelations<T>`, in `types/<domain>-details-schema.type.ts`.
* **RULE-023 [E]** — Reusable relation selections are declared with `satisfies` in
  `types/<domain>-details.include.ts`.
* **RULE-024 [E]** — Entities extend `BaseEntity`, take the domain's `*ZodType` in the constructor, and
  assign via `Object.assign`.
* **RULE-025 [E]** — Mappers are classes with a `static toEntity(schema): Entity` method, map field by
  field, and delegate relations to the related domain's mapper.
* **RULE-026 [E]** — Mapping is one-directional: persistence → entity. Do not add reverse mappers.
* **RULE-027 [C]** — Zod schemas describe the entity construction shape and are consumed as
  `z.infer` types only. They are never used for request validation.
* **RULE-028 [E]** — Domain enums are declared in the domain (`enum/general.enum.ts`) and mirror the
  database literals. ORM-generated enums are cast to domain enums inside the mapper.

### API and DTOs

* **RULE-029 [E]** — Request DTOs annotate every property with `@ApiProperty` and validate with
  `class-validator`; `@IsOptional()` comes first on optional fields.
* **RULE-030 [E]** — Response DTOs map from entities in their own constructors.
* **RULE-031 [E]** — Reusable entity projections live in `dto/response/model/<domain>.response.ts`,
  extend `BaseModelResponseDto`, and are named `<Domain>Response` (no `Dto` suffix).
* **RULE-032 [E]** — Endpoint payloads are envelope classes named `<Purpose>ResponseDto`.
* **RULE-033 [E]** — Relation properties in response DTOs use the lazy form `type: () => X`.
* **RULE-034 [E]** — Controllers destructure request DTOs field by field into the service's named input
  object. Never spread.
* **RULE-035 [E]** — Handlers declare an explicit DTO return type and return a DTO instance.
* **RULE-036 [E]** — Commands with no payload return `BaseMessageResponse`.
* **RULE-037 [E]** — Pagination is `limit`/`offset` query fields with `@Transform(parseInt)`; defaults
  are applied in the service or repository, not the DTO.
* **RULE-037a [E]** — `total` in a list response is a real count of all matching rows, produced by a
  count query using the same `where` as the page. Never `items.length`, never a placeholder. An
  endpoint that cannot afford the count exposes `hasMore`/`nextCursor` and omits `total`.
* **RULE-038 [E]** — Scoping values are derived from the authenticated principal, never from client
  input.
* **RULE-039 [E]** — Path parameters are parsed with `ParseIntPipe`.
* **RULE-040 [E]** — DTOs are domain-local. Only entity projections may be imported across domains.

### Services

* **RULE-041 [E]** — Multi-field inputs are named types in `defs/<domain>-service.defs.ts`
  (`<Verb><Noun>ServiceInput`) and `defs/<domain>-repository.defs.ts` (`<Verb><Noun>RepoInput`).
* **RULE-042 [E]** — Provide both `find<Noun>ById` (nullable) and `get<Noun>ById` (throws a
  `NOT_FOUND` domain exception).
* **RULE-043 [E]** — Services throw; they do not catch for control flow.
* **RULE-044 [E]** — Every method declares an explicit return type.
* **RULE-045 [E]** — Constructor injection with `private readonly`. Loggers are instance fields named
  after the class.
* **RULE-046 [C]** — When a resource exists but belongs to another scope, throw not-found rather than
  access-denied, so existence is not leaked.

### Configuration

* **RULE-047 [E]** — Each configuration concern is a three-file folder: namespace registration,
  validation rules, typed getter service. A concern is **not** a Nest module.
* **RULE-047a [E]** — `ConfigModule.forRoot()` is called exactly once, in `config/configs.module.ts`,
  loading every concern's namespaces and validating one merged schema with `allowUnknown: false`.
* **RULE-048 [E]** — `process.env` is read only in `config/<concern>/<concern>-configs.ts`.
* **RULE-049 [E]** — Every environment variable is validated in the merged schema; secrets are
  `.required()`, non-secrets get `.default(...)`.
* **RULE-050 [E]** — Configuration is consumed only through an injected `<Concern>ConfigService`,
  including inside provider factories.
* **RULE-051 [E]** — Config services extend `BaseConfigService` and expose one getter per value. A
  getter's lookup path is `<registered-namespace>.<propertyName>` and must match the `registerAs` key
  exactly; the base accessor throws on a missing key so a mistyped path fails loudly instead of
  returning `undefined` behind a non-optional return type.
* **RULE-052 [E]** — Secrets never appear in source, documentation, or examples — names only.

### Errors

* **RULE-053 [E]** — Typed exceptions extend `AppException` and supply `message`, `code`, `kind`, and
  `userFriendly`. A domain exception never carries an HTTP status.
* **RULE-053a [E]** — Business code — services, guards, mappers, repositories — never throws a
  framework `HttpException` (`NotFoundException`, `BadRequestException`, `ForbiddenException`,
  `UnauthorizedException`, …). It throws an `AppException` subclass naming the condition.
* **RULE-053b [E]** — The `ErrorKind` → HTTP status translation exists in exactly one table, in the
  transport return handler. No status code appears at a throw site.
* **RULE-054 [E]** — Every external error source gets a `map<Source>Exception` function in
  `common/filter/exception_mappers/`, added to the normalization chain. A code the mapper does not
  recognize falls through to `INTERNAL`, never to a guessed client error.
* **RULE-054a [E]** — Built-in runtime errors (`TypeError`, `RangeError`, `ReferenceError`, and any
  unrecognized throw) normalize to **500**, not user-friendly, logged with a stack. They are defects,
  and mapping them to a 4xx hides a crash behind a client error. A genuine input failure is validated
  at the boundary and thrown as a `VALIDATION` exception instead.
* **RULE-055 [E]** — Logging, monitoring reporting, sanitization, and serialization of errors happen
  only in the global filter.
* **RULE-056 [E]** — Global filters are registered via `APP_FILTER` in the root module so they can be
  injected.
* **RULE-057 [E]** — Validation failures produce the application's validation exception with a
  flattened property-path list.

### Auth

* **RULE-058 [E]** — Strategies verify identity and return the principal entity; guards enforce access;
  metadata decorators declare requirements; parameter decorators extract context.
* **RULE-059 [E]** — Each metadata decorator exports its metadata key next to it; guards import the key.
* **RULE-060 [E]** — The principal reaches handlers only through a parameter decorator.
* **RULE-061 [E]** — Role checks live in a guard, never inline in a controller or service.
* **RULE-062 [E]** — Business-state policies are `assert…` methods on a domain service, invoked by a
  policy guard.
* **RULE-063 [E]** — All token signing and verification goes through the token provider service. Each
  token purpose gets its own secret, and verification is never signature-only: the verified payload's
  subject must be compared against the resource being acted on, because a valid signature proves only
  that the token was issued by this system — not that it names the caller or the target.

### Security and operations

* **RULE-063a [E]** — Security-header middleware is installed at bootstrap before any route. Weaken a
  directive for a specific path only, never globally.
* **RULE-063b [E]** — CORS is configured with an explicit origin list from configuration. Bare
  `enableCors()` and `origin: '*'` are forbidden, and `'*'` with `credentials: true` is never valid.
* **RULE-063c [E]** — A rate-limit guard is registered globally with a conservative default, and
  sign-in, password-reset request and confirmation, token refresh, code verification, registration,
  and any unauthenticated endpoint that sends a message carry a tightened per-route limit keyed on the
  submitted identifier as well as the client address.
* **RULE-063d [E]** — Request body size is capped, and the validation pipe's whitelisting is never
  disabled.
* **RULE-063e [E]** — Health is two endpoints: `/health/live` performs no I/O; `/health/ready` checks
  the database and any dependency the service cannot function without, each with a short timeout.
  Optional dependencies are excluded from readiness, and neither endpoint returns diagnostic
  internals.
* **RULE-063f [E]** — `@Global()` is limited to the configuration root and the database client
  provider. Every other provider and every domain module is imported explicitly.

### Naming and imports

* **RULE-064 [E]** — Files are `kebab-case` with a role suffix; classes are `PascalCase` with the
  matching role suffix.
* **RULE-065 [E]** — Audience-specific controllers use a dot infix:
  `<domain>.<audience>.controller.ts` → `<Domain><Audience>Controller`.
* **RULE-066 [E]** — Cross-folder imports use the `@/` alias. Never `../../`.
* **RULE-067 [E]** — Imports are grouped framework → third-party → internal alias → same-directory
  relative, separated by blank lines.
* **RULE-068 [E]** — No new barrel files; import the exact file. All exports are named except config
  registration defaults.
* **RULE-069 [E]** — Functions start with a verb; booleans use `is`/`has`/`can`/`should`; timestamps use
  `<verb>edAt`; foreign keys use `<noun>Id`.

### Hygiene

* **RULE-070 [E]** — Never commit dead code, scratch files, or large commented-out blocks.
* **RULE-071 [E]** — One contract, one file. Never duplicate an interface across layers.
* **RULE-072 [E]** — A shared file must have at least two real importers when created.
* **RULE-073 [E]** — Do not introduce a second architectural style. Follow the pattern this document
  states, and if a genuinely new pattern is required, apply it everywhere and document it here.

---

## 27. AI Implementation Rules

> Read this section before writing any code in a project that follows this blueprint.

### 27.1 Before you write anything

1. **Locate the layer.** Decide whether the change is API, business logic, data access, translation,
   infrastructure, configuration, or cross-cutting. Write the file only in that layer's folder.
2. **Find the nearest precedent.** Open the most complete existing domain and mirror its file set,
   decorator order, and naming exactly. Precedent beats personal preference and beats generic best
   practice.
3. **Reuse before creating.** Check for an existing service, repository method, model projection,
   `*Input` type, include constant, helper, guard, or exception before adding a new one.
4. **Do not invent a pattern.** If the codebase has no precedent for what you need, prefer the closest
   existing pattern. Introduce something new only when there is no alternative, then apply it
   consistently and document it.

### 27.2 When creating a new domain

Follow §23.1 in order. Do not skip the mapper, the abstract repository, or the `defs/` types even for
a small domain — they are what make the architecture uniform. Skip `dto/` only if the domain has no
endpoints, and skip `entity/`, `mapper/`, `repository/`, `types/`, `zod/` only if the domain owns no
table.

### 27.3 Hard constraints — never violate

```
1.  Business logic lives in services. Not in controllers, repositories, mappers, DTOs, or providers.
2.  Services inject `abstract class <Domain>Repository` — never a concrete implementation,
    and never the ORM client.
3.  Repositories return entities produced by the mapper. Never raw ORM payloads.
4.  Controllers return DTO instances. Never entities.
5.  ORM types never appear in a service, controller, or DTO signature.
6.  `providers/**` never imports from `modules/**`. Invert with an interface.
7.  `process.env` is read only in `config/<concern>/<concern>-configs.ts`, and
    `ConfigModule.forRoot()` is called only in `config/configs.module.ts`.
8.  Single-aggregate transactions live in repository methods; cross-aggregate boundaries go through
    the abstract `TransactionRunner`. Business code never calls the ORM's transaction API.
9.  Cross-folder imports use `@/…`. Never `../../`.
10. Domain modules declare no `controllers`; register them in an audience API module.
11. Role/permission checks live in guards, declared by metadata decorators.
12. Response mapping happens in DTO constructors; request unwrapping happens in the controller.
13. Never commit dead code, scratch files, secrets, or commented-out blocks.
14. Never add a barrel file.
15. Business code throws `AppException` subclasses. Never a framework `HttpException`, and never a
    status code at a throw site.
16. Unrecognized runtime errors normalize to 500. Never map a `TypeError` to a client error.
17. `total` in a list response comes from a count query, or the endpoint exposes `hasMore` instead.
18. `@Global()` is limited to the configuration root and the database client provider.
```

### 27.4 Mechanical checklist per artifact

**Adding a service method**

```
[ ] Named `*ServiceInput` type in defs/ if it takes more than one meaningful field
[ ] Verb-first name; find… for nullable, get… for throwing, assert… for policy, is/has/can for predicates
[ ] Explicit return type
[ ] Business rules and precondition throws inside the method, as AppException subclasses
[ ] Builds the repository input object explicitly — does not forward its own input
[ ] No ORM import, no HttpException, no status code, no process.env
[ ] Cross-aggregate atomicity, if any, goes through the TransactionRunner — never $transaction
```

**Adding a repository method**

```
[ ] Signature added to the abstract class first
[ ] Implemented in the concrete class with @Injectable, injecting the full ORM client service
[ ] Named `*RepoInput` type in defs/ for multi-field inputs
[ ] Query built locally; partial updates guarded with !== undefined
[ ] Result passed through the mapper; returns an entity, null, or a named page type
[ ] A paginated read returns a real total from a count query using the same where
[ ] Single-aggregate multi-write wrapped in a transaction using the transactional client
[ ] Writes accept an optional trailing TransactionContext and honour it when supplied
```

**Adding an endpoint**

```
[ ] Request DTO with @ApiProperty + class-validator on every field
[ ] Guards applied; @Roles or the equivalent metadata declared
[ ] @ApiOperation, @ApiParam/@ApiBody, and @ApiResponse for every documented status
[ ] Handler destructures the DTO field by field into the service input
[ ] Scoping derived from @LoggedInUser(), never from the client
[ ] Returns `new <Purpose>ResponseDto(entity)` with an explicit return type
[ ] Controller registered in the correct audience API module
[ ] No business branching in the handler beyond request-shape preconditions
[ ] Credential-adjacent or unauthenticated message-sending routes carry a tightened rate limit
```

**Adding a third-party integration**

```
[ ] providers/<tech>/ with a module + service; module exported where needed
[ ] SDK types confined to the provider; shapes declared in defs/
[ ] Inbound events modelled as a provider-declared interface implemented by a domain service
[ ] Credentials/endpoints added as a config concern
[ ] Error strategy chosen: typed provider exception, or log-and-return for best-effort work
[ ] A domain service wraps it with business meaning; no domain file imports the SDK
```

**Adding configuration**

```
[ ] Variable UPPER_SNAKE_CASE, added to the environment file and the example (name only)
[ ] Mapped in the concern's namespace registration
[ ] Validated in the concern's schema object (.required() for secrets, .default() otherwise)
[ ] Namespaces and schema spread into the single ConfigModule.forRoot() in configs.module.ts
[ ] One typed getter added to the concern's config service; lookup path matches the registerAs key
[ ] Consumed by injecting the config service — no second forRoot(), no generic ConfigService
```

### 27.5 When you find an inconsistency

1. Prefer the pattern this document states. It is the arbiter, not the surrounding file.
2. Where the document is silent, prefer the pattern used by **more** files.
3. Never "fix" an inconsistency by introducing a third variant.
4. Never rename existing files or classes opportunistically — even misspelled ones — unless the rename
   is the explicit task, and then rename every reference in the same change.

### 27.6 Definition of done

```
[ ] Every new file sits in the correct layer and follows the naming convention
[ ] The domain module wires services and binds the repository token
[ ] The controller is registered in an audience API module
[ ] Every handler has full OpenAPI annotation and an explicit DTO return type
[ ] No forbidden dependency direction was introduced
[ ] No ORM type escaped the repository; no entity escaped the controller
[ ] Configuration additions are validated and typed
[ ] Lint and formatter pass; imports are aliased and ordered
[ ] Tests follow §20; providers are mocked
[ ] No dead code, no secrets, no commented-out blocks
```

---

## 28. Final Checklist

Run before creating or modifying code.

### Placement

```
[ ] Is this file in the correct layer (api / service / data / translation / infrastructure / config / shared)?
[ ] Does the folder match the existing structure — no new folder invented?
[ ] Does the filename follow kebab-case + role suffix?
[ ] Does the class name follow PascalCase + the matching role suffix?
[ ] For an audience-specific controller, is the dot infix used?
```

### Reuse and duplication

```
[ ] Did I search for an existing service, repository method, model projection, *Input type,
    include constant, guard, helper, or exception before creating one?
[ ] Am I duplicating a contract, interface, or constant that already exists elsewhere?
[ ] If I created a shared file, does it have at least two real importers right now?
```

### Dependency direction

```
[ ] Does any provider/ file import from modules/?                          → must be NO
[ ] Does any config/ file import from modules/ or providers/?              → must be NO
[ ] Does a new common/ file import from modules/?                          → must be NO
[ ] Am I injecting an abstract repository rather than a concrete class?    → must be YES
[ ] Am I injecting the ORM client into a service?                          → must be NO
[ ] Am I calling a peer domain's service (not its repository)?             → must be YES
[ ] Have I introduced a module or service cycle?                           → must be NO
[ ] Are all cross-folder imports using @/ (never ../../)?                  → must be YES
```

### Layer purity

```
[ ] Is all business logic in a service?
[ ] Does any ORM type appear in a service, controller, or DTO signature?   → must be NO
[ ] Does the repository return an entity via the mapper?
[ ] Does the controller return a DTO, never an entity?
[ ] Is any SDK/protocol detail outside providers/?                          → must be NO
[ ] Is process.env read anywhere but config/<concern>/<concern>-configs.ts? → must be NO
[ ] Is the ORM's $transaction called outside a repository?                   → must be NO
[ ] Does business code throw a framework HttpException?                      → must be NO
[ ] Does any throw site name an HTTP status code?                            → must be NO
[ ] Is a new module marked @Global() (beyond config root / database client)? → must be NO
```

### Artifact-specific

```
[ ] Does this need a persistence payload type and an include constant in types/?
[ ] Does this need an entity (base class + Zod-typed constructor)?
[ ] Does this need a mapper (persisted domain read through a repository)? — and NOT for entity→DTO
[ ] Does this need an abstract repository + concrete implementation + token binding?
[ ] Does this need a request DTO (@ApiProperty + class-validator on every field)?
[ ] Does this need a response projection in dto/response/model/, or does one already exist?
[ ] Does this need a response envelope, mapping in its constructor?
[ ] Does this need a named *ServiceInput / *RepoInput type in defs/?
[ ] Does this need a find…/get… pair?
[ ] Does this need a domain enum mirroring database literals?
[ ] Does this need a new config concern, or a value added to an existing one?
[ ] Does this need a provider — and if it emits events, a provider-declared handler interface?
[ ] Does this need a new map<Source>Exception added to the normalization chain?
[ ] Does this need a domain exception in modules/<domain>/exceptions/, or does a semantic base fit?
[ ] Does this cross-domain read need a read-model repository rather than more injected repositories?
```

### API surface

```
[ ] Guards applied, and role/permission requirements declared via decorators?
[ ] @ApiTags / @ApiBearerAuth on the class; @ApiOperation, @ApiBody/@ApiParam, @ApiResponse per handler?
[ ] Request DTO destructured field by field into the service input?
[ ] Scoping derived from the authenticated principal, not from client input?
[ ] Path parameters parsed with ParseIntPipe?
[ ] Explicit DTO return type on every handler?
[ ] Controller registered in the correct audience API module (and NOT in the domain module)?
[ ] Pagination as limit/offset with @Transform(parseInt), defaults applied in service/repository?
[ ] Does `total` come from a real count query — never items.length?
```

### Abstractions and consistency

```
[ ] Am I introducing a new abstraction? If so, is there no existing pattern that fits?
[ ] Am I introducing a second style for something this document already specifies?  → must be NO
[ ] Where the code disagrees with this document, did I follow the document?
[ ] Did I avoid opportunistically renaming existing files or classes?
```

### Quality

```
[ ] Lint and formatter pass; imports grouped and ordered?
[ ] Explicit return types on every function and method?
[ ] No `any` in a signature I authored?
[ ] Tests added per §20, with providers mocked and the repository token overridden?
[ ] No dead code, scratch files, or commented-out blocks?
[ ] No secrets, credentials, connection strings, or real environment values anywhere?
```
