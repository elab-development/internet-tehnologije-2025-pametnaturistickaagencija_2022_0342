# Smart Travel Agency

Full-stack web application for intelligent travel planning.\
The system integrates travel data aggregation, generative AI, real-time
communication, and role-based access control.

------------------------------------------------------------------------

## Overview

Smart Travel Agency consists of:

-   Frontend: Next.js 14 (App Router), TypeScript
-   Backend: Node.js and Express
-   Database: PostgreSQL with Prisma ORM
-   AI Engine: Gemini 2.0 Flash
-   Travel Data: SerpAPI
-   Real-Time Communication: Socket.io
-   Authentication: JWT with role management

------------------------------------------------------------------------

## System Architecture

    root
    ├── backend
    └── frontend

------------------------------------------------------------------------

## Installation

### 1. Clone Repository

``` bash
git clone https://github.com/<your-username>/internet-tehnologije-2025-pametnaturistickaagencija_2022_0342.git
cd internet-tehnologije-2025-pametnaturistickaagencija_2022_0342
```

### 2. Start Database (Docker)

``` bash
docker compose up -d
```

Or:

``` bash
docker run --name pta_db   -e POSTGRES_USER=pta_user   -e POSTGRES_PASSWORD=pta_password   -e POSTGRES_DB=pta_db   -p 5432:5432   -d postgres
```

### 3. Backend Setup

``` bash
cd backend
npm install
```

Create .env inside backend/:

    DATABASE_URL="postgresql://pta_user:pta_pass@localhost:5432/pta_db?schema=public"
    PORT=3001
    FRONTEND_URL=http://localhost:3000
    JWT_SECRET= your_jwt_secret
    JWT_EXPIRES_IN=7d
    GEMINI_API_KEY= your_gemini_key
    GEMINI_MODEL=gemini-2.0-flash
    SERPAPI_KEY = your_serpapi_key

    SOCKET_PORT=4001
    SOCKET_ORIGIN=http://localhost:3000
    REQUIRE_SOCKET_AUTH=false


    CHAT_RATE_LIMIT_MS=1200
    CHAT_MAX_MESSAGE_CHARS=1500
    CHAT_TTL_MINUTES=180
    CHAT_MAX_MESSAGES=50

Run migrations:

``` bash
npx prisma migrate dev
npx prisma generate
```

Start backend:

``` bash
npm run dev
```

Backend: http://localhost:3001\
WebSocket: ws://localhost:4001

### 4. Frontend Setup

``` bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

------------------------------------------------------------------------

## Project Structure

### Backend

    backend/
    ├── prisma/
    │   ├── migrations/
    │   └── schema.prisma
    ├── src/
    │   ├── ai/
    │   ├── middleware/
    │   ├── routes/
    │   ├── services/
    │   ├── app.js
    │   └── prisma.js
    ├── socket-server.js
    └── package.json

### Frontend

    frontend/
    ├── app/
    │   ├── admin/
    │   ├── chat/
    │   ├── login/
    │   ├── register/
    │   ├── profile/
    │   ├── saved/
    │   ├── components/
    │   ├── context/
    │   ├── hooks/
    │   └── lib/
    ├── public/
    └── package.json

------------------------------------------------------------------------

## Authentication

JWT-based authentication.

Roles:

-   GUEST
-   USER
-   ADMIN

Header format:

    Authorization: Bearer <token>

------------------------------------------------------------------------

## Core Endpoints

    POST /api/auth/register
    POST /api/auth/login
    GET  /api/travel/search
    GET  /api/chats
    GET  /api/messages
    GET  /api/savedOffers

------------------------------------------------------------------------

## Database

Core entities:

-   User
-   Chat
-   Message
-   SavedOffer

Schema: backend/prisma/schema.prisma

------------------------------------------------------------------------

## Deployment

-   Frontend: Vercel
-   Backend: Railway / Render / VPS
-   Database: Managed PostgreSQL or Docker







