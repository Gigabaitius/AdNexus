import { checkAuth } from "./auth.js";

/* Бургер меню */
document.addEventListener("DOMContentLoaded", async () => {
  //при загрузке страницы
  await loadHTML("header.html", "header"); //подгрузка header
  await loadHTML("footer.html", "footer"); //подгрузка footer
  
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");
  burger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  document.addEventListener("click", (event) => {
    // Закрытие меню при клике вне
    if (!burger.contains(event.target) && !navLinks.contains(event.target)) {
      navLinks.classList.remove("active");
    }
  });

  const logLnk = document.getElementById("login-lnk");
  const regLnk = document.getElementById("register-lnk");
  const accLnk = document.getElementById("account-lnk");
  const exitLnk = document.getElementById("account-exit-lnk");
  const user = await checkAuth();
  if (user) {
    logLnk.classList.add("hidden");
    regLnk.classList.add("hidden");
    accLnk.classList.remove("hidden");
    exitLnk.classList.remove("hidden");
  } else {
    logLnk.classList.remove("hidden");
    regLnk.classList.remove("hidden");
    accLnk.classList.add("hidden");
    exitLnk.classList.add("hidden");
  }

  exitLnk.addEventListener("click", () => {
    localStorage.removeItem("token"); // удалишь токен
    localStorage.removeItem("user");  // также удалишь данные user, если ты их хранишь
    window.location.reload();
  });
});

async function loadHTML(url, containerId) { //объявляем функцию loadHTML, async - функция 
  try {
    const response = await fetch(url); // Запрашиваем URL
    if (!response.ok) throw new Error(`Ошибка ${response.status}`);
    const html = await response.text(); // Получаем контент в виде текста
    document.getElementById(containerId).innerHTML = html; // Вставляем контент внутрь контейнера
  } catch (err) {
    console.error("Ошибка при загрузке внешнего HTML:", err);
  }
}
