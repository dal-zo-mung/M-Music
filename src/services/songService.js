import songs from '../models/songform.js';

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseLimit(limitValue) {
  const parsedLimit = Number.parseInt(limitValue, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(MAX_SEARCH_LIMIT, parsedLimit);
}

export async function listSongs() {
  return songs.find().lean();
}

export async function searchSongs(query, limitValue) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  if (normalizedQuery.length > MAX_QUERY_LENGTH) {
    const error = new Error(`Search query must be ${MAX_QUERY_LENGTH} characters or fewer.`);
    error.statusCode = 400;
    throw error;
  }

  const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
  return songs.find({
    $or: [
      { 'Song Title': regex },
      { Artist: regex },
      { 'About Song': regex }
    ]
  })
    .limit(parseLimit(limitValue))
    .lean();
}

export async function getSongById(id) {
  return songs.findById(id).lean();
}
