// admin.js - Логика админ-панели для управления пользователями и кампаниями
// Полная реализация с фиксом URL, обработкой ошибок, модальными окнами и проверками на наличие DOM-элементов.
// Автор: AI Assistant (на основе репозитория https://github.com/Gigabaitius/AdNexus и контекста)
// Дата: [текущая дата]

// Базовый URL API (измените на production URL или используйте .env)
const API_URL = "http://localhost:3000"; // Порт бэкенда (Express сервер)

// Функция для получения JWT-токена из localStorage
function getToken() {
  return localStorage.getItem("token");
}

const userData = (() => {
  const token = getToken();
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.user_id,
      username: payload.username,
      is_Admin: payload.is_Admin === 1,
      is_Moderator: payload.is_Moderator === 1
    };
  } catch (e) {
    return {};
  }
})();

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
                   ${user.is_Admin ? "checked" : ""} 
                   disabled />
            <label for="isAdmin_${user.id}">Is Admin?</label>
          </div>
          <div>
            <input type="checkbox" id="isModerator_${user.id}" name="Moderator" 
                   ${user.is_Moderator ? "checked" : ""} 
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
    const user = await apiFetch(`/api/users/${id}`);
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
        editIsAdmin.checked = user.is_Admin === 1;
        editIsModerator.checked = user.is_Moderator === 1;

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
  const is_Admin = editIsAdmin;
  const is_Moderator = editIsModerator;

  try {
    await apiFetch(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ username, email, is_Admin, is_Moderator }),
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
    if (campaign.status === 'pending_approval' && (userData.is_Admin || userData.is_Moderator)) {
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
      // Собираем данные формы
      const formData = {
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
    // Создаем временное модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h3>${title}</h3>
                ${content}
            </div>
        `;
    document.body.appendChild(modal);
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
      const is_Admin = document.getElementById("new-is_Admin").checked;
      const is_Moderator = document.getElementById("new-is_Moderator").checked;

      const newUser = { username, email, password, is_Admin, is_Moderator };


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