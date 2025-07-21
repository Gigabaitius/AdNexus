import { checkAuth } from "./auth.js";
import { checkAdmin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (!user) {
    window.location.href = "login.html"; //проверить, будет ли он отправлять на верный адрес после изменения директорий
    return;
  }
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    alert("Нет прав доступа к админ-панели");
    window.location.href = "NewPage.html";
    return;
  }
  loadUsers();
});

// Функция для подгрузки и отображения списка пользователей
async function loadUsers() {
  try {
    const res = await fetch("http://localhost:3000/api/users", {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") }
    });
    if (!res.ok) {
      alert("Ошибка при загрузке пользователей");
      return;
    }
    const users = await res.json();
    const tbody = document.querySelector("#users-table tbody");
    tbody.innerHTML = ""; // очищаем таблицу
    users.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.is_admin ? "Да" : "Нет"}</td>
      <td>
        <button class="edit-btn" data-id="${user.id}">Редактировать</button>
        <button class="delete-btn" data-id="${user.id}">Удалить</button>
      </td>
    `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Ошибка загрузки пользователей", err);
  }
}

// Делегирование событий: назначаем обработчики на tbody таблицы
document.querySelector("#users-table tbody").addEventListener("click", async (e) => {
  const target = e.target; // элемент, на котором произошло событие
  const userId = target.getAttribute("data-id"); // получаем id пользователя из атрибута data-id

  // Если нажата кнопка редактирования
  if (target.classList.contains("edit-btn")) {
    const newUsername = prompt("Введите новое имя пользователя:");
    if (!newUsername) return;

    const newEmail = prompt("Введите новый email:");
    if (!newEmail) return;

    const newIsAdmin = confirm("Пользователь - администратор? (ОК = да, Отмена = нет)");

    const newPassword = prompt("Введите новый пароль (оставьте пустым, если не меняется):");

    // Подготовка данных для отправки
    const updateData = {
      username: newUsername,
      email: newEmail,
      is_admin: newIsAdmin ? 1 : 0
    };
    if (newPassword) {
      updateData.password = newPassword;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(updateData) // отправляем обновленные данные
      });
      const result = await res.json();
      if (!res.ok) {
        alert("Ошибка при редактировании: " + result.message);
      } else {
        alert("Пользователь обновлён успешно");
        loadUsers(); // перезагружаем список пользователей
      }
    } catch (err) {
      console.error("Ошибка редактирования:", err);
      alert("Ошибка сервера.");
    }
  }

  // Если нажата кнопка удаления
  if (target.classList.contains("delete-btn")) {
    if (!confirm("Вы уверены, что хотите удалить пользователя?")) return;

    try {
      const res = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      const result = await res.json();
      if (!res.ok) {
        alert("Ошибка при удалении: " + result.message);
      } else {
        alert("Пользователь удалён");
        loadUsers(); // перезагружаем список пользователей
      }
    } catch (err) {
      console.error("Ошибка удаления:", err);
      alert("Ошибка сервера.");
    }
  }
});

// Обработчик формы создания нового пользователя
document.getElementById("create-user-form").addEventListener("submit", async (event) => {
  event.preventDefault(); // предотвращаем отправку формы

  // Получаем данные из формы
  const username = document.getElementById("new-username").value;
  const email = document.getElementById("new-email").value;
  const password = document.getElementById("new-password").value;
  const is_admin = document.getElementById("new-is_admin").checked ? 1 : 0;

  const newUser = { username, email, password, is_admin };

  try {
    const res = await fetch("http://localhost:3000/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify(newUser) // отправляем данные нового пользователя
    });
    const result = await res.json();
    if (!res.ok) {
      alert("Ошибка при создании пользователя: " + result.message);
    } else {
      alert("Новый пользователь создан");
      event.target.reset(); // очищаем форму
      loadUsers(); // обновляем список пользователей
    }
  } catch (err) {
    console.error("Ошибка создания пользователя:", err);
    alert("Ошибка сервера.");
  }
});

// admin.js (или отдельный файл для админ-панели)
let currentPage = 1;
const limit = 10;

// Функция загрузки кампаний с пагинацией и фильтрами
async function loadCampaigns(page = 1, filters = {}, sort = {}) {
  const query = new URLSearchParams({
    page,
    limit,
    filter: JSON.stringify(filters),
    sort: JSON.stringify(sort)
  }).toString();

  const response = await fetch(`/api/campaigns?${query}`);
  const campaigns = await response.json();

  const tableBody = document.getElementById('campaigns-table-body');
  tableBody.innerHTML = '';

  campaigns.forEach(campaign => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${campaign.id}</td>
      <td>${campaign.title}</td>
      <td>${campaign.budget}</td>
      <td>${campaign.status}</td>
      <td>
        <button class="btn btn-sm btn-warning edit-btn" data-id="${campaign.id}">Изменить</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${campaign.id}">Удалить</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  currentPage = page;
}

// Обработчик формы добавления
document.getElementById('add-campaign-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    budget: parseFloat(document.getElementById('budget').value),
    start_date: document.getElementById('start_date').value,
    end_date: document.getElementById('end_date').value,
    status: document.getElementById('status').value
  };

  await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  loadCampaigns(currentPage);  // Обновляем таблицу
});

// Обработчик формы поиска
document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const filters = {};
  const status = document.getElementById('filter-status').value;
  const budget = document.getElementById('filter-budget').value;
  if (status) filters.status = { '=': status };
  if (budget) filters.budget = { '>': parseFloat(budget) };

  const sort = {};
  const sortField = document.getElementById('sort-field').value;
  const sortDirection = document.getElementById('sort-direction').value;
  if (sortField) sort[sortField] = sortDirection;

  loadCampaigns(1, filters, sort);  // Перезагружаем с новыми фильтрами
});

// Пагинация
document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) loadCampaigns(currentPage - 1);
});
document.getElementById('next-page').addEventListener('click', () => {
  loadCampaigns(currentPage + 1);
});

// Обработчик кнопок "Изменить" (модальное окно)
document.getElementById('campaigns-table-body').addEventListener('click', async (e) => {
  if (e.target.classList.contains('edit-btn')) {
    const id = e.target.dataset.id;
    // Загрузка данных кампании для редактирования (fetch /api/campaigns/:id)
    const response = await fetch(`/api/campaigns/${id}`);
    const campaign = await response.json();
    document.getElementById('edit-id').value = campaign.id;
    document.getElementById('edit-title').value = campaign.title;
    // Заполните другие поля аналогично

    // Показ модального окна (с Bootstrap)
    new bootstrap.Modal(document.getElementById('edit-modal')).show();
  }

  if (e.target.classList.contains('delete-btn')) {
    const id = e.target.dataset.id;
    if (confirm('Вы уверены, что хотите удалить кампанию?')) {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      loadCampaigns(currentPage);  // Обновляем таблицу
    }
  }
});

// Обработчик формы редактирования
document.getElementById('edit-campaign-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const formData = {
    title: document.getElementById('edit-title').value,
    // Другие поля...
  };

  await fetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  loadCampaigns(currentPage);  // Обновляем таблицу
});

// Начальная загрузка
loadCampaigns();