const axios = require("axios");

const PI_BASE_URL = "https://api.minepi.com/v2";

/* =========================
   FETCH PAYMENT FROM PI
========================= */
async function fetchPayment(paymentId, accessToken) {
  if (!paymentId || !accessToken) return null;

  try {
    const res = await axios.get(
      `${PI_BASE_URL}/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 15000
      }
    );

    return res.data || null;

  } catch (err) {
    console.error(
      "❌ Pi fetch error:",
      err.response?.data || err.message
    );
    return null;
  }
}

/* =========================
   NORMALIZE PAYMENT DATA
========================= */
function normalizePayment(payment) {
  if (!payment) return null;

  return {
    id: payment.identifier || null,
    status: payment.status || null,
    amount: payment.amount || 0,
    memo: payment.memo || "",
    metadata: payment.metadata || {},
    user_uid: payment.user_uid || null,
    txid: payment.transaction_id || null,
    raw: payment
  };
}

/* =========================
   VERIFY PAYMENT (STRICT + SAFE)
========================= */
async function verifyPayment(paymentId, accessToken) {
  const payment = await fetchPayment(paymentId, accessToken);

  if (!payment) return null;

  const normalized = normalizePayment(payment);

  // STRICT STATUS VALIDATION (IMPORTANT)
  const validStatuses = [
    "created",
    "pending",
    "approved",
    "completed"
  ];

  if (!validStatuses.includes(normalized.status)) {
    console.warn(
      "⚠ Invalid Pi status:",
      normalized.status
    );
    return null;
  }

  // EXTRA SAFETY CHECK
  if (!normalized.id || !normalized.amount) {
    console.warn("⚠ Incomplete Pi payment data");
    return null;
  }

  return normalized;
}

/* =========================
   CONFIRM COMPLETION
========================= */
async function confirmPaymentCompletion(paymentId, accessToken) {
  const payment = await fetchPayment(paymentId, accessToken);

  if (!payment) return false;

  return payment.status === "completed";
}

module.exports = {
  fetchPayment,
  verifyPayment,
  confirmPaymentCompletion
};