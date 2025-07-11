/* Заготовка на логин */
document.addEventListener("DOMContentLoaded", () => {
  
  //Отправка формы логина
  document
    .getElementById("login-form")
    .addEventListener("submit", async function (event) {
      event.preventDefault(); // ⛔ Не даем браузеру перезагрузить страницу

      // Забираем значения
      const usernameOrEmail = document.getElementById("usernameOrEmail").value;
      const password = document.getElementById("password").value;
      const errorMessage = document.getElementById(
        "login-error-message"
      );

      // Проверка значений
      if (usernameOrEmail.length < 3) {
        errorMessage.textContent =
          "Field must be at least 3 characters long.";
        return;
      }

      // Отправка данных на сервер для полной проверки
      try {
        const res = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameOrEmail, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          //если respond не okay
          errorMessage.textContent = data.message; // ошибка с сервера (например, пользователь уже есть)
        } else {//если respond okay
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          console.log("user:", data.user);
          alert("Login successful!"); // успех
          window.location.href = "NewPage.html";
        }
      } catch (err) {
        console.error("Ошибка при отправке:", err);
        errorMessage.textContent = "Server error.";
      }
    });
});
