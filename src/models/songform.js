// models/Song.js - Match your existing database
import mongoose from 'mongoose';

// Schema that matches your existing MongoDB collection
const songSchema = new mongoose.Schema({
    "Song Title": { type: String, required: true },
    "Artist": { type: String, required: true },
    "Released Date": String,
    "About Song": String,
    "Direct to YT": String,            // <-- note this exact key
    "Lyric": [String],                 // Array of strings
    albumCover: { type: String, default: "images/default.jpg" },
    audioFile: { type: String, default: "Mp3/default.mp3" }
}, {
    collection: 'Songs',
});

export default mongoose.model('songform', songSchema, 'Songs');