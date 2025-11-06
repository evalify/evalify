# Evalify

A comprehensive student evaluation platform built with modern web technologies.

## Tech Stack

- **Next.js** - React framework
- **tRPC** - End-to-end typesafe APIs
- **Drizzle ORM** - Database toolkit
- **MinIO** - Object storage
- **Redis** - Caching layer
- **shadcn/ui** - UI components
- **PostHog** - Analytics

## Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose

## Setup

### 1. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

### 2. Start Dependencies

Launch required services using Docker:

```bash
docker compose up -d
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Database Setup

**For Development:**

```bash
pnpm db:push
```

**For Production:**

```bash
pnpm db:generate
pnpm db:migrate
```

**To run Drizzle Studio**

```bash
pnpm db:studio
```

### 5. Run the Application

**Development:**

```bash
pnpm dev
```

**Production:**

```bash
pnpm build
pnpm start
```

The application will be available at `http://localhost:3000`
