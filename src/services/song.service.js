import mongoose from 'mongoose';
import Song from '../models/songform.js';

const SONG_LIST_PROJECTION = {
  'Song Title': 1,
  Artist: 1,
  'Released Date': 1,
  'About Song': 1,
  albumCover: 1
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listSongs({ page = 1, limit = 50 } = {}) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  return Song.find({}, SONG_LIST_PROJECTION)
    .sort({ 'Song Title': 1, Artist: 1 })
    .skip((normalizedPage - 1) * normalizedLimit)
    .limit(normalizedLimit)
    .lean();
}

export async function searchSongs(query, { limit = 30 } = {}) {
  const trimmedQuery = String(query || '').trim();
  if (!trimmedQuery) return [];

  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const regex = new RegExp(escapeRegex(trimmedQuery), 'i');

  return Song.find({
    $or: [
      { 'Song Title': regex },
      { Artist: regex },
      { 'About Song': regex },
      { Lyric: regex }
    ]
  }, SONG_LIST_PROJECTION)
    .sort({ 'Song Title': 1, Artist: 1 })
    .limit(normalizedLimit)
    .lean();
}

export async function getSongById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return Song.findById(id).lean();
}
