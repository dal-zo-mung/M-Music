# Project Architecture UML

This diagram reflects the current Express + MongoDB application structure.

```mermaid
classDiagram
    class Server {
        +start()
        +connectMongo()
        +shutdown(signal)
    }

    class AuthRoutes {
        +GET /api/logout
        +POST /api/logout
        +GET /api/me
        +POST /api/register
        +POST /api/login
    }

    class OAuthRoutes {
        +GET /auth/google
        +GET /auth/google/callback
        +GET /auth/google/failure
    }

    class MainRoutes {
        +GET /api/songs
        +GET /api/songs/search/:query
        +GET /api/songs/:id
    }

    class AuthController {
        +register(req, res, next)
        +login(req, res, next)
        +logout(req, res, next)
        +logoutJson(req, res, next)
        +getCurrentUser(req, res, next)
        +startGoogleAuth(req, res, next)
        +finishGoogleAuth(req, res)
        +googleFailure(req, res)
    }

    class SongController {
        +listSongs(req, res, next)
        +searchSongs(req, res, next)
        +getSongById(req, res, next)
    }

    class AuthService {
        +validateRegistrationPayload(payload)
        +validateLoginPayload(payload)
        +hashPassword(password)
        +verifyPassword(password, storedValue)
        +toPublicUser(user)
    }

    class SongService {
        +listSongs()
        +searchSongs(query, limit)
        +getSongById(id)
    }

    class User {
        +googleId: String
        +username: String
        +password: String
        +firstName: String
        +lastName: String
        +displayName: String
        +profileImage: String
        +emails: Array
        +name: Object
        +createdAt: Date
        +updatedAt: Date
    }

    class SongForm {
        +Song Title: String
        +Artist: String
        +Released Date: String
        +About Song: String
        +Direct to YT: String
        +Lyric: String[]
        +albumCover: String
        +audioFile: String
    }

    class PassportConfig {
        +initializePassport()
    }

    class ErrorMiddleware {
        +errorhandler(err, req, res, next)
    }

    class ValidationMiddleware {
        +validateObjectIdParam(paramName)
    }

    class RateLimitMiddleware {
        +authWriteLimiter
    }

    Server --> AuthRoutes : mounts
    Server --> OAuthRoutes : mounts
    Server --> MainRoutes : mounts
    Server --> PassportConfig : configures
    Server --> ErrorMiddleware : uses

    AuthRoutes --> AuthController : delegates
    OAuthRoutes --> AuthController : delegates
    MainRoutes --> SongController : delegates

    AuthController --> AuthService : uses
    AuthController --> User : reads/writes
    SongController --> SongService : uses
    SongService --> SongForm : reads
    PassportConfig --> User : reads/writes

    AuthRoutes --> RateLimitMiddleware : protects register/login
    MainRoutes --> ValidationMiddleware : validates id param
```

## Notes

- The main server entrypoint is `server.js`.
- Authentication is handled by `src/controllers/authController.js` and `src/services/authService.js`.
- Song data flows from `src/routes/main.js` → `src/controllers/songController.js` → `src/services/songService.js` → `src/models/songform.js`.
- OAuth is configured in `config/passport.js` and exposed under `/auth/google` routes.
- The code structure is generally clean, with route/controllers/services/models separated clearly.
- One minor consistency note: `package.json` sets `main` to `index.js` while the actual server entrypoint is `server.js`.
