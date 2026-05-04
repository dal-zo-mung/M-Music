import * as songService from '../services/songService.js';

export async function listSongs(req, res, next) {
  try {
    const list = await songService.listSongs();
    return res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function searchSongs(req, res, next) {
  try {
    const results = await songService.searchSongs(req.params.query, req.query.limit);
    return res.json(results);
  } catch (error) {
    next(error);
  }
}

export async function getSongById(req, res, next) {
  try {
    const song = await songService.getSongById(req.params.id);

    if (!song) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    return res.status(200).json(song);
  } catch (error) {
    next(error);
  }
}
