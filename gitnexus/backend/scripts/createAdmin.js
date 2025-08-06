/**
 * Скрипт для создания первого администратора
 * Запуск: node backend/scripts/createAdmin.js
 */
require('dotenv').config({ path: './backend/.env' });
const bcrypt = require('bcrypt');
const { databases } = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  const db = databases.main;
  
  console.log('=== Создание администратора ===');
  
  // Проверяем, есть ли уже администраторы
  const existingAdmin = await db.get(
    `SELECT * FROM users WHERE is_admin = 1 LIMIT 1`
  );
  
  if (existingAdmin) {
    console.log('⚠️  Администратор уже существует!');
    const answer = await new Promise(resolve => {
      rl.question('Создать еще одного? (y/n): ', resolve);
    });
    if (answer.toLowerCase() !== 'y') {
      rl.close();
      process.exit(0);
    }
  }
  
  // Запрашиваем данные
  const username = await new Promise(resolve => {
    rl.question('Username: ', resolve);
  });
  
  const email = await new Promise(resolve => {
    rl.question('Email: ', resolve);
  });
  
  const password = await new Promise(resolve => {
    rl.question('Password: ', resolve);
  });
  
  try {
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем админа
    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, is_admin, is_moderator) 
       VALUES (?, ?, ?, 1, 1)`,
      [username, email, hashedPassword]
    );
    
    console.log('✅ Администратор создан успешно!');
    console.log(`ID: ${result.lastID}`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
  
  rl.close();
  process.exit(0);
}

createAdmin();