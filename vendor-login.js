const API = window.location.origin + "/api";

/* =========================
   EMAIL LOGIN (VENDOR)
========================= */
async function loginVendor() {
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const btn = document.getElementById("loginBtn");
  const msg = document.getElementById("msg");

  if (!email.value || !password.value) {
    msg.innerText = "Please fill all fields";
    msg.style.color = "red";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Logging in...";

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.innerText = data.message || "Login failed";
      msg.style.color = "red";
      return;
    }

    // MUST BE VENDOR ONLY
    if (data.user.role !== "vendor") {
      msg.innerText = "Access denied (not vendor)";
      msg.style.color = "red";
      return;
    }

    localStorage.setItem("token", data.token);

    msg.innerText = "Login successful ✔";
    msg.style.color = "green";

    setTimeout(() => {
      window.location.href = "vendor-login.html";
    }, 800);

  } catch (err) {
    console.error(err);
    msg.innerText = "Server error";
  } finally {
    btn.disabled = false;
    btn.innerText = "Login";
  }
}

/* =========================
   PI LOGIN (FIXED)
========================= */
async function loginWithPi() {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("piLoginBtn");

  if (!window.Pi) {
    msg.innerText = "Pi SDK not loaded";
    return;
  }

  msg.innerText = "Connecting to Pi...";
  btn.disabled = true;

  try {
    Pi.init({ version: "2.0" });

    Pi.authenticate(["username", "payments"], async function(auth) {

      try {
        const res = await fetch(`${API}/auth/pi-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            accessToken: auth.accessToken
          })
        });

        const data = await res.json();

        if (!res.ok) {
          msg.innerText = data.message || "Pi login failed";
          return;
        }

        // ONLY VENDOR CAN ENTER DASHBOARD
        if (data.user.role !== "vendor") {
          msg.innerText = "Not a vendor account ❌";
          return;
        }

        localStorage.setItem("token", data.token);

        window.location.href = "vendor-dashboard.html";

      } catch (err) {
        console.error(err);
        msg.innerText = "Server error during Pi login";
      }

      btn.disabled = false;
    });

  } catch (err) {
    console.error(err);
    msg.innerText = "Pi authentication error";
    btn.disabled = false;
  }
}

/* =========================
   ENTER KEY SUPPORT
========================= */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    loginVendor();
  }
});