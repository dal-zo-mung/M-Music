import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Fields for Google OAuth
  googleId: {
    type: String,
    index: true,
    unique: true,
    sparse: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 120
  },
  profileImage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  emails: { type: Array, default: [] },
  name: { type: Object },

  // Local authentication fields
  username: {
    type: String,
    index: true,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9._-]+$/
  },
  password: {
    type: String,
    minlength: 8
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 60
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 60
  },
  role: {
    type: String,
    enum: ['user', 'uploader', 'admin'],
    default: 'user'
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
