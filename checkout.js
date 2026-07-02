const API = window.location.origin + "/api";

/* =========================
   CART SYSTEM
========================= */
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* =========================
   RENDER CHECKOUT
========================= */
function renderCheckout() {
  const container = document.getElementById("checkoutItems");
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = "<p>Your cart is empty</p>";
    document.getElementById("totalAmount").innerText = "0 Pi";
    return;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="item">
      <div>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${item.price_pi} Pi x ${item.qty}</p>
      </div>

      <button onclick="removeItem(${index})">Remove</button>
    </div>
  `).join("");

  updateTotal();
}

/* =========================
   TOTAL CALCULATION
========================= */
function updateTotal() {
  const cart = getCart();

  const total = cart.reduce((sum, item) =>
    sum + (item.price_pi * item.qty), 0
  );

  document.getElementById("totalAmount").innerText = total.toFixed(2) + " Pi";
}

/* =========================
   CHECKOUT PAYMENT (PI SAFE)
========================= */
function checkout() {
  const cart = getCart();

  if (!cart.length) {
    alert("Cart is empty");
    return;
  }

  const btn = document.querySelector("button");
  btn.disabled = true;
  btn.innerText = "Processing...";

  const totalAmount = cart.reduce((sum, item) =>
    sum + (item.price_pi * item.qty), 0
  );

  if (!window.Pi) {
    alert("Pi SDK not available");
    btn.disabled = false;
    btn.innerText = "Pay with Pi";
    return;
  }

  Pi.init({ version: "2.0" });

  Pi.authenticate(["payments"], function(auth) {

    Pi.createPayment({
      amount: totalAmount,
      memo: "Charcoal Marketplace Checkout",
      metadata: {
        orderCount: cart.length
      }
    }, {

      /* =========================
         APPROVAL STEP
      ========================= */
      onReadyForServerApproval: async function(paymentId) {
        await fetch(`${API}/payments/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId })
        });
      },

      /* =========================
         COMPLETION STEP
      ========================= */
      onReadyForServerCompletion: async function(paymentId, txid) {
        const res = await fetch(`${API}/payments/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, txid })
        });

        const data = await res.json();

        if (data.success) {
          alert("Order successful ✔");

          localStorage.removeItem("cart");

          renderCheckout();
        } else {
          alert("Payment failed");
        }

        btn.disabled = false;
        btn.innerText = "Pay with Pi";
      }

    });

  }, function(error) {
    console.error(error);
    alert("Payment failed or cancelled");

    btn.disabled = false;
    btn.innerText = "Pay with Pi";
  });
}

/* =========================
   REMOVE ITEM
========================= */
function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCheckout();
}

/* =========================
   SAFE HTML
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
renderCheckout();