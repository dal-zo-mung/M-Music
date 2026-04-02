import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MongoStore from 'connect-mongo';
import errorhandler from './src/middleware/error.js';
import mainRoutes from './src/routes/main.js';
import authRoutes from './src/routes/auth.js';
import oauthRoutes from './src/routes/oauth.js';
import session from 'express-session';
import passport from 'passport';
import initializePassport from './config/passport.js';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { securityHeaders } from './src/middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before using them
dotenv.config();

const PORT = process.env.PORT || 8000;
const MONGODB_URL = process.env.MONGODB_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE_NAME = 'm_music.sid';
const isProduction = process.env.NODE_ENV === 'production';

if (!MONGODB_URL) {
    console.error('MONGODB_URL is not set in environment. Set it in .env');
    process.exit(1);
}

if (!SESSION_SECRET) {
    console.error('SESSION_SECRET is not set in environment. Set it in .env');
    process.exit(1);
}

const app = express();
app.disable('x-powered-by');

if (isProduction) {
    app.set('trust proxy', 1);
}

initializePassport();

// Request logging (development)
app.use(morgan('dev'));

app.use(cors(process.env.APP_ORIGIN ? {
    origin: process.env.APP_ORIGIN,
    credentials: true
} : {
    origin: false
}));
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Persist sessions in MongoDB so auth survives restarts and scaled deployments.
app.use(session({
    name: SESSION_COOKIE_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URL,
        ttl: 14 * 24 * 60 * 60,
        autoRemove: 'native'
    }),
    cookie: {
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: isProduction
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
// Serve static UI — add short maxAge in development to avoid stale CSS during development
// Serve entire public folder so CSS/JS/assets are available.  HTML files live
// under public/html, so we also provide a root route for index.html.
const staticOptions = process.env.NODE_ENV === 'production' ? { maxAge: '7d' } : { maxAge: 0 };

// CSS files are referenced from the root (e.g. <link href="index.css">) in the
// HTML, so expose the css directory at '/'.
app.use(express.static(path.join(__dirname, 'public', 'css'), staticOptions));

// serve HTML pages (login/register/index etc.) from the html folder as well so
// requests like /Login.html and /Register.html succeed.
app.use(express.static(path.join(__dirname, 'public', 'html'), staticOptions));

// serve everything else (js, icons, images, fonts, etc.) from public
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// root route returns the index page (static middleware above will also serve it,
// but the explicit route lets us control headers or fallback if you prefer)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'Index.html'));
});

// const MONGODB_URL = "mongodb://localhost:27017/LyricContainer";
// MongoDB Connection
mongoose.set('strictQuery', false);
async function connectMongo() {
    if (mongoose.connection.readyState !== 0) return;
    try {
        // Newer mongoose releases don't require these options; pass only the URL
        await mongoose.connect(MONGODB_URL);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}
connectMongo();

mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));

// Simple API health check
app.get('/api/test', (req, res) => res.json({ success: true }));

// Auth routes
app.use('/api', authRoutes);
app.use('/auth', oauthRoutes);

// API Routes
app.use('/api/songs', mainRoutes);

// 404 for unknown routes
app.use((req, res) => res.status(404).json({ 
    success: false, 
    status: 404, 
    error: 'Not Found' 
}));

// Error handler
app.use(errorhandler);

// Start server and graceful shutdown
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

function shutdown(signal) {
    console.log(`Received ${signal}; shutting down.`);
    server.close(async () => {
        try {
            // mongoose.close returns a promise now
            await mongoose.connection.close(false);
        } catch (e) {
            console.error('Error closing mongoose connection', e);
        }
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
