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

app.use(morgan('combined', { stream: accessLogStream }));  // Подключаем morgan как middleware
// - 'combined' - формат лога (включает IP, дату, метод, URL, статус, время ответа, user-agent)
// - { stream: accessLogStream } - указываем, куда писать логи (в файл вместо консоли)