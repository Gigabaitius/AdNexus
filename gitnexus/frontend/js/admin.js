// admin.js - Логика админ-панели для управления пользователями и кампаниями
// Полная реализация с фиксом URL, обработкой ошибок и модальными окнами.
// Автор: AI Assistant (на основе репозитория https://github.com/Gigabaitius/AdNexus и контекста)
// Дата: [текущая дата]

// Базовый URL API (измените на production URL или используйте .env)
const API_URL = 'http://localhost:3000'; // Порт бэкенда (Express сервер)

// Функция для получения JWT-токена из localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Универсальная функция для выполнения fetch-запросов с обработкой ошибок
/**
 * Выполняет fetch-запрос к API с авторизацией и обработкой ошибок.
 * @param {string} url - Относительный URL (например, '/api/campaigns')
 * @param {object} options - Опции fetch (method, headers, body)
 * @returns {Promise<object>} - JSON-ответ или throws error
 */
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    if (!response.ok) {
        const errorText = await response.text(); // Читаем текст для лога (если не JSON)
        console.error(`API Error: ${response.status} - ${errorText}`);
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json(); // Теперь парсим только если ok
}

// Загрузка списка пользователей
/**
 * Загружает и отображает список пользователей в таблице.
 */
async function loadUsers() {
    try {
        const users = await apiFetch('/api/users');
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <button onclick="editUser(${user.id})">Edit</button>
                    <button onclick="deleteUser(${user.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users. Check console for details.');
    }
}

// Загрузка списка кампаний с пагинацией, фильтрами и сортировкой
/**
 * Загружает и отображает список кампаний с поддержкой query params.
 * @param {number} page - Номер страницы
 * @param {number} limit - Лимит на страницу
 * @param {object} filter - Объект фильтров (например, {status: 'active'})
 * @param {object} sort - Объект сортировки (например, {budget: 'desc'})
 */
async function loadCampaigns(page = 1, limit = 10, filter = {}, sort = {}) {
    try {
        const query = new URLSearchParams({
            page,
            limit,
            filter: JSON.stringify(filter),
            sort: JSON.stringify(sort)
        }).toString();
        const campaigns = await apiFetch(`/api/campaigns?${query}`);
        const tableBody = document.getElementById('campaignsTableBody');
        tableBody.innerHTML = '';
        campaigns.forEach(campaign => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campaign.id}</td>
                <td>${campaign.title}</td>
                <td>${campaign.description}</td>
                <td>${campaign.budget}</td>
                <td>${campaign.status}</td>
                <td>
                    <button onclick="editCampaign(${campaign.id})">Edit</button>
                    <button onclick="deleteCampaign(${campaign.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading campaigns:', error);
        alert('Failed to load campaigns. Check console for details.');
    }
}

// Добавление новой кампании
/**
 * Обработчик формы для добавления новой кампании.
 * @param {Event} event - Событие submit формы
 */
async function addCampaign(event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const budget = document.getElementById('budget').value;
    const status = document.getElementById('status').value;

    try {
        await apiFetch('/api/campaigns', {
            method: 'POST',
            body: JSON.stringify({ title, description, budget, status })
        });
        alert('Campaign added successfully');
        loadCampaigns(); // Перезагрузка списка
        // Очистка формы (опционально)
        event.target.reset();
    } catch (error) {
        console.error('Error adding campaign:', error);
        alert('Failed to add campaign. Check console for details.');
    }
}

// Редактирование пользователя
/**
 * Открывает модальное окно для редактирования пользователя и загружает данные.
 * @param {number} id - ID пользователя
 */
async function editUser(id) {
    try {
        const user = await apiFetch(`/api/users/${id}`);
        // Заполняем модальную форму (предполагается наличие модалки в HTML)
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editRole').value = user.role;
        
        // Показываем модалку (используйте CSS или JS для видимости)
        document.getElementById('editUserModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading user for edit:', error);
        alert('Failed to load user data.');
    }
}

// Обработчик сохранения редактирования пользователя
/**
 * Обработчик формы для сохранения изменений пользователя.
 * @param {Event} event - Событие submit формы
 */
async function saveEditUser(event) {
    event.preventDefault();
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const email = document.getElementById('editEmail').value;
    const role = document.getElementById('editRole').value;

    try {
        await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ username, email, role })
        });
        alert('User updated successfully');
        document.getElementById('editUserModal').style.display = 'none';
        loadUsers(); // Перезагрузка списка
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user.');
    }
}

// Удаление пользователя
/**
 * Удаляет пользователя после подтверждения.
 * @param {number} id - ID пользователя
 */
async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
            alert('User deleted successfully');
            loadUsers(); // Перезагрузка списка
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user.');
        }
    }
}

// Редактирование кампании
/**
 * Открывает модальное окно для редактирования кампании и загружает данные.
 * @param {number} id - ID кампании
 */
async function editCampaign(id) {
    try {
        const campaign = await apiFetch(`/api/campaigns/${id}`);
        // Заполняем модальную форму
        document.getElementById('editCampaignId').value = campaign.id;
        document.getElementById('editTitle').value = campaign.title;
        document.getElementById('editDescription').value = campaign.description;
        document.getElementById('editBudget').value = campaign.budget;
        document.getElementById('editStatus').value = campaign.status;
        
        // Показываем модалку
        document.getElementById('editCampaignModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading campaign for edit:', error);
        alert('Failed to load campaign data.');
    }
}

// Обработчик сохранения редактирования кампании
/**
 * Обработчик формы для сохранения изменений кампании.
 * @param {Event} event - Событие submit формы
 */
async function saveEditCampaign(event) {
    event.preventDefault();
    const id = document.getElementById('editCampaignId').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const budget = document.getElementById('editBudget').value;
    const status = document.getElementById('editStatus').value;

    try {
        await apiFetch(`/api/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, description, budget, status })
        });
        alert('Campaign updated successfully');
        document.getElementById('editCampaignModal').style.display = 'none';
        loadCampaigns(); // Перезагрузка списка
    } catch (error) {
        console.error('Error updating campaign:', error);
        alert('Failed to update campaign.');
    }
}

// Удаление кампании
/**
 * Удаляет кампанию после подтверждения.
 * @param {number} id - ID кампании
 */
async function deleteCampaign(id) {
    if (confirm('Are you sure you want to delete this campaign?')) {
        try {
            await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
            alert('Campaign deleted successfully');
            loadCampaigns(); // Перезагрузка списка
        } catch (error) {
            console.error('Error deleting campaign:', error);
            alert('Failed to delete campaign.');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        window.location.href = 'login.html'; // Redirect если не авторизован
    }
    
    // Загрузка данных
    loadUsers();
    loadCampaigns();
    
    // Привязка событий форм
    document.getElementById('addCampaignForm').addEventListener('submit', addCampaign);
    document.getElementById('editUserForm').addEventListener('submit', saveEditUser); // Предполагается ID формы в модалке
    document.getElementById('editCampaignForm').addEventListener('submit', saveEditCampaign); // Предполагается ID формы в модалке
    
    // Закрытие модалок (опционально, добавьте кнопки close в HTML)
    // Пример: document.querySelector('.close').addEventListener('click', () => { modal.style.display = 'none'; });
});
