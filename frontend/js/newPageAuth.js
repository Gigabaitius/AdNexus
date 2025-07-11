//Добавляем для страниц где нужна аутентификация с изменением конечной точки
import { checkAuth } from "./auth.js"; 

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (user) {
    document.getElementById("account-link").textContent = `👋 ${user.username}`;
  } else {
    window.location.href = "/login.html";
  }
});