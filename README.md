# M-Music

M-Music is a lyric discovery web app built with Express, MongoDB, and a static frontend. It supports local account login, Google OAuth, searchable lyric browsing, theme controls, and lyric-reader interactions like copy and auto-scroll.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- Passport Google OAuth
- Vanilla HTML, CSS, and JavaScript

## Local Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Fill in your MongoDB and Google OAuth credentials
4. Start the app with `npm run dev`

## Environment Variables

- `PORT`
- `MONGODB_URL`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `APP_ORIGIN`

## Current Production Improvements

- Session-based auth with server-side logout
- Safer login/register redirect handling
- Basic origin checks and auth rate limiting
- Search endpoint cleanup and paged song listing
- Removed stale client-side auth caching

## Next Improvements

- Add lyric submission and admin moderation
- Add automated tests and CI
- Add SEO-friendly lyric detail routes
- Split shared frontend layout into reusable templates/components
