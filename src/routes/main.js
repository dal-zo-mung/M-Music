import express from 'express';
import { getSongById, listSongs, searchSongs } from '../services/song.service.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const list = await listSongs({
      page: req.query.page,
      limit: req.query.limit
    });

    return res.json(list);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const results = await searchSongs(req.query.q, {
      limit: req.query.limit
    });
    return res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/search/:query', async (req, res, next) => {
  try {
    const results = await searchSongs(req.params.query, {
      limit: req.query.limit
    });
    return res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const song = await getSongById(req.params.id);

    if (!song) {
      return res.status(404).json({ success: false, error: 'Song not found' });
    }

    return res.status(200).json(song);
  } catch (error) {
    next(error);
  }
});

export default router;
