import { checkAuth } from "./auth.js";
import { checkAdmin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (!user) {
    window.location.href = "login.html";
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
    const res = await fetch("http://localhost:3000/users", {
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
      const res = await fetch(`http://localhost:3000/users/${userId}`, {
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
      const res = await fetch(`http://localhost:3000/users/${userId}`, {
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
    const res = await fetch("http://localhost:3000/users", {
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