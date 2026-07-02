const API = window.location.origin + "/api";

/* =========================
   AUTH CHECK
========================= */
const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "admin-login.html";
}

/* =========================
   JWT ROLE DECODER
========================= */
function getUser() {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

const currentUser = getUser();

/* =========================
   ROLE SYSTEM (5 ROLES)
========================= */
const ALLOWED_ROLES = [
  "admin",
  "super_admin",
  "product_manager",
  "order_manager",
  "support_manager",
  "vendor",
  "buyer"
];

/* FRONTEND GUARD (BACKEND IS STILL AUTHORITY) */
if (currentUser && !ALLOWED_ROLES.includes(currentUser.role)) {
  alert("Access denied");
  window.location.href = "admin-login.html";
}

/* =========================
   HEADERS
========================= */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

/* =========================
   SAFE FETCH
========================= */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {})
      }
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return null;
    }

    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
}

/* =========================
   SECTION SWITCHER
========================= */
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

  const section = document.getElementById(id);
  if (section) section.classList.add("active");

  if (id === "dashboard") loadDashboard();
  if (id === "products") loadProducts();
  if (id === "orders") loadOrders();
  if (id === "vendors") loadVendors();
  if (id === "approvals") {
    loadPendingProducts();
    loadPendingVendors();
  }
  if (id === "roles") loadUsers();
}

/* =========================
   DASHBOARD
========================= */
async function loadDashboard() {
  const [products, orders, vendors] = await Promise.all([
    safeFetch(`${API}/products`) || [],
    safeFetch(`${API}/orders`) || [],
    safeFetch(`${API}/vendors`) || []
  ]);

  document.getElementById("productsCount").innerText = products.length || 0;
  document.getElementById("ordersCount").innerText = orders.length || 0;
  document.getElementById("vendorsCount").innerText = vendors.length || 0;

  const completedOrders = orders.filter(o => o.status === "completed").length || 0;
  document.getElementById("sales").innerText = completedOrders + " Pi";
}

/* =========================
   PRODUCTS
========================= */
async function loadProducts() {
  const data = await safeFetch(`${API}/products`) || [];

  document.getElementById("adminProducts").innerHTML =
    data.map(p => `
      <div class="item">
        <b>${escapeHTML(p.name)}</b> - ${p.price_pi} Pi
        <br>
        ${escapeHTML(p.location)}
      </div>
    `).join("");
}

/* =========================
   ORDERS
========================= */
async function loadOrders() {
  const data = await safeFetch(`${API}/orders`) || [];

  document.getElementById("adminOrders").innerHTML =
    data.map(o => `
      <div class="item">
        Order #${o.id} - ${o.status}
      </div>
    `).join("");
}

/* =========================
   VENDORS
========================= */
async function loadVendors() {
  const data = await safeFetch(`${API}/vendors`) || [];

  document.getElementById("adminVendors").innerHTML =
    data.map(v => `
      <div class="item">
        ${escapeHTML(v.name || "Unknown")}
      </div>
    `).join("");
}

/* =========================
   APPROVALS
========================= */
async function loadPendingProducts() {
  const data = await safeFetch(`${API}/products/admin/pending`) || [];

  document.getElementById("pendingProducts").innerHTML =
    data.length
      ? data.map(p => `
        <div class="item">
          <b>${escapeHTML(p.name)}</b>
          <button onclick="approveProduct(${p.id})">Approve</button>
          <button onclick="rejectProduct(${p.id})">Reject</button>
        </div>
      `).join("")
      : "<p>No pending products</p>";
}

async function loadPendingVendors() {
  const data = await safeFetch(`${API}/admin/vendors/pending`) || [];

  document.getElementById("pendingVendors").innerHTML =
    data.length
      ? data.map(v => `
        <div class="item">
          <b>${escapeHTML(v.name)}</b>
          <button onclick="approveVendor(${v.id})">Approve</button>
          <button onclick="rejectVendor(${v.id})">Reject</button>
        </div>
      `).join("")
      : "<p>No pending vendors</p>";
}

/* =========================
   PRODUCT ACTIONS
========================= */
async function approveProduct(id) {
  await safeFetch(`${API}/products/admin/approve/${id}`, { method: "POST" });
  loadPendingProducts();
}

async function rejectProduct(id) {
  await safeFetch(`${API}/products/admin/reject/${id}`, { method: "POST" });
  loadPendingProducts();
}

/* =========================
   VENDOR ACTIONS
========================= */
async function approveVendor(id) {
  await safeFetch(`${API}/admin/vendors/approve/${id}`, { method: "POST" });
  loadPendingVendors();
}

async function rejectVendor(id) {
  await safeFetch(`${API}/admin/vendors/reject/${id}`, { method: "POST" });
  loadPendingVendors();
}

/* =========================
   ROLE MANAGEMENT (5 ROLES)
========================= */
async function loadUsers() {
  const data = await safeFetch(`${API}/admin/users`) || [];

  document.getElementById("usersList").innerHTML =
    data.map(u => `
      <div class="item">
        <b>${escapeHTML(u.name)}</b> (${u.email})
        <br>
        Role: ${u.role}

        <select id="role-${u.id}">
          <option value="buyer">buyer</option>
          <option value="vendor">vendor</option>
          <option value="admin">admin</option>
          <option value="super_admin">super admin</option>
          <option value="product_manager">product manager</option>
          <option value="order_manager">order manager</option>
          <option value="support_manager">support manager</option>
        </select>

        <button onclick="updateRole(${u.id})">Update</button>
      </div>
    `).join("");
}

/* =========================
   UPDATE ROLE
========================= */
async function updateRole(userId) {
  const role = document.getElementById(`role-${userId}`).value;

  await safeFetch(`${API}/admin/users/role/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role })
  });

  loadUsers();
}

/* =========================
   LOGOUT
========================= */
function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "admin-login.html";
}

/* =========================
   SECURITY
========================= */
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* =========================
   INIT
========================= */
loadDashboard();