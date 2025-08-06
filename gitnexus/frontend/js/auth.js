export async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const res = await fetch("http://localhost:3000/api/me", {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user;
}

export async function checkAdmin() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const res = await fetch("http://localhost:3000/api/admin", {
    headers: { Authorization: "Bearer " + token }
  });

  if (res.status === 403 || res.status === 401) return null;
  if (!res.ok) return null;

  return true;
}


/* Дальше вторая часть, адаптировать в файл .js для страниц где нужна авторизация

import { checkAuth } from "./auth.js";

const user = await checkAuth();
if (user) {
  // например, показать "Мой аккаунт"
} else {
  // например, перенаправить на login.html
}




-------------ПРИМЕР для index.html + index.js

Создай index.js:

import { checkAuth } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (user) {
    document.getElementById("account-link").textContent = `👋 ${user.username}`;
  } else {
    window.location.href = "/login.html";
  }
});

Подключи его в index.html:
<script type="module" src="index.js"></script>
Важно: у тега <script> должен быть type="module", иначе import не сработает.




-------------Можно ли запускать checkAuth() при нажатии на ссылку?
Да! Пример:

document.getElementById("dashboard-link").addEventListener("click", async (e) => {
  e.preventDefault(); // отменяем переход по ссылке

  const user = await checkAuth();
  if (user) {
    window.location.href = "/dashboard.html";
  } else {
    alert("Please log in first.");
    window.location.href = "/login.html";
  }
});
Это особенно удобно, если ты не хочешь вообще загружать dashboard.html для гостей.

*/