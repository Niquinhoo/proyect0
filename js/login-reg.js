document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("msg");

  if (!form || !msg) return;

  const isRegister = document.getElementById("username") !== null;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      msg.style.color = "red";
      msg.textContent = "Por favor, completá todos los campos.";
      return;
    }

    if (isRegister) {
      // REGISTRO
      const username = document.getElementById("username").value.trim();

      if (!username) {
        msg.style.color = "red";
        msg.textContent = "Por favor, ingresá tu nombre de usuario.";
        return;
      }

      if (localStorage.getItem(email)) {
        msg.style.color = "red";
        msg.textContent = "Ese correo ya está registrado.";
        return;
      }

      const userData = { username, email, password };
      localStorage.setItem(email, JSON.stringify(userData));

      msg.style.color = "green";
      msg.textContent = "¡Registro exitoso! Redirigiendo al login...";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);

    } else {
      // LOGIN
      const user = JSON.parse(localStorage.getItem(email));

      if (user && user.password === password) {
        msg.style.color = "green";
        msg.textContent = `Bienvenido, ${user.username}! Redirigiendo...`;

        // Acá podrías redirigir al dashboard, página principal, etc.
        setTimeout(() => {
          window.location.href = "../../index.html"; // cambialo por tu página de inicio real
        }, 2000);
      } else {
        msg.style.color = "red";
        msg.textContent = "Correo o contraseña incorrectos.";
      }
    }
  });
});
