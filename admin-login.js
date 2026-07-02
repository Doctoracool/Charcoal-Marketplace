const API = window.location.origin + "/api";

/* =========================
   INIT PI
========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (window.Pi) {
    Pi.init({ version: "2.0" });
  }
});

/* =========================
   EMAIL ADMIN LOGIN
========================= */
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");
  const btn = document.getElementById("loginBtn");

  if (!email || !password) {
    msg.innerText = "Fill all fields";
    return;
  }

  btn.disabled = true;
  msg.innerText = "Logging in...";

  try {
    const res = await fetch(`${API}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.token || data.user?.role !== "admin") {
      msg.innerText = "Access denied";
      return;
    }

    localStorage.setItem("adminToken", data.token);

    msg.innerText = "Login successful ✔";

    setTimeout(() => {
      window.location.href = "admin.html";
    }, 800);

  } catch (err) {
    console.error(err);
    msg.innerText = "Network error";
  } finally {
    btn.disabled = false;
  }
}

/* =========================
   PI ADMIN LOGIN (FIXED)
========================= */
function loginWithPi() {
  const msg = document.getElementById("msg");
  const btn = document.querySelector(".pi-btn");

  if (!window.Pi) {
    alert("Pi Browser required");
    return;
  }

  msg.innerText = "Connecting to Pi...";
  if (btn) btn.disabled = true;

  Pi.authenticate(["username", "payments"], async function(auth) {

    try {
      const res = await fetch(`${API}/auth/pi-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: auth.accessToken,
          uid: auth.user.uid,
          username: auth.user.username
        })
      });

      const data = await res.json();

      if (!data.success) {
        msg.innerText = "Login failed";
        return;
      }

      // IMPORTANT: check admin only if backend supports it
      if (data.user.role !== "admin") {
        msg.innerText = "Not an admin account ❌";
        return;
      }

      localStorage.setItem("adminToken", data.token);

      msg.innerText = "Pi admin login successful ✔";

      setTimeout(() => {
        window.location.href = "admin.html";
      }, 800);

    } catch (err) {
      console.error(err);
      msg.innerText = "Server error";
    } finally {
      if (btn) btn.disabled = false;
    }

  }, function(err) {
    console.error(err);
    msg.innerText = "Pi login cancelled";
    if (btn) btn.disabled = false;
  });
}