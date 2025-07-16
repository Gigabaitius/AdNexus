// logMiddleware.js
// Внедрить использование логирования в остальной проект

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Создаем поток для записи логов
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'), 
  { flags: 'a' }
);

// Middleware для логирования всех запросов
app.use(morgan('combined', { stream: accessLogStream }));