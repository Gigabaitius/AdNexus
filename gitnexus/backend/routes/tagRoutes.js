// *project*/backend/routes/tagRoutes.js

const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware'); //authenticate добавить к Auth
const validate = require('../middleware/validate.js');
const tagValidation = require('../validators/tagValidation');

// Публичные маршруты (доступны всем авторизованным пользователям)
router.get('/', authMiddleware, tagController.getAllTags);
router.get('/popular', authMiddleware, tagController.getPopularTags);
router.get('/search', authMiddleware, tagController.searchTags);
router.get('/categories', authMiddleware, tagController.getCategories);
router.get('/:id', authMiddleware, tagController.getTagById);

// Административные маршруты (только для модераторов и админов)
router.post('/', 
  authMiddleware, 
  requireRole(['admin', 'moderator']), 
  validate(tagValidation.createTag),
  tagController.createTag
);

router.put('/:id', 
  authMiddleware, 
  requireRole(['admin', 'moderator']), 
  validate(tagValidation.updateTag),
  tagController.updateTag
);

router.delete('/:id', 
  authMiddleware, 
  requireRole(['admin']), 
  tagController.deleteTag
);

module.exports = router;