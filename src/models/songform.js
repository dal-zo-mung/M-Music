// models/Song.js - Match your existing database
import mongoose from 'mongoose';

// Schema that matches your existing MongoDB collection
const songSchema = new mongoose.Schema({
    "Song Title": { type: String, required: true, trim: true },
    "Artist": { type: String, required: true, trim: true },
    "Released Date": { type: String, trim: true },
    "About Song": { type: String, trim: true },
    "Direct to YT": { type: String, trim: true },
    "Lyric": {
        type: [String],
        default: []
    },
    albumCover: { type: String, default: "images/default.jpg", trim: true },
    audioFile: { type: String, default: "Mp3/default.mp3", trim: true }
}, {
    collection: 'Songs',
});

songSchema.index({ "Song Title": 1, "Artist": 1 });
songSchema.index({
    "Song Title": 'text',
    "Artist": 'text',
    "About Song": 'text',
    "Lyric": 'text'
});

export default mongoose.model('songform', songSchema, 'Songs');
