const API_BASE = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("bts_token");
}

function getUser() {
  const raw = localStorage.getItem("bts_user");
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem("bts_token", token);
  localStorage.setItem("bts_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("bts_token");
  localStorage.removeItem("bts_user");
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

function requireRole(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    window.location.href = "index.html";
  }
  return user;
}

function money(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
}

function badgeForStatus(status) {
  const val = (status || "").toUpperCase();
  if (val.includes("SUCCESS") || val.includes("ACTIVE") || val.includes("VERIFIED")) return "success";
  if (val.includes("PENDING") || val.includes("INITIATED")) return "warning";
  return "danger";
}

window.BTS = {
  api,
  saveSession,
  getUser,
  logout,
  requireRole,
  money,
  badgeForStatus
};
