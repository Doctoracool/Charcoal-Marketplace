/* =========================
   CONFIG 
========================= */
const API = "https://charcoal-server.onrender.com/api";
let allProducts = [];

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  setupSearch();
});

/* =========================
   LOAD PRODUCTS (SAFE VERSION)
========================= */
async function loadProducts() {
  const container = document.getElementById("products");

  try {
    container.innerHTML = "<p>Loading products...</p>";

    const res = await fetch(`${API}/products`);

    if (!res.ok) {
      throw new Error("API error");
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      container.innerHTML = "<p>No products found</p>";
      return;
    }

    allProducts = data;
    renderProducts(data);

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load products.</p>";
  }
}

/* =========================
   RENDER PRODUCTS
========================= */
function renderProducts(products) {
  const container = document.getElementById("products");

  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${getImageURL(p.image)}" alt="${escapeHTML(p.name)}">

      <h3>${escapeHTML(p.name)}</h3>
      <p>${escapeHTML(p.location)}</p>
      <h4>${p.price_pi} Pi</h4>

      <button onclick="buyProduct(${p.id}, ${p.price_pi}, this)">
        Buy with Pi
      </button>
    </div>
  `).join("");
}

/* =========================
   SEARCH
========================= */
function setupSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase();

    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(value) ||
      p.location.toLowerCase().includes(value)
    );

    renderProducts(filtered);
  });
}

/* =========================
   PI PAYMENT 
========================= */
function buyProduct(productId, amount, btn) {
  setLoading(btn, true);

  if (!window.Pi) {
    alert("Pi Browser required");
    setLoading(btn, false);
    return;
  }

  Pi.init({ version: "2.0" });

  Pi.authenticate(["payments"], function(auth) {

    Pi.createPayment({
      amount: amount,
      memo: "Charcoal Marketplace Purchase",
      metadata: { productId }
    }, {

      onReadyForServerApproval: async function(paymentId) {
        await fetch(`${API}/payments/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId })
        });
      },

      onReadyForServerCompletion: async function(paymentId, txid) {
        await fetch(`${API}/payments/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, txid })
        });

        alert("Payment successful ✔");
        loadProducts();
      }

    });

  }, function(err) {
    console.error(err);
    alert("Pi authentication failed");
    setLoading(btn, false);
  });
}

/* =========================
   LOADING STATE
========================= */
function setLoading(btn, state) {
  if (!btn) return;
  btn.disabled = state;
  btn.innerText = state ? "Processing..." : "Buy with Pi";
}

/* =========================
   IMAGE FIX
========================= */
function getImageURL(path) {
  if (!path) return "placeholder.png";
  if (path.startsWith("http")) return path;
  return "https://your-backend.onrender.com" + path;
}

/* =========================
   SECURITY
========================= */
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}