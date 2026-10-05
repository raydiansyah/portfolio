# Backend API

## Setup

1. Install dependencies:
```bash
cd apps/api
npm install
```

2. Setup PostgreSQL database:
```bash
# Create database
createdb portfolio
```

3. Configure `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/portfolio
BETTER_AUTH_SECRET=your-secret-key
PORT=3001
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start server:
```bash
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/sign-up` - Register
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get session

### Projects
- `GET /api/projects` - List all
- `GET /api/projects/:id` - Get one
- `POST /api/projects` - Create (auth required)
- `PUT /api/projects/:id` - Update (auth required)
- `DELETE /api/projects/:id` - Delete (auth required)

### Experiences
- `GET /api/experiences` - List all
- `GET /api/experiences/:id` - Get one
- `POST /api/experiences` - Create (auth required)
- `PUT /api/experiences/:id` - Update (auth required)
- `DELETE /api/experiences/:id` - Delete (auth required)
