# Patrick Travel Services - Immigration Management Platform

A production-ready full-stack web application for managing immigration services, built with modern web technologies and best practices. The platform streamlines case management, client communications, and administrative operations for immigration consulting services.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand for global state, React Query for server state
- **Data Fetching**: TanStack Query v5 with optimized caching strategies
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table v8 with server-side pagination
- **Charts**: Recharts for analytics visualization
- **Internationalization**: i18next with React i18next

### Backend
- **API**: Next.js API Routes (RESTful)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Authentication with custom claims
- **Real-time**: Firebase Realtime Database for messaging
- **File Storage**: UploadThing (web) and Cloudinary (mobile)
- **Email**: Nodemailer with SMTP
- **Payments**: Stripe integration

### Infrastructure & DevOps
- **Package Manager**: pnpm
- **Code Quality**: ESLint 9, Prettier, TypeScript strict mode
- **Git Hooks**: Husky with lint-staged
- **CI/CD**: GitHub Actions with automated testing and Docker builds
- **Containerization**: Docker with multi-stage builds
- **PWA**: Progressive Web App with offline support

## Architecture & Patterns

### Application Architecture
- **Feature-based organization**: Modular structure with clear separation of concerns
- **Server Components**: Next.js App Router with optimal server/client component usage
- **API Layer**: RESTful endpoints with consistent error handling and response formats
- **Middleware**: Custom authentication and authorization middleware
- **Type Safety**: End-to-end TypeScript with strict mode enabled

### Performance Optimizations
- Code splitting with React.lazy() and Suspense boundaries
- Image optimization with Next.js Image component (AVIF/WebP)
- Aggressive caching strategies with React Query
- Bundle optimization with Next.js standalone output
- Lazy loading for non-critical components
- Memoization for expensive computations

### Security Practices
- Firebase Authentication with ID token verification
- Role-based access control (RBAC) with custom claims
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- PII protection with HMAC-SHA256 hashing in logs
- CORS configuration for production
- Rate limiting middleware

### Code Quality
- TypeScript strict mode with comprehensive type coverage
- ESLint with Next.js and TypeScript rules
- Prettier for consistent code formatting
- Pre-commit hooks for automated quality checks
- Conventional commits with Commitlint
- Environment variable validation script

## Key Features

### Core Functionality
- Multi-role authentication (Admin, Agent, Client) with Firebase
- Case management with status tracking and assignment
- Document management with verification workflows
- Real-time messaging with Firebase Realtime Database
- Email integration with case-based routing
- Payment processing with Stripe
- Analytics dashboard with performance metrics
- Audit logging for compliance

### Advanced Features
- Invite code system for secure staff onboarding
- FAQ management with multi-language support
- Template library for document generation
- Notification system with real-time updates
- User profile management with GDPR compliance
- Video calling integration (ZegoCloud)
- Progressive Web App with offline capabilities

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API endpoints
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── features/             # Feature modules
│   ├── auth/            # Authentication feature
│   ├── cases/           # Case management
│   ├── documents/       # Document handling
│   └── messages/        # Messaging system
├── lib/                  # Utilities and configurations
│   ├── auth/            # Authentication utilities
│   ├── db/              # Database (Prisma)
│   ├── firebase/        # Firebase integration
│   └── utils/           # Helper functions
└── stores/              # Zustand state stores
```

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- pnpm 8.x or higher
- PostgreSQL 14.x or higher
- Firebase project with Realtime Database

### Installation

```bash
# Clone repository
git clone <repository-url>
cd web-2

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
pnpm prisma:generate
pnpm prisma:migrate:deploy

# Seed database (optional)
pnpm prisma:seed

# Start development server
pnpm dev
```

### Environment Variables

Required environment variables include:
- Database connection (DATABASE_URL)
- Firebase credentials (admin and client)
- Email configuration (SMTP)
- Payment processing (Stripe)
- Security secrets (PII_HASH_SECRET, CRON_SECRET)

Run `pnpm check:env` to verify all required variables are set.

## Development

### Available Scripts

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm start            # Production server
pnpm lint             # Run ESLint
pnpm format           # Format code
pnpm type-check       # TypeScript validation
pnpm validate         # Run all quality checks
pnpm check:env        # Verify environment variables
```

### Database Management

```bash
pnpm prisma:generate      # Generate Prisma Client
pnpm prisma:migrate       # Create migration
pnpm prisma:migrate:deploy # Apply migrations (production)
pnpm prisma:studio        # Open Prisma Studio
```

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Production build
docker build -t patrick-travel-web:latest .
docker run -p 3000:3000 --env-file .env patrick-travel-web:latest
```

### CI/CD

The project includes GitHub Actions workflow for:
- Automated code quality checks
- TypeScript validation
- Production builds
- Docker image publishing
- Security scanning

## Technical Highlights

### Modern React Patterns
- Server and Client Components with optimal usage
- Suspense boundaries for loading states
- React Query for efficient data fetching and caching
- Custom hooks for reusable logic
- Context API for theme and i18n

### Database Design
- PostgreSQL with Prisma ORM
- Migrations for schema versioning
- Optimized queries with proper indexing
- Transaction support for data integrity
- GDPR-compliant data handling

### API Design
- RESTful conventions
- Consistent error handling
- Request validation with Zod
- Authentication middleware
- Rate limiting support

### Performance
- Code splitting and lazy loading
- Image optimization (AVIF/WebP)
- Bundle size optimization
- Caching strategies
- PWA with service workers

## License

MIT
