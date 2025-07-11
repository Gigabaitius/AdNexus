document.addEventListener("DOMContentLoaded", () => {
    //Отправка формы регистрации
  document
    .getElementById("register-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault(); // ⛔ Не даем браузеру перезагрузить страницу

      // Забираем значения
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const errorMessage = document.getElementById(
        "registration-error-message"
      );

      // Проверка значений
      if (username.length < 3) {
        errorMessage.textContent =
          "Username must be at least 3 characters long.";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorMessage.textContent = "Invalid email format.";
        return;
      }
      if (password.length < 6) {
        errorMessage.textContent = "Password must be at least 6 characters.";
        return;
      }
      // Отправка данных на сервер для полной проверки
      try {
        const res = await fetch("http://localhost:3000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          //если respond не okay
          errorMessage.textContent = data.message; // ошибка с сервера (например, пользователь уже есть)
        } else {
          //если respond okay
          alert("Account created!"); // успех
          window.location.href = "index.html";
        }
      } catch (err) {
        console.error("Ошибка при отправке:", err);
        errorMessage.textContent = "Server error.";
      }
    });

  //  Модальное окно
  //  Ссылки на элементы
  const openBtn = document.getElementById("open-form-btn");
  const closeBtn = document.getElementById("close-form-btn");
  const modal = document.getElementById("modal-overlay");

  //  Показать форму
  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  //  Скрыть форму
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  //  Дополнительно: закрытие по клику вне формы
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});
