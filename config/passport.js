import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../src/models/user.js';

export default function initializePassport() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        const profileImage = profile.photos?.[0]?.value || '';

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            emails: profile.emails || [],
            name: profile.name || {},
            profileImage
          });
        } else {
          user.displayName = profile.displayName;
          user.emails = profile.emails || [];
          user.name = profile.name || {};
          user.profileImage = profileImage;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });

    console.log('Passport Google OAuth configured');
  } else {
    console.warn('Google OAuth credentials not found. Skipping passport Google strategy.\nSet GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.');
  }
}
