// controllers/campaignController.js
// Controller (Контроллер) - связывает Model и View, обрабатывает HTTP запросы

const campaignModel = require('../models/campaignModel');

// Получение всех кампаний с пагинацией и фильтрами
async function getAllCampaigns(req, res) {
  try {
    // Извлекаем параметры из req.query
    const { page, limit, status } = req.query;

    // Опции для модели (с преобразованием в числа, где нужно)
    const options = {
      page: parseInt(page) || 1,    // Если не указано, page=1
      limit: parseInt(limit) || 10, // Если не указано, limit=10
      status                        // Фильтр по статусу (опционально)
    };

    // Получаем данные из модели
    const campaigns = await campaignModel.getAllCampaignsPaginated(options);

    // Отправляем ответ (можно добавить общее количество для фронтенда, но для простоты опустим)
    res.status(200).json(campaigns);
  } catch (err) {
    console.error('Ошибка при получении кампаний:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Поиск кампаний с фильтрами, сортировкой и пагинацией
async function searchCampaigns(req, res) {
  try {
    // Парсим параметры из req.query
    const { page, limit, filter, sort } = req.query;

    // Преобразуем filter в объект (ожидаем JSON-строку, например "?filter={\"status\":{\"=\":\"active\"},\"budget\":{\" > \":1000}}")
    const filters = filter ? JSON.parse(filter) : {};

    // Преобразуем sort в объект (например "?sort={\"budget\":\"desc\"}")
    const sortObj = sort ? JSON.parse(sort) : {};

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    // Вызываем модель
    const campaigns = await campaignModel.searchCampaigns(filters, sortObj, options.page, options.limit);

    res.status(200).json(campaigns);
  } catch (err) {
    console.error('Ошибка при поиске кампаний:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Получение кампаний пользователя
async function getUserCampaigns(req, res) {
  try {
    const userId = req.user.user_id; // Из JWT-токена
    const campaigns = await campaignModel.getCampaignsByUserId(userId);
    res.status(200).json(campaigns);
  } catch (err) {
    console.error('Ошибка при получении кампаний пользователя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Получение кампании по ID
async function getCampaign(req, res) {
  try {
    const campaignId = req.params.id;
    const campaign = await campaignModel.getCampaignById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Кампания не найдена' });
    }
    
    res.status(200).json(campaign);
  } catch (err) {
    console.error('Ошибка при получении кампании:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Создание кампании
async function createCampaign(req, res) {
  try {
    const { title, description, budget, start_date, end_date, status } = req.body;
    const user_id = req.user.user_id; // Из JWT-токена
    
    if (!title || !budget || !start_date) {
      return res.status(400).json({ message: 'Необходимо указать название, бюджет и дату начала' });
    }
    
    const campaignData = {
      title,
      description,
      budget,
      start_date,
      end_date,
      user_id,
      status
    };
    
    const campaignId = await campaignModel.createCampaign(campaignData);
    res.status(201).json({ 
      message: 'Кампания создана',
      id: campaignId
    });
  } catch (err) {
    console.error('Ошибка при создании кампании:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Обновление кампании
async function updateCampaign(req, res) {
  try {
    const campaignId = req.params.id;
    const { title, description, budget, start_date, end_date, status } = req.body;
    
    if (!title || !budget || !start_date) {
      return res.status(400).json({ message: 'Необходимо указать название, бюджет и дату начала' });
    }
    
    // Проверка, существует ли кампания
    const campaign = await campaignModel.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Кампания не найдена' });
    }
    
    // Проверка прав (только владелец или админ может редактировать)
    if (campaign.user_id !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Нет прав на редактирование этой кампании' });
    }
    
    const campaignData = {
      title,
      description,
      budget,
      start_date,
      end_date,
      status
    };
    
    const updated = await campaignModel.updateCampaign(campaignId, campaignData);
    
    if (updated) {
      res.status(200).json({ message: 'Кампания обновлена' });
    } else {
      res.status(404).json({ message: 'Кампания не найдена' });
    }
  } catch (err) {
    console.error('Ошибка при обновлении кампании:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// Удаление кампании
async function deleteCampaign(req, res) {
  try {
    const campaignId = req.params.id;
    
    // Проверка, существует ли кампания
    const campaign = await campaignModel.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Кампания не найдена' });
    }
    
    // Проверка прав (только владелец или админ может удалять)
    if (campaign.user_id !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Нет прав на удаление этой кампании' });
    }
    
    const deleted = await campaignModel.deleteCampaign(campaignId);
    
    if (deleted) {
      res.status(200).json({ message: 'Кампания удалена' });
    } else {
      res.status(404).json({ message: 'Кампания не найдена' });
    }
  } catch (err) {
    console.error('Ошибка при удалении кампании:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

module.exports = {
  getAllCampaigns,
  getUserCampaigns,
  getCampaign,
  searchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
};