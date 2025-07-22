// admin.js - Логика админ-панели для управления пользователями и кампаниями
// Полная реализация с фиксом URL, обработкой ошибок, модальными окнами и проверками на наличие DOM-элементов.
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
        if (tableBody) {
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
        } else {
            console.warn('Element not found: usersTableBody. Users loaded but not displayed.');
        }
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
        if (tableBody) {
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
        } else {
            console.warn('Element not found: campaignsTableBody. Campaigns loaded but not displayed.');
        }
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
        const modal = document.getElementById('editUserModal');
        if (modal) {
            // Заполняем модальную форму (предполагается наличие модалки в HTML)
            const editUserId = document.getElementById('editUserId');
            const editUsername = document.getElementById('editUsername');
            const editEmail = document.getElementById('editEmail');
            const editRole = document.getElementById('editRole');
            
            if (editUserId && editUsername && editEmail && editRole) {
                editUserId.value = user.id;
                editUsername.value = user.username;
                editEmail.value = user.email;
                editRole.value = user.role;
                
                // Показываем модалку
                modal.style.display = 'block';
            } else {
                console.warn('Form fields not found in editUserModal.');
            }
        } else {
            console.warn('Element not found: editUserModal.');
        }
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
    const editUserId = document.getElementById('editUserId');
    const editUsername = document.getElementById('editUsername');
    const editEmail = document.getElementById('editEmail');
    const editRole = document.getElementById('editRole');
    
    if (!editUserId || !editUsername || !editEmail || !editRole) {
        console.warn('Edit user form fields not found.');
        return;
    }
    
    const id = editUserId.value;
    const username = editUsername.value;
    const email = editEmail.value;
    const role = editRole.value;

    try {
        await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ username, email, role })
        });
        alert('User updated successfully');
        const modal = document.getElementById('editUserModal');
        if (modal) modal.style.display = 'none';
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
        const modal = document.getElementById('editCampaignModal');
        if (modal) {
            // Заполняем модальную форму
            const editCampaignId = document.getElementById('editCampaignId');
            const editTitle = document.getElementById('editTitle');
            const editDescription = document.getElementById('editDescription');
            const editBudget = document.getElementById('editBudget');
            const editStatus = document.getElementById('editStatus');
            
            if (editCampaignId && editTitle && editDescription && editBudget && editStatus) {
                editCampaignId.value = campaign.id;
                editTitle.value = campaign.title;
                editDescription.value = campaign.description;
                editBudget.value = campaign.budget;
                editStatus.value = campaign.status;
                
                // Показываем модалку
                modal.style.display = 'block';
            } else {
                console.warn('Form fields not found in editCampaignModal.');
            }
        } else {
            console.warn('Element not found: editCampaignModal.');
        }
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
    const editCampaignId = document.getElementById('editCampaignId');
    const editTitle = document.getElementById('editTitle');
    const editDescription = document.getElementById('editDescription');
    const editBudget = document.getElementById('editBudget');
    const editStatus = document.getElementById('editStatus');
    
    if (!editCampaignId || !editTitle || !editDescription || !editBudget || !editStatus) {
        console.warn('Edit campaign form fields not found.');
        return;
    }
    
    const id = editCampaignId.value;
    const title = editTitle.value;
    const description = editDescription.value;
    const budget = editBudget.value;
    const status = editStatus.value;

    try {
        await apiFetch(`/api/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, description, budget, status })
        });
        alert('Campaign updated successfully');
        const modal = document.getElementById('editCampaignModal');
        if (modal) modal.style.display = 'none';
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
    
    // Привязка событий форм с проверками на наличие
    const addCampaignForm = document.getElementById('addCampaignForm');
    if (addCampaignForm) {
        addCampaignForm.addEventListener('submit', addCampaign);
    } else {
        console.warn('Element not found: addCampaignForm. Add campaign functionality disabled.');
    }
    
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', saveEditUser);
    } else {
        console.warn('Element not found: editUserForm. Edit user functionality disabled.');
    }
    
    const editCampaignForm = document.getElementById('editCampaignForm');
    if (editCampaignForm) {
        editCampaignForm.addEventListener('submit', saveEditCampaign);
    } else {
        console.warn('Element not found: editCampaignForm. Edit campaign functionality disabled.');
    }
    
    // Закрытие модалок (опционально, добавьте кнопки close в HTML и обработчики здесь)
    // Пример: const closeButtons = document.querySelectorAll('.close'); closeButtons.forEach(btn => btn.addEventListener('click', () => { btn.parentElement.style.display = 'none'; }));
});
