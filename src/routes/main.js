import express from 'express';
import * as songController from '../controllers/songController.js';
import { validateObjectIdParam } from '../middleware/validation.js';

const router = express.Router();

router.get('/', songController.listSongs);
router.get('/search/:query', songController.searchSongs);
router.get('/:id', validateObjectIdParam('id'), songController.getSongById);

export default router;
