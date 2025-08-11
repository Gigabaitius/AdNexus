// *project*/backend/controllers/tagController.js

const Tag = require('../models/tagModel');
const logger = require('../utils/logger');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseFormatter');

const tagController = {
  // Создание нового тега
  async createTag(req, res) {
    try {
      const { name, category, description } = req.body;

      // Проверяем, существует ли уже такой тег
      const existingTag = await Tag.findByName(name);
      if (existingTag) {
        return res.status(409).json({
          success: false,
          message: 'Tag with this name already exists'
        });
      }

      const tag = await Tag.create({ name, category, description });
      
      logger.info(`Tag created: ${tag.name} by user ${req.user.id}`);
      
      res.status(201).json({
        success: true,
        message: 'Tag created successfully',
        data: tag
      });
    } catch (error) {
      logger.error('Error creating tag:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating tag'
      });
    }
  },

  // Получение всех тегов с фильтрацией
  async getAllTags(req, res) {
    try {
      const filters = {
        category: req.query.category,
        search: req.query.search,
        sort: req.query.sort,
        page: req.query.page,
        limit: req.query.limit
      };

      const tags = await Tag.findAll(filters);
      
      res.json({
        success: true,
        data: tags,
        pagination: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          count: tags.length
        }
      });
    } catch (error) {
      logger.error('Error fetching tags:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tags'
      });
    }
  },

  // Получение тега по ID
  async getTagById(req, res) {
    try {
      const tag = await Tag.findById(req.params.id);
      
      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      logger.error('Error fetching tag:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tag'
      });
    }
  },

  // Обновление тега
  async updateTag(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingTag = await Tag.findById(id);
      if (!existingTag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      // Если меняется имя, проверяем уникальность
      if (updateData.name && updateData.name !== existingTag.name) {
        const duplicateTag = await Tag.findByName(updateData.name);
        if (duplicateTag) {
          return res.status(409).json({
            success: false,
            message: 'Tag with this name already exists'
          });
        }
      }

      const updatedTag = await Tag.update(id, updateData);
      
      logger.info(`Tag updated: ${id} by user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Tag updated successfully',
        data: updatedTag
      });
    } catch (error) {
      logger.error('Error updating tag:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating tag'
      });
    }
  },

  // Удаление тега
  async deleteTag(req, res) {
    try {
      const { id } = req.params;

      const tag = await Tag.findById(id);
      if (!tag) {
        return res.status(404).json({
          success: false,
          message: 'Tag not found'
        });
      }

      const deleted = await Tag.delete(id);
      
      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Could not delete tag'
        });
      }

      logger.info(`Tag deleted: ${id} by user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting tag:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting tag'
      });
    }
  },

  // Получение категорий тегов
  async getCategories(req, res) {
    try {
      const categories = await Tag.getCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching tag categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories'
      });
    }
  },

  // Получение популярных тегов
  async getPopularTags(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const tags = await Tag.getPopularTags(limit);
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      logger.error('Error fetching popular tags:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching popular tags'
      });
    }
  },

  // Поиск тегов с автодополнением
  async searchTags(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const tags = await Tag.searchTags(q, limit);
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      logger.error('Error searching tags:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching tags'
      });
    }
  }
};

module.exports = tagController;