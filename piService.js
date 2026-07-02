const axios = require("axios");

const PI_API_KEY = process.env.PI_API_KEY;
const PI_BASE_URL = "https://api.minepi.com/v2";

/* =========================
   PI HEADERS
========================= */
function getHeaders() {
  return {
    Authorization: `Key ${PI_API_KEY}`,
    "Content-Type": "application/json"
  };
}

/* =========================
   FETCH PAYMENT FROM PI
========================= */
async function fetchPayment(paymentId) {
  try {
    const res = await axios.get(
      `${PI_BASE_URL}/payments/${paymentId}`,
      { headers: getHeaders() }
    );

    return res.data;

  } catch (err) {
    console.error("❌ Pi fetch error:", err.response?.data || err.message);
    return null;
  }
}

/* =========================
   VERIFY PAYMENT STATUS
========================= */
async function verifyPayment(paymentId) {
  const payment = await fetchPayment(paymentId);

  if (!payment) return null;

  // STRICT VALIDATION (IMPORTANT FOR SECURITY)
  const validStatuses = ["created", "approved", "completed"];

  if (!validStatuses.includes(payment.status)) {
    console.warn("⚠ Invalid Pi payment status:", payment.status);
    return null;
  }

  return {
    id: payment.identifier,
    status: payment.status,
    amount: payment.amount,
    memo: payment.memo,
    metadata: payment.metadata,
    user: payment.user_uid
  };
}

/* =========================
   CONFIRM COMPLETION SAFELY
========================= */
async function confirmPaymentCompletion(paymentId) {
  const payment = await fetchPayment(paymentId);

  if (!payment) return false;

  return payment.status === "completed";
}

module.exports = {
  verifyPayment,
  fetchPayment,
  confirmPaymentCompletion
};