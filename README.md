# Smart Travel Agency

Full-stack web application for intelligent travel planning.\
The system integrates travel data aggregation, generative AI, real-time
communication, and role-based access control.

------------------------------------------------------------------------

## Project Vision

Smart Travel Agency is designed to combine AI-powered travel planning,
real-time communication, and structured data aggregation into a single
intelligent platform.\
The goal is to provide users with optimized travel suggestions based on
preferences, budget, and real-time availability.

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   Next.js 14 (App Router)
-   TypeScript
-   Context API
-   Socket.io Client

### Backend

-   Node.js
-   Express
-   Prisma ORM
-   PostgreSQL
-   Socket.io

### AI & External Services

-   Gemini 2.0 Flash (Generative AI)
-   SerpAPI (Travel data aggregation)

### DevOps

-   Docker
-   Docker Compose
-   Vercel (Frontend deployment)
-   Railway / Render / VPS (Backend deployment)

------------------------------------------------------------------------

## System Architecture

The application follows a layered architecture:

Client (Next.js) \| v REST API (Express) \| v Service Layer (AI + Travel
Aggregation) \| v Database (PostgreSQL via Prisma)

Additionally: - WebSocket server handles real-time chat communication. -
AI module validates and structures travel plans. - Role-based middleware
secures protected routes.

------------------------------------------------------------------------

## Architecture Diagram

High-level interaction:

User (Browser) \| v Frontend (Next.js) \| v Backend REST API (Express)
\| +--\> Prisma ORM --\> PostgreSQL \| +--\> Gemini AI API \| +--\>
SerpAPI \| +--\> WebSocket Server (Socket.io)

------------------------------------------------------------------------

## Installation

### 1. Clone the Repository

``` bash
git clone https://github.com/<your-username>/internet-tehnologije-2025-pametnaturistickaagencija_2022_0342.git
cd internet-tehnologije-2025-pametnaturistickaagencija_2022_0342
```

------------------------------------------------------------------------

## Database Setup (Docker)

``` bash
docker compose up -d
```

Or manually:

``` bash
docker run --name pta_db   -e POSTGRES_USER=pta_user   -e POSTGRES_PASSWORD=pta_password   -e POSTGRES_DB=pta_db   -p 5432:5432   -d postgres
```

------------------------------------------------------------------------

## Backend Setup

``` bash
cd backend
npm install
```

Create `.env` file inside `backend/`:

DATABASE_URL="postgresql://pta_user:pta_password@localhost:5432/pta_db?schema=public"
PORT=3001 FRONTEND_URL=http://localhost:3000

JWT_SECRET=n/a JWT_EXPIRES_IN=7d

GEMINI_API_KEY=n/a GEMINI_MODEL=gemini-2.0-flash

SERPAPI_API_KEY=n/a

SOCKET_PORT=4001 SOCKET_ORIGIN=http://localhost:3000
REQUIRE_SOCKET_AUTH=false

CHAT_RATE_LIMIT_MS=1200 CHAT_MAX_MESSAGE_CHARS=1500 CHAT_TTL_MINUTES=180
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

------------------------------------------------------------------------

## Frontend Setup

``` bash
cd frontend
npm install
npm run dev
```

------------------------------------------------------------------------

## Docker (Full Application)

To build and run the entire system:

``` bash
docker compose up --build
```

------------------------------------------------------------------------

## Swagger API Documentation

Swagger documentation is available for interactive API testing.

After starting the backend, access:

http://localhost:3001/api-docs

Swagger provides: - Complete endpoint documentation - Request/response
schemas - Authentication testing with JWT - Interactive testing
environment

------------------------------------------------------------------------

## Authentication & Roles

JWT-based authentication.

Supported roles: - GUEST - USER - ADMIN

Protected routes require:

Authorization: Bearer `<token>`{=html}

------------------------------------------------------------------------

## Core API Endpoints

POST /api/auth/register\
POST /api/auth/login\
GET /api/travel/search\
GET /api/chats\
GET /api/messages\
GET /api/savedOffers

------------------------------------------------------------------------

## Database Design

Core entities: - User - Chat - Message - SavedOffer

ORM: Prisma\
Schema location: backend/prisma/schema.prisma

------------------------------------------------------------------------

## Key Features

-   AI-powered structured travel plan generation
-   Real-time chat using WebSockets
-   Role-based access control (RBAC)
-   Travel offer aggregation
-   Persistent chat history
-   Secure JWT authentication
-   Rate limiting for chat
-   Dockerized environment

------------------------------------------------------------------------

## Deployment

Frontend: Vercel\
Backend: Railway / Render / VPS\
Database: Managed PostgreSQL or Docker

------------------------------------------------------------------------

## Portfolio Highlights

This project demonstrates:

-   Full-stack architecture design
-   Integration of generative AI into production systems
-   REST API development with role security
-   Real-time communication via WebSockets
-   Database schema design and migrations with Prisma
-   Docker-based environment configuration
-   External API integration (SerpAPI, Gemini)

------------------------------------------------------------------------

## Author

Katarina Rajić, Jana Šumonja, Ilija Ćendić
,Faculty of Organizational Sciences







