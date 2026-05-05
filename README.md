# M-Music Project

## Overview

This project is a Node.js/Express web application for music/song browsing and authentication. It uses MongoDB via Mongoose for data persistence and supports both local user authentication and Google OAuth.

## Architecture

- `server.js`: application entrypoint
  - loads environment variables
  - configures middleware (CORS, Helmet, JSON body parsing, session storage)
  - initializes Passport for OAuth
  - serves static UI files from `public`
  - mounts routes
  - connects to MongoDB
  - handles shutdown and errors

- `src/routes/`
  - `auth.js`: local authentication endpoints (`/api/login`, `/api/register`, `/api/logout`, `/api/me`)
  - `oauth.js`: Google OAuth endpoints (`/auth/google`, `/auth/google/callback`, `/auth/google/failure`)
  - `main.js`: song-related endpoints (`/api/songs`, `/api/songs/search/:query`, `/api/songs/:id`)

- `src/controllers/`
  - `authController.js`: handles authentication workflows, session creation, user lookup, and logout
  - `songController.js`: handles song listing, search, and retrieval by ID

- `src/services/`
  - `authService.js`: handles user payload validation, password hashing, password verification, and public user formatting
  - `songService.js`: handles song database queries and search logic

- `src/models/`
  - `user.js`: Mongoose schema for users, including Google OAuth and local login fields
  - `songform.js`: Mongoose schema for songs, matching the existing `Songs` collection

- `src/middleware/`
  - `authRateLimit.js`: rate limiting on auth write endpoints (`/register`, `/login`)
  - `validation.js`: request validation middleware for MongoDB ObjectIds
  - `error.js`: centralized error handler for API responses

- `config/passport.js`
  - configures Passport Google OAuth strategy, serialization, and deserialization

## Code Flow

1. Client sends a request to an endpoint.
2. `server.js` routes the request to the appropriate router.
3. The router delegates to a controller.
4. The controller performs validation and calls a service.
5. The service queries or updates MongoDB models.
6. The controller returns JSON to the client or handles errors via the error middleware.

### Example: Login flow

1. `POST /api/login` → `src/routes/auth.js`
2. Calls `authController.login`
3. Validates payload via `authService.validateLoginPayload`
4. Finds the user in `src/models/user.js`
5. Verifies password using `authService.verifyPassword`
6. Creates a local session and returns public user data

### Example: Song search flow

1. `GET /api/songs/search/:query` → `src/routes/main.js`
2. Calls `songController.searchSongs`
3. Normalizes and validates the query in `songService.searchSongs`
4. Queries `src/models/songform.js` using a case-insensitive regex
5. Returns matching songs

## Notes

- The project now aligns `package.json` with `server.js` as the true entrypoint.
- Static UI files are served from `public/css`, `public/html`, and `public`.
- Sessions are stored in MongoDB using `connect-mongo`.
- OAuth is optional and requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Run commands

```bash
npm install
npm run dev
```

## Environment variables

Required:
- `MONGODB_URL`
- `SESSION_SECRET`

Optional (for Google OAuth):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
