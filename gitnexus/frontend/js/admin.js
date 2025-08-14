// *project*\frontend\js\admin.js - Логика админ-панели для управления пользователями и кампаниями

// Базовый URL API (измените на production URL или используйте .env)
const API_URL = "http://localhost:3000"; // Порт бэкенда (Express сервер)

// Функция для получения JWT-токена из localStorage
function getToken() {
  return localStorage.getItem("token");
}


const userData = (() => {
  const token = getToken();
  if (!token) {
    console.warn('No token found');
    return null;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.user_id,
      username: payload.username,
      is_admin: payload.is_admin === 1,
      is_moderator: payload.is_moderator === 1
    };
  } catch (e) {
    console.error('Error parsing token:', e);
    return null;
  }
})();
// Добавим отладочный вывод после создания userData
console.log('Current user data:', userData);

// Добавляем функцию проверки авторизации
function checkAuth() {
  if (!userData || !userData.id) {
    showNotification('Session expired. Please login again.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
    return false;
  }
  return true;
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
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: { ...headers, ...options.headers },
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
    const users = await apiFetch("/api/users");
    const tableBody = document.getElementById("usersTableBody");
    if (tableBody) {
      tableBody.innerHTML = "";
      users.forEach((user) => {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                      <div>
            <input type="checkbox" id="isAdmin_${user.id}" name="Admin" 
                   ${user.is_admin ? "checked" : ""} 
                   disabled />
            <label for="isAdmin_${user.id}">Is Admin?</label>
          </div>
          <div>
            <input type="checkbox" id="isModerator_${user.id}" name="Moderator" 
                   ${user.is_moderator ? "checked" : ""} 
                   disabled />
            <label for="isModerator_${user.id}">Is Moderator?</label>
          </div>
                    </td>
                    <td>
                        <button onclick="editUser(${user.id})">Edit</button>
                        <button onclick="deleteUser(${user.id})">Delete</button>
                    </td>
                `;
        tableBody.appendChild(row);
      });
    } else {
      console.warn(
        "Element not found: usersTableBody. Users loaded but not displayed."
      );
    }
  } catch (error) {
    console.error("Error loading users:", error);
    alert("Failed to load users. Check console for details.");
  }
}

window.editUser = editUser;
window.deleteUser = deleteUser;
// Редактирование пользователя
/**
 * Открывает модальное окно для редактирования пользователя и загружает данные.
 * @param {number} id - ID пользователя
 */
async function editUser(id) {
  try {
    const response = await apiFetch(`/api/users/${id}`);
    const user = response.data || response;

    console.log('Loaded user data:', user); // Для отладки

    const modal = document.getElementById("editUserModal");
    if (modal) {
      // Заполняем модальную форму (предполагается наличие модалки в HTML)
      const editUserId = document.getElementById("editUserId");
      const editUsername = document.getElementById("editUsername");
      const editEmail = document.getElementById("editEmail");
      const editIsAdmin = document.getElementById("editRoleIsAdmin");
      const editIsModerator = document.getElementById("editRoleIsModerator");

      if (editUserId && editUsername && editEmail && editIsAdmin && editIsModerator) {
        editUserId.value = user.id;
        editUsername.value = user.username;
        editEmail.value = user.email;
        editIsAdmin.checked = user.is_admin === 1;
        editIsModerator.checked = user.is_moderator === 1;

        // Показываем модалку
        modal.style.display = "block";
      } else {
        console.warn("Form fields not found in editUserModal.");
      }
    } else {
      console.warn("Element not found: editUserModal.");
    }
  } catch (error) {
    console.error("Error loading user for edit:", error);
    alert("Failed to load user data.");
  }
}

// Обработчик сохранения редактирования пользователя
/**
 * Обработчик формы для сохранения изменений пользователя.
 * @param {Event} event - Событие submit формы
 */
async function saveEditUser(event) {
  event.preventDefault();
  const editUserId = document.getElementById("editUserId");
  const editUsername = document.getElementById("editUsername");
  const editEmail = document.getElementById("editEmail");
  const editIsAdmin = document.getElementById("editRoleIsAdmin").checked;
  const editIsModerator = document.getElementById("editRoleIsModerator").checked;

  if (!editUserId || !editUsername || !editEmail) {
    console.warn("Edit user form fields not found.");
    return;
  }

  const id = editUserId.value;
  const username = editUsername.value;
  const email = editEmail.value;
  const is_admin = editIsAdmin;
  const is_moderator = editIsModerator;

  try {
    await apiFetch(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ username, email, is_admin, is_moderator }),
    });
    alert("User updated successfully");
    const modal = document.getElementById("editUserModal");
    if (modal) modal.style.display = "none";
    loadUsers(); // Перезагрузка списка
  } catch (error) {
    console.error("Error updating user:", error);
    alert("Failed to update user.");
  }
}

// Удаление пользователя
/**
 * Удаляет пользователя после подтверждения.
 * @param {number} id - ID пользователя
 */
async function deleteUser(id) {
  if (confirm("Are you sure you want to delete this user?")) {
    try {
      await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      alert("User deleted successfully");
      loadUsers(); // Перезагрузка списка
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  }
}






// Секция кампаний

window.showSection = showSection;
/**
 * Менеджер для управления кампаниями
 * @namespace campaignManager
 */
const campaignManager = {
  currentPage: 1,
  itemsPerPage: 20,
  currentCampaignId: null,
  isEditMode: false,

  /**
   * Инициализация менеджера кампаний
   */
  init() {
    // Загружаем кампании при переключении на вкладку

    const campaignTab = document.querySelector('[onclick*="showSection(\'campaign-management\')"]');
    if (campaignTab) {
      campaignTab.addEventListener('click', () => {
        this.loadCampaigns();
        this.loadStats();
      });
    }

    // Настройка обработчиков событий
    this.setupEventListeners();

    // Устанавливаем минимальную дату для начала кампании
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('campaignStartDate').min = today;
  },

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Форма создания/редактирования
    document.getElementById('campaignForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCampaign();
    });

    // Форма модерации
    document.getElementById('moderationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.moderateCampaign();
    });

    // Изменение даты начала обновляет минимальную дату окончания
    document.getElementById('campaignStartDate').addEventListener('change', (e) => {
      const startDate = e.target.value;
      document.getElementById('campaignEndDate').min = startDate;
    });

    // Фильтры по Enter
    ['campaignSearch', 'budgetMin', 'budgetMax'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.loadCampaigns();
        }
      });
    });
  },

  /**
   * Загружает список кампаний
   * @param {number} [page=1] - Номер страницы
   */
  async loadCampaigns(page = 1) {
    try {
      this.currentPage = page;

      // Собираем параметры фильтрации
      const params = new URLSearchParams({
        page: page,
        limit: this.itemsPerPage,
        search: document.getElementById('campaignSearch').value,
        status: document.getElementById('campaignStatusFilter').value,
        objective: document.getElementById('campaignObjectiveFilter').value,
        budget_min: document.getElementById('budgetMin').value,
        budget_max: document.getElementById('budgetMax').value,
        date_from: document.getElementById('dateFrom').value,
        date_to: document.getElementById('dateTo').value,
        include_deleted: document.getElementById('includeDeleted').checked
      });

      // Удаляем пустые параметры
      [...params.entries()].forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await apiFetch(`/api/campaigns?${params}`, {
        method: 'GET'
      });

      if (response.success) {
        this.displayCampaigns(response.data);
        this.displayPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      showNotification('Error loading campaigns', 'error');
    }
  },

  /**
   * Отображает кампании в таблице
   * @param {Array} campaigns - Массив кампаний
   */
  displayCampaigns(campaigns) {
    const tbody = document.getElementById('campaignsTableBody');

    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty">No campaigns found</td></tr>';
      return;
    }

    tbody.innerHTML = campaigns.map(campaign => {
      const statusClass = this.getStatusClass(campaign.status);
      const completionRate = campaign.completion_rate || 0;

      return `
                <tr>
                    <td>${campaign.id}</td>
                    <td>${this.escapeHtml(campaign.title)}</td>
                    <td>${campaign.owner_name || 'Unknown'}</td>
                    <td><span class="status ${statusClass}">${campaign.status}</span></td>
                    <td>${campaign.objective || '-'}</td>
                    <td>$${parseFloat(campaign.budget_total).toFixed(2)}</td>
                    <td>$${parseFloat(campaign.budget_spent).toFixed(2)}</td>
                    <td>${this.formatDateRange(campaign.start_date, campaign.end_date)}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${completionRate}%"></div>
                            <span class="progress-text">${completionRate}%</span>
                        </div>
                    </td>
                    <td>
                        ${this.generateActionButtons(campaign)}
                    </td>
                </tr>
            `;
    }).join('');
  },

  /**
   * Генерирует кнопки действий для кампании
   * @param {Object} campaign - Объект кампании
   * @returns {string} HTML кнопок
   */
  generateActionButtons(campaign) {
    const buttons = [];

    // Просмотр
    buttons.push(`<button onclick="campaignManager.viewCampaign(${campaign.id})" class="btn btn-sm btn-info" title="View">
            <i class="fas fa-eye"></i>
        </button>`);

    // Редактирование (только для черновиков и отклоненных)
    if (['draft', 'rejected'].includes(campaign.status)) {
      buttons.push(`<button onclick="campaignManager.editCampaign(${campaign.id})" class="btn btn-sm btn-primary" title="Edit">
                <i class="fas fa-edit"></i>
            </button>`);
    }

    // Управление статусом
    if (campaign.status === 'draft') {
      buttons.push(`<button onclick="campaignManager.submitForApproval(${campaign.id})" class="btn btn-sm btn-success" title="Submit for Approval">
                <i class="fas fa-paper-plane"></i>
            </button>`);
    } else if (campaign.status === 'active') {
      buttons.push(`<button onclick="campaignManager.pauseCampaign(${campaign.id})" class="btn btn-sm btn-warning" title="Pause">
                <i class="fas fa-pause"></i>
            </button>`);
    } else if (campaign.status === 'paused') {
      buttons.push(`<button onclick="campaignManager.resumeCampaign(${campaign.id})" class="btn btn-sm btn-success" title="Resume">
                <i class="fas fa-play"></i>
            </button>`);
    }

    // Модерация (для модераторов/админов)
    if (campaign.status === 'pending_approval' && (userData.is_admin || userData.is_moderator)) {
      buttons.push(`<button onclick="campaignManager.showModerationModal(${campaign.id})" class="btn btn-sm btn-purple" title="Moderate">
                <i class="fas fa-gavel"></i>
            </button>`);
    }

    // Удаление
    if (!campaign.deleted_at) {
      buttons.push(`<button onclick="campaignManager.deleteCampaign(${campaign.id})" class="btn btn-sm btn-danger" title="Delete">
                <i class="fas fa-trash"></i>
            </button>`);
    }

    return buttons.join(' ');
  },

  /**
   * Загружает статистику кампаний
   */
  async loadStats() {
    try {
      const response = await apiFetch('/api/campaigns/stats', {
        method: 'GET'
      });

      if (response.success) {
        const stats = response.data;
        document.getElementById('campaignStats').style.display = 'flex';
        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statActive').textContent = stats.active_campaigns;
        document.getElementById('statBudget').textContent = `$${stats.total_budget.toFixed(2)}`;
        document.getElementById('statSpent').textContent = `$${stats.total_spent.toFixed(2)}`;
        document.getElementById('statCompletion').textContent = `${stats.completion_rate_avg}%`;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  },

  /**
   * Показывает форму создания кампании
   */
  showCreateForm() {
    this.isEditMode = false;
    this.currentCampaignId = null;
    document.getElementById('campaignModalTitle').textContent = 'Create Campaign';
    document.getElementById('campaignForm').reset();

    // Устанавливаем значения по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('campaignStartDate').value = today;
    document.getElementById('campaignCurrency').value = 'USD';
    document.getElementById('campaignVisibility').value = 'public';

    document.getElementById('campaignModal').style.display = 'block';
  },

  /**
   * Редактирует кампанию
   * @param {number} id - ID кампании
   */
  async editCampaign(id) {
    try {
      const response = await apiFetch(`/api/campaigns/${id}`, {
        method: 'GET'
      });

      if (response.success) {
        const campaign = response.data;
        this.isEditMode = true;
        this.currentCampaignId = id;

        document.getElementById('campaignModalTitle').textContent = 'Edit Campaign';

        // Заполняем форму данными
        document.getElementById('campaignTitle').value = campaign.title;
        document.getElementById('campaignDescription').value = campaign.description || '';
        document.getElementById('campaignObjective').value = campaign.objective || '';
        document.getElementById('campaignBudget').value = campaign.budget_total;
        document.getElementById('campaignDailyBudget').value = campaign.budget_daily || '';
        document.getElementById('campaignCurrency').value = campaign.currency || 'USD';
        document.getElementById('campaignStartDate').value = campaign.start_date;
        document.getElementById('campaignEndDate').value = campaign.end_date;
        document.getElementById('campaignVisibility').value = campaign.visibility || 'public';
        document.getElementById('campaignLandingUrl').value = campaign.landing_url || '';

        // Заполняем целевую аудиторию
        if (campaign.target_audience) {
          document.getElementById('targetAgeRange').value = campaign.target_audience.age_range || '';
          document.getElementById('targetGender').value = campaign.target_audience.gender || 'all';
          document.getElementById('targetInterests').value = (campaign.target_audience.interests || []).join(', ');
          document.getElementById('targetGeo').value = (campaign.target_audience.geo || []).join(', ');
        }

        document.getElementById('campaignModal').style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      showNotification('Error loading campaign', 'error');
    }
  },

  /**
   * Сохраняет кампанию
   */
  async saveCampaign() {
    try {
      // Проверяем авторизацию
      if (!checkAuth()) {
        return;
      }
      // Проверяем наличие user_id
      if (!userData || !userData.id) {
        console.error('User data:', userData);
        throw new Error('User not authenticated. Please login again.');
      }
      // Собираем данные формы
      const formData = {
        user_id: userData.id, // Добавляем ID текущего пользователя
        title: document.getElementById('campaignTitle').value,
        description: document.getElementById('campaignDescription').value,
        objective: document.getElementById('campaignObjective').value,
        budget_total: parseFloat(document.getElementById('campaignBudget').value),
        budget_daily: document.getElementById('campaignDailyBudget').value ?
          parseFloat(document.getElementById('campaignDailyBudget').value) : null,
        currency: document.getElementById('campaignCurrency').value,
        start_date: document.getElementById('campaignStartDate').value,
        end_date: document.getElementById('campaignEndDate').value,
        visibility: document.getElementById('campaignVisibility').value,
        landing_url: document.getElementById('campaignLandingUrl').value
      };
      console.log('Sending campaign data:', formData); // Для отладки

      // Проверяем, что user_id существует
      if (!formData.user_id) {
        throw new Error('User ID not found. Please login again.');
      }

      // Валидация обязательных полей
      if (!formData.title || !formData.budget_total || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill all required fields');
      }

      // Собираем целевую аудиторию
      const ageRange = document.getElementById('targetAgeRange').value;
      const interests = document.getElementById('targetInterests').value
        .split(',').map(s => s.trim()).filter(s => s);
      const geo = document.getElementById('targetGeo').value
        .split(',').map(s => s.trim().toUpperCase()).filter(s => s);

      if (ageRange || interests.length || geo.length) {
        formData.target_audience = {
          age_range: ageRange,
          gender: document.getElementById('targetGender').value,
          interests: interests,
          geo: geo
        };
      }

      const url = this.isEditMode ?
        `/api/campaigns/${this.currentCampaignId}` :
        '/api/campaigns';

      const method = this.isEditMode ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method: method,
        body: JSON.stringify(formData)
      });

      if (response.success) {
        showNotification(
          this.isEditMode ? 'Campaign updated successfully' : 'Campaign created successfully',
          'success'
        );
        this.closeModal();
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      showNotification(error.message || 'Error saving campaign', 'error');
    }
  },

  /**
   * Просматривает детали кампании
   * @param {number} id - ID кампании
   */
  async viewCampaign(id) {
    try {
      const response = await apiFetch(`/api/campaigns/${id}`, {
        method: 'GET'
      });

      if (response.success) {
        const campaign = response.data;

        // Создаем модальное окно с деталями
        const modalContent = `
                    <div class="campaign-details">
                        <h3>${this.escapeHtml(campaign.title)}</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>Status:</strong> 
                                <span class="status ${this.getStatusClass(campaign.status)}">${campaign.status}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Owner:</strong> ${campaign.owner_name}
                            </div>
                            <div class="detail-item">
                                <strong>Objective:</strong> ${campaign.objective || '-'}
                            </div>
                            <div class="detail-item">
                                <strong>Budget:</strong> $${campaign.budget_total} ${campaign.currency}
                            </div>
                            <div class="detail-item">
                                <strong>Spent:</strong> $${campaign.budget_spent}
                            </div>
                            <div class="detail-item">
                                <strong>Remaining:</strong> $${campaign.budget_remaining}
                            </div>
                            <div class="detail-item">
                                <strong>Start Date:</strong> ${this.formatDate(campaign.start_date)}
                            </div>
                            <div class="detail-item">
                                <strong>End Date:</strong> ${this.formatDate(campaign.end_date)}
                            </div>
                            <div class="detail-item">
                                <strong>Completion:</strong> ${campaign.completion_rate}%
                            </div>
                            <div class="detail-item">
                                <strong>Visibility:</strong> ${campaign.visibility}
                            </div>
                        </div>
                        
                        ${campaign.description ? `
                            <div class="detail-section">
                                <h4>Description</h4>
                                <p>${this.escapeHtml(campaign.description)}</p>
                            </div>
                        ` : ''}
                        
                        ${campaign.target_audience ? `
                            <div class="detail-section">
                                <h4>Target Audience</h4>
                                <ul>
                                    ${campaign.target_audience.age_range ?
              `<li><strong>Age:</strong> ${campaign.target_audience.age_range}</li>` : ''}
                                    ${campaign.target_audience.gender ?
              `<li><strong>Gender:</strong> ${campaign.target_audience.gender}</li>` : ''}
                                    ${campaign.target_audience.interests?.length ?
              `<li><strong>Interests:</strong> ${campaign.target_audience.interests.join(', ')}</li>` : ''}
                                    ${campaign.target_audience.geo?.length ?
              `<li><strong>Countries:</strong> ${campaign.target_audience.geo.join(', ')}</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${campaign.approval_status === 'rejected' && campaign.approval_notes ? `
                            <div class="detail-section rejection-notes">
                                <h4>Rejection Reason</h4>
                                <p>${this.escapeHtml(campaign.approval_notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                `;

        this.showInfoModal('Campaign Details', modalContent);
      }
    } catch (error) {
      console.error('Error viewing campaign:', error);
      showNotification('Error loading campaign details', 'error');
    }
  },

  /**
   * Отправляет кампанию на модерацию
   * @param {number} id - ID кампании
   */
  async submitForApproval(id) {
    if (!confirm('Submit this campaign for approval?')) return;

    try {
      const response = await apiFetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending_approval' })
      });

      if (response.success) {
        showNotification('Campaign submitted for approval', 'success');
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error submitting campaign:', error);
      showNotification(error.message || 'Error submitting campaign', 'error');
    }
  },

  /**
     * Приостанавливает кампанию
     * @param {number} id - ID кампании
     */
  async pauseCampaign(id) {
    if (!confirm('Pause this campaign?')) return;

    try {
      const response = await apiFetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paused' })
      });

      if (response.success) {
        showNotification('Campaign paused', 'success');
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      showNotification('Error pausing campaign', 'error');
    }
  },

  /** * Возобновляет кампанию
   * @param {number} id - ID кампании
   */
  async resumeCampaign(id) {
    if (!confirm('Resume this campaign?')) return;

    try {
      const response = await apiFetch(`/api/campaigns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' })
      });

      if (response.success) {
        showNotification('Campaign resumed', 'success');
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error resuming campaign:', error);
      showNotification('Error resuming campaign', 'error');
    }
  },

  /**
   * Показывает модальное окно модерации
   * @param {number} id - ID кампании
   */
  showModerationModal(id) {
    this.currentCampaignId = id;
    document.getElementById('moderationForm').reset();
    document.getElementById('moderationModal').style.display = 'block';
  },

  /**
   * Модерирует кампанию
   */
  async moderateCampaign() {
    try {
      const decision = document.querySelector('input[name="decision"]:checked').value;
      const notes = document.getElementById('moderationNotes').value;

      if (decision === 'rejected' && !notes) {
        showNotification('Please provide notes for rejection', 'error');
        return;
      }

      const response = await apiFetch(`/api/campaigns/${this.currentCampaignId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes })
      });

      if (response.success) {
        showNotification(`Campaign ${decision}`, 'success');
        this.closeModerationModal();
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error moderating campaign:', error);
      showNotification('Error moderating campaign', 'error');
    }
  },

  /**
   * Удаляет кампанию
   * @param {number} id - ID кампании
   */
  async deleteCampaign(id) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await apiFetch(`/api/campaigns/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        showNotification('Campaign deleted successfully', 'success');
        this.loadCampaigns(this.currentPage);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showNotification('Error deleting campaign', 'error');
    }
  },

  /**
   * Отображает пагинацию
   * @param {Object} pagination - Данные пагинации
   */
  displayPagination(pagination) {
    const container = document.getElementById('campaignPagination');
    const { page, pages, total } = pagination;

    if (pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="pagination-info">Total: ' + total + ' campaigns</div>';
    html += '<div class="pagination-buttons">';

    // Кнопка "Предыдущая"
    if (page > 1) {
      html += `<button onclick="campaignManager.loadCampaigns(${page - 1})" class="btn btn-sm">Previous</button>`;
    }

    // Номера страниц
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
        html += `<button onclick="campaignManager.loadCampaigns(${i})" 
                         class="btn btn-sm ${i === page ? 'btn-primary' : ''}">${i}</button>`;
      } else if (i === page - 3 || i === page + 3) {
        html += '<span>...</span>';
      }
    }

    // Кнопка "Следующая"
    if (page < pages) {
      html += `<button onclick="campaignManager.loadCampaigns(${page + 1})" class="btn btn-sm">Next</button>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Закрывает модальное окно
   */
  closeModal() {
    document.getElementById('campaignModal').style.display = 'none';
    document.getElementById('campaignForm').reset();
  },

  /**
   * Закрывает модальное окно модерации
   */
  closeModerationModal() {
    document.getElementById('moderationModal').style.display = 'none';
    document.getElementById('moderationForm').reset();
  },

  /**
   * Показывает информационное модальное окно
   * @param {string} title - Заголовок
   * @param {string} content - Содержимое
   */
  showInfoModal(title, content) {
    // Проверяем, нет ли уже открытого информационного модального окна
    const existingModal = document.getElementById('infoModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Создаем модальное окно с правильной структурой
    const modal = document.createElement('div');
    modal.id = 'infoModal';
    modal.className = 'modal';
    modal.style.display = 'flex'; // Используем flex для центрирования
    modal.innerHTML = `
    <div class="modal-content large-modal">
      <span class="close">&times;</span>
      <h3>${title}</h3>
      ${content}
    </div>
  `;

    // Добавляем в body
    document.body.appendChild(modal);

    // Добавляем обработчики закрытия
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.remove();

    // Закрытие по клику на фон
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  },

  /**
   * Получает CSS класс для статуса
   * @param {string} status - Статус кампании
   * @returns {string} CSS класс
   */
  getStatusClass(status) {
    const statusClasses = {
      'draft': 'status-draft',
      'pending_approval': 'status-pending',
      'active': 'status-active',
      'paused': 'status-paused',
      'completed': 'status-completed',
      'rejected': 'status-rejected'
    };
    return statusClasses[status] || '';
  },

  /**
   * Форматирует дату
   * @param {string} date - Дата в ISO формате
   * @returns {string} Отформатированная дата
   */
  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  },

  /**
   * Форматирует диапазон дат
   * @param {string} startDate - Начальная дата
   * @param {string} endDate - Конечная дата
   * @returns {string} Отформатированный диапазон
   */
  formatDateRange(startDate, endDate) {
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  },

  /**
   * Экранирует HTML
   * @param {string} text - Текст для экранирования
   * @returns {string} Экранированный текст
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

};
window.campaignManager = campaignManager;

// Менеджер для управления площадками
const platformManager = {
  currentPage: 1,
  itemsPerPage: 20,
  currentPlatformId: null,
  isEditMode: false,

  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Форма создания/редактирования
    document.getElementById('platformForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePlatform();
    });

    // Форма модерации
    document.getElementById('platformModerationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.moderatePlatform();
    });

    // Изменение модели ценообразования
    document.getElementById('platformPricingModel').addEventListener('change', (e) => {
      this.updatePricingFields(e.target.value);
    });

    // Проверка доступности URL
    let urlTimeout;
    document.getElementById('platformUrl').addEventListener('input', (e) => {
      clearTimeout(urlTimeout);
      urlTimeout = setTimeout(() => this.checkUrlAvailability(e.target.value), 500);
    });

    // Фильтры по Enter
    ['platformSearch', 'audienceMin', 'audienceMax'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.loadPlatforms();
        }
      });
    });
  },

  async loadPlatforms(page = 1) {
    try {
      this.currentPage = page;

      const params = new URLSearchParams({
        page: page,
        limit: this.itemsPerPage,
        search: document.getElementById('platformSearch').value,
        type: document.getElementById('platformTypeFilter').value,
        status: document.getElementById('platformStatusFilter').value,
        pricing_model: document.getElementById('platformPricingFilter').value,
        verification_status: document.getElementById('verificationFilter').value,
        audience_min: document.getElementById('audienceMin').value,
        audience_max: document.getElementById('audienceMax').value
      });

      [...params.entries()].forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await apiFetch(`/api/platforms?${params}`);

      if (response.success) {
        this.displayPlatforms(response.data);
        this.displayPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
      showNotification('Error loading platforms', 'error');
    }
  },

  displayPlatforms(platforms) {
    const tbody = document.getElementById('platformsTableBody');

    if (platforms.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="empty">No platforms found</td></tr>';
      return;
    }

    tbody.innerHTML = platforms.map(platform => {
      const statusClass = this.getStatusClass(platform.status);
      const verificationClass = this.getVerificationClass(platform.verification_status);

      return `
        <tr>
          <td>${platform.id}</td>
          <td>${this.escapeHtml(platform.name)}</td>
          <td>${this.formatType(platform.type)}</td>
          <td>${platform.owner_username || 'Unknown'}</td>
          <td><span class="status ${statusClass}">${platform.status}</span></td>
          <td><span class="verification ${verificationClass}">${platform.verification_status}</span></td>
          <td>${this.formatAudience(platform.audience_size)}</td>
          <td>${this.formatPricing(platform.pricing_model, platform.pricing, platform.currency)}</td>
          <td>${this.formatRating(platform.rating)}</td>
          <td>${platform.quality_score || 0}/10</td>
          <td>${this.generateActionButtons(platform)}</td>
        </tr>
      `;
    }).join('');
  },

  generateActionButtons(platform) {
    const buttons = [];

    // View
    buttons.push(`<button onclick="platformManager.viewPlatform(${platform.id})" class="btn btn-sm btn-info" title="View">
      <i class="fas fa-eye"></i>
    </button>`);

    // Edit (только для черновиков и отклоненных)
    if (['draft', 'rejected'].includes(platform.status)) {
      buttons.push(`<button onclick="platformManager.editPlatform(${platform.id})" class="btn btn-sm btn-primary" title="Edit">
        <i class="fas fa-edit"></i>
      </button>`);
    }

    // Status management
    if (platform.status === 'draft') {
      buttons.push(`<button onclick="platformManager.submitForReview(${platform.id})" class="btn btn-sm btn-success" title="Submit for Review">
        <i class="fas fa-paper-plane"></i>
      </button>`);
    } else if (platform.status === 'active') {
      buttons.push(`<button onclick="platformManager.pausePlatform(${platform.id})" class="btn btn-sm btn-warning" title="Pause">
        <i class="fas fa-pause"></i>
      </button>`);
    } else if (platform.status === 'paused') {
      buttons.push(`<button onclick="platformManager.activatePlatform(${platform.id})" class="btn btn-sm btn-success" title="Activate">
        <i class="fas fa-play"></i>
      </button>`);
    }

    // Moderation (для модераторов/админов)
    if (platform.moderation_status === 'pending' && (userData.is_admin || userData.is_moderator)) {
      buttons.push(`<button onclick="platformManager.showModerationModal(${platform.id})" class="btn btn-sm btn-purple" title="Moderate">
        <i class="fas fa-gavel"></i>
      </button>`);
    }

    // Verification (для модераторов/админов)
    if ((userData.is_admin || userData.is_moderator) && platform.verification_status !== 'verified') {
      buttons.push(`<button onclick="platformManager.showVerificationModal(${platform.id})" class="btn btn-sm btn-green" title="Verify">
        <i class="fas fa-check-circle"></i>
      </button>`);
    }

    // Archive
    if (platform.status !== 'archived') {
      buttons.push(`<button onclick="platformManager.archivePlatform(${platform.id})" class="btn btn-sm btn-danger" title="Archive">
        <i class="fas fa-archive"></i>
      </button>`);
    }

    return buttons.join(' ');
  },

  async loadStats() {
    try {
      const response = await apiFetch('/api/admin/platforms/stats');

      if (response.success) {
        const stats = response.data;
        document.getElementById('platformStats').style.display = 'flex';
        document.getElementById('platformStatTotal').textContent = stats.total;
        document.getElementById('platformStatActive').textContent = stats.by_status.active || 0;
        document.getElementById('platformStatVerified').textContent = stats.verified_count;
        document.getElementById('platformStatAudience').textContent = this.formatAudience(stats.total_audience);
        document.getElementById('platformStatQuality').textContent = stats.average_quality_score;
      }
    } catch (error) {
      console.error('Error loading platform stats:', error);
    }
  },

  showCreateForm() {
    this.isEditMode = false;
    this.currentPlatformId = null;
    document.getElementById('platformModalTitle').textContent = 'Add Platform';
    document.getElementById('platformForm').reset();
    document.getElementById('platformCurrency').value = 'USD';
    document.getElementById('urlAvailability').textContent = '';
    document.getElementById('platformModal').style.display = 'block';
  },

  async editPlatform(id) {
    try {
      const response = await apiFetch(`/api/platforms/${id}`);

      if (response.success) {
        const platform = response.data;
        this.isEditMode = true;
        this.currentPlatformId = id;

        document.getElementById('platformModalTitle').textContent = 'Edit Platform';
        document.getElementById('platformName').value = platform.name;
        document.getElementById('platformType').value = platform.type;
        document.getElementById('platformUrl').value = platform.url;
        document.getElementById('platformDescription').value = platform.description || '';
        document.getElementById('platformAudience').value = platform.audience_size || 0;
        document.getElementById('platformPricingModel').value = platform.pricing_model;
        document.getElementById('platformCurrency').value = platform.currency || 'USD';

        this.updatePricingFields(platform.pricing_model, platform.pricing);
        document.getElementById('platformModal').style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading platform:', error);
      showNotification('Error loading platform', 'error');
    }
  },

  async savePlatform() {
    try {
      if (!checkAuth()) return;

      const formData = {
        name: document.getElementById('platformName').value,
        type: document.getElementById('platformType').value,
        url: document.getElementById('platformUrl').value,
        description: document.getElementById('platformDescription').value,
        audience_size: parseInt(document.getElementById('platformAudience').value) || 0,
        pricing_model: document.getElementById('platformPricingModel').value,
        currency: document.getElementById('platformCurrency').value,
        pricing: this.collectPricingData()
      };

      const url = this.isEditMode ?
        `/api/platforms/${this.currentPlatformId}` :
        '/api/platforms';
      const method = this.isEditMode ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method: method,
        body: JSON.stringify(formData)
      });

      if (response.success) {
        showNotification(
          this.isEditMode ? 'Platform updated successfully' : 'Platform created successfully',
          'success'
        );
        this.closeModal();
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error saving platform:', error);
      showNotification(error.message || 'Error saving platform', 'error');
    }
  },

  updatePricingFields(model, pricing = {}) {
    const container = document.querySelector('.pricing-inputs');
    let html = '';

    switch (model) {
      case 'cpm':
        html = `<input type="number" id="priceCPM" placeholder="Price per 1000 impressions" 
                       step="0.01" min="0" value="${pricing.cpm || ''}">`;
        break;
      case 'cpc':
        html = `<input type="number" id="priceCPC" placeholder="Price per click" 
                       step="0.01" min="0" value="${pricing.cpc || ''}">`;
        break;
      case 'cpa':
        html = `<input type="number" id="priceCPA" placeholder="Price per action" 
                       step="0.01" min="0" value="${pricing.cpa || ''}">`;
        break;
      case 'flat_rate':
        html = `
          <input type="number" id="priceFlatDaily" placeholder="Daily rate" 
                 step="0.01" min="0" value="${pricing.flat_daily || ''}">
          <input type="number" id="priceFlatWeekly" placeholder="Weekly rate" 
                 step="0.01" min="0" value="${pricing.flat_weekly || ''}">
          <input type="number" id="priceFlatMonthly" placeholder="Monthly rate" 
                 step="0.01" min="0" value="${pricing.flat_monthly || ''}">
        `;
        break;
      case 'hybrid':
        html = `
          <input type="number" id="priceCPM" placeholder="CPM rate" 
                 step="0.01" min="0" value="${pricing.cpm || ''}">
          <input type="number" id="priceCPC" placeholder="CPC rate" 
                 step="0.01" min="0" value="${pricing.cpc || ''}">
        `;
        break;
    }

    container.innerHTML = html;
  },

  collectPricingData() {
    const model = document.getElementById('platformPricingModel').value;
    const pricing = {};

    switch (model) {
      case 'cpm':
        pricing.cpm = parseFloat(document.getElementById('priceCPM')?.value) || 0;
        break;
      case 'cpc':
        pricing.cpc = parseFloat(document.getElementById('priceCPC')?.value) || 0;
        break;
      case 'cpa':
        pricing.cpa = parseFloat(document.getElementById('priceCPA')?.value) || 0;
        break;
      case 'flat_rate':
        pricing.flat_daily = parseFloat(document.getElementById('priceFlatDaily')?.value) || 0;
        pricing.flat_weekly = parseFloat(document.getElementById('priceFlatWeekly')?.value) || 0;
        pricing.flat_monthly = parseFloat(document.getElementById('priceFlatMonthly')?.value) || 0;
        break;
      case 'hybrid':
        pricing.cpm = parseFloat(document.getElementById('priceCPM')?.value) || 0;
        pricing.cpc = parseFloat(document.getElementById('priceCPC')?.value) || 0;
        break;
    }

    return pricing;
  },

  async checkUrlAvailability(url) {
    if (!url) {
      document.getElementById('urlAvailability').textContent = '';
      return;
    }

    try {
      const response = await apiFetch(`/api/platforms/check-url?url=${encodeURIComponent(url)}`);

      const hint = document.getElementById('urlAvailability');
      if (response.data.available) {
        hint.textContent = '✓ URL is available';
        hint.style.color = 'green';
      } else {
        hint.textContent = '✗ URL is already registered';
        hint.style.color = 'red';
      }
    } catch (error) {
      console.error('Error checking URL:', error);
    }
  },

  async viewPlatform(id) {
    try {
      const response = await apiFetch(`/api/platforms/${id}`);

      if (response.success) {
        const platform = response.data;
        const modalContent = `
          <div class="platform-details">
            <h3>${this.escapeHtml(platform.name)}</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>Type:</strong> ${this.formatType(platform.type)}
              </div>
              <div class="detail-item">
                <strong>Status:</strong> 
                <span class="status ${this.getStatusClass(platform.status)}">${platform.status}</span>
              </div>
              <div class="detail-item">
                <strong>Owner:</strong> ${platform.owner_username}
              </div>
              <div class="detail-item">
                <strong>URL:</strong> <a href="${platform.url}" target="_blank">${platform.url}</a>
              </div>
              <div class="detail-item">
                <strong>Audience:</strong> ${this.formatAudience(platform.audience_size)}
              </div>
              <div class="detail-item">
                <strong>Pricing:</strong> ${this.formatPricing(platform.pricing_model, platform.pricing, platform.currency)}
              </div>
              <div class="detail-item">
                <strong>Verification:</strong> 
                <span class="verification ${this.getVerificationClass(platform.verification_status)}">${platform.verification_status}</span>
              </div>
              <div class="detail-item">
                <strong>Rating:</strong> ${this.formatRating(platform.rating)}
              </div>
              <div class="detail-item">
                <strong>Quality Score:</strong> ${platform.quality_score}/10
              </div>
            </div>
            
            ${platform.description ? `
              <div class="detail-section">
                <h4>Description</h4>
                <p>${this.escapeHtml(platform.description)}</p>
              </div>
            ` : ''}
            
            ${platform.moderation_notes ? `
              <div class="detail-section moderation-notes">
                <h4>Moderation Notes</h4>
                <p>${this.escapeHtml(platform.moderation_notes)}</p>
              </div>
            ` : ''}
          </div>
        `;

        this.showInfoModal('Platform Details', modalContent);
      }
    } catch (error) {
      console.error('Error viewing platform:', error);
      showNotification('Error loading platform details', 'error');
    }
  },

  async submitForReview(id) {
    if (!confirm('Submit this platform for review?')) return;

    try {
      const response = await apiFetch(`/api/platforms/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending_review' })
      });

      if (response.success) {
        showNotification('Platform submitted for review', 'success');
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error submitting platform:', error);
      showNotification('Error submitting platform', 'error');
    }
  },

  async pausePlatform(id) {
    if (!confirm('Pause this platform?')) return;

    try {
      const response = await apiFetch(`/api/platforms/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paused' })
      });

      if (response.success) {
        showNotification('Platform paused', 'success');
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error pausing platform:', error);
      showNotification('Error pausing platform', 'error');
    }
  },

  async activatePlatform(id) {
    if (!confirm('Activate this platform?')) return;

    try {
      const response = await apiFetch(`/api/platforms/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' })
      });

      if (response.success) {
        showNotification('Platform activated', 'success');
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error activating platform:', error);
      showNotification('Error activating platform', 'error');
    }
  },

  async archivePlatform(id) {
    if (!confirm('Archive this platform? It will no longer be visible in searches.')) return;

    try {
      const response = await apiFetch(`/api/platforms/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        showNotification('Platform archived', 'success');
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error archiving platform:', error);
      showNotification('Error archiving platform', 'error');
    }
  },

  showModerationModal(id) {
    this.currentPlatformId = id;
    document.getElementById('platformModerationForm').reset();
    document.getElementById('platformModerationModal').style.display = 'block';
  },

  async moderatePlatform() {
    try {
      const decision = document.querySelector('input[name="platformDecision"]:checked').value;
      const notes = document.getElementById('platformModerationNotes').value;

      if (['rejected', 'requires_changes'].includes(decision) && !notes) {
        showNotification('Please provide notes for this decision', 'error');
        return;
      }

      const response = await apiFetch(`/api/platforms/${this.currentPlatformId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes })
      });

      if (response.success) {
        showNotification(`Platform ${decision}`, 'success');
        this.closeModerationModal();
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error moderating platform:', error);
      showNotification('Error moderating platform', 'error');
    }
  },

  async showVerificationModal(id) {
    const verificationOptions = ['pending', 'verified', 'failed', 'expired'];
    const modalContent = `
      <div class="verification-form">
        <h4>Update Verification Status</h4>
        <select id="verificationSelect" class="form-control">
          ${verificationOptions.map(status =>
      `<option value="${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
    ).join('')}
        </select>
        <div class="form-actions" style="margin-top: 20px;">
          <button onclick="platformManager.updateVerification(${id})" class="btn btn-primary">Update</button>
          <button onclick="document.getElementById('infoModal').remove()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;

    this.showInfoModal('Verify Platform', modalContent);
  },

  async updateVerification(id) {
    try {
      const status = document.getElementById('verificationSelect').value;

      const response = await apiFetch(`/api/platforms/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status: status })
      });

      if (response.success) {
        showNotification('Verification status updated', 'success');
        document.getElementById('infoModal').remove();
        this.loadPlatforms(this.currentPage);
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      showNotification('Error updating verification', 'error');
    }
  },

  async loadPendingModeration() {
    try {
      const response = await apiFetch('/api/admin/platforms/pending');

      if (response.success) {
        this.displayPlatforms(response.data);
        this.displayPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading pending platforms:', error);
      showNotification('Error loading pending platforms', 'error');
    }
  },

  displayPagination(pagination) {
    const container = document.getElementById('platformPagination');
    const { page, pages, total } = pagination;

    if (pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '<div class="pagination-info">Total: ' + total + ' platforms</div>';
    html += '<div class="pagination-buttons">';

    if (page > 1) {
      html += `<button onclick="platformManager.loadPlatforms(${page - 1})" class="btn btn-sm">Previous</button>`;
    }

    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
        html += `<button onclick="platformManager.loadPlatforms(${i})" 
                         class="btn btn-sm ${i === page ? 'btn-primary' : ''}">${i}</button>`;
      } else if (i === page - 3 || i === page + 3) {
        html += '<span>...</span>';
      }
    }

    if (page < pages) {
      html += `<button onclick="platformManager.loadPlatforms(${page + 1})" class="btn btn-sm">Next</button>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },

  closeModal() {
    document.getElementById('platformModal').style.display = 'none';
    document.getElementById('platformForm').reset();
  },

  closeModerationModal() {
    document.getElementById('platformModerationModal').style.display = 'none';
    document.getElementById('platformModerationForm').reset();
  },

  showInfoModal(title, content) {
    const existingModal = document.getElementById('infoModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'infoModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content large-modal">
        <span class="close">&times;</span>
        <h3>${title}</h3>
        ${content}
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.remove();

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  },

  // Вспомогательные методы форматирования
  getStatusClass(status) {
    const statusClasses = {
      'draft': 'status-draft',
      'pending_review': 'status-pending',
      'active': 'status-active',
      'paused': 'status-paused',
      'suspended': 'status-suspended',
      'rejected': 'status-rejected',
      'archived': 'status-archived'
    };
    return statusClasses[status] || '';
  },

  getVerificationClass(status) {
    const verificationClasses = {
      'unverified': 'verification-unverified',
      'pending': 'verification-pending',
      'verified': 'verification-verified',
      'failed': 'verification-failed',
      'expired': 'verification-expired'
    };
    return verificationClasses[status] || '';
  },

  formatType(type) {
    const typeNames = {
      'website': 'Website',
      'telegram_channel': 'Telegram Channel',
      'telegram_group': 'Telegram Group',
      'instagram': 'Instagram',
      'youtube': 'YouTube',
      'tiktok': 'TikTok',
      'facebook': 'Facebook',
      'vk': 'VK',
      'email_newsletter': 'Email Newsletter',
      'mobile_app': 'Mobile App',
      'podcast': 'Podcast',
      'other': 'Other'
    };
    return typeNames[type] || type;
  },

  formatAudience(size) {
    if (!size) return '0';
    if (size >= 1000000) return (size / 1000000).toFixed(1) + 'M';
    if (size >= 1000) return (size / 1000).toFixed(1) + 'K';
    return size.toString();
  },

  formatPricing(model, pricing, currency) {
    if (!pricing) return '-';

    const curr = currency || 'USD';
    const symbol = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'RUB': '₽' }[curr] || curr;

    switch (model) {
      case 'cpm':
        return `${symbol}${pricing.cpm || 0} CPM`;
      case 'cpc':
        return `${symbol}${pricing.cpc || 0} CPC`;
      case 'cpa':
        return `${symbol}${pricing.cpa || 0} CPA`;
      case 'flat_rate':
        if (pricing.flat_daily) return `${symbol}${pricing.flat_daily}/day`;
        if (pricing.flat_weekly) return `${symbol}${pricing.flat_weekly}/week`;
        if (pricing.flat_monthly) return `${symbol}${pricing.flat_monthly}/month`;
        return '-';
      case 'hybrid':
        return 'Hybrid';
      default:
        return '-';
    }
  },

  formatRating(rating) {
    if (!rating) return '☆☆☆☆☆';
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Добавляем platformManager в window
window.platformManager = platformManager;

function showNotification(message, type = 'info') {
  alert(`${type.toUpperCase()}: ${message}`);
}

// Функция переключения секций
function showSection(sectionName) {
  // Убираем active со всех кнопок
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Добавляем active на нужную кнопку
  const activeBtn = document.querySelector(`[onclick*="${sectionName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Скрываем все секции
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });

  // Показываем нужную секцию
  const section = document.getElementById(sectionName);
  if (section) {
    section.style.display = 'block';

    // Загружаем данные для секции
    if (sectionName === 'campaign-management') {
      campaignManager.loadCampaigns();
      campaignManager.loadStats();
    } else if (sectionName === 'platform-management') {
      platformManager.loadPlatforms();
      platformManager.loadStats();
    }
  }
}
// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    window.location.href = "login.html"; // Redirect если не авторизован
  }

  // Загрузка данных
  loadUsers();
  campaignManager.init();
  platformManager.init();

  // Привязка событий форм с проверками на наличие

  const editUserForm = document.getElementById("editUserForm");
  if (editUserForm) {
    editUserForm.addEventListener("submit", saveEditUser);
  } else {
    console.warn(
      "Element not found: editUserForm. Edit user functionality disabled."
    );
  }

  // Закрытие модалок (опционально, добавьте кнопки close в HTML и обработчики здесь)
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    // Закрытие по клику на крестик
    const closeBtn = modal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    // Создание нового пользователя
    /**
     * Опрашивает inputs для создания нового пользователя.
     * @param ЗАПОЛНИТЬ
     */
    document.getElementById("create-user-form").addEventListener("submit", async (event) => {
      event.preventDefault(); // предотвращаем отправку формы

      // Получаем данные из формы
      const username = document.getElementById("new-username").value;
      const email = document.getElementById("new-email").value;
      const password = document.getElementById("new-password").value;
      const is_admin = document.getElementById("new-is_admin").checked;
      const is_moderator = document.getElementById("new-is_moderator").checked;

      const newUser = { username, email, password, is_admin, is_moderator };


      try {
        const result = await apiFetch(`/api/register`, {
          method: "POST",
          body: JSON.stringify(newUser)
        });
        alert("Новый пользователь создан: " + result.message);
        event.target.reset(); // очищаем форму
        loadUsers(); // обновляем список пользователей
      } catch (error) {
        console.error("Ошибка создания пользователя:", error);
        alert("Ошибка сервера.");
      }
    });

    // Закрытие по клику на фон
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });
});