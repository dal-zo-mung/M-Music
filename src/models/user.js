import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Fields for Google OAuth
  googleId: { 
    type: String, index: true, unique: true, sparse: true },
  displayName: String,
  profileImage: String,
  emails: { type: Array, default: [] },
  name: { type: Object },

  // Local authentication fields
  username: { type: String, index: true, unique: true, sparse: true },
  password: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

export default mongoose.model('User', userSchema);
