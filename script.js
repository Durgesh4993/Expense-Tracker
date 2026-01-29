// Expense Tracker with Charts (No external libraries)
// LocalStorage enabled

const form = document.getElementById("transactionForm");
const titleEl = document.getElementById("title");
const amountEl = document.getElementById("amount");
const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");

const listEl = document.getElementById("transactionsList");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAllBtn");

const balanceText = document.getElementById("balanceText");
const incomeText = document.getElementById("incomeText");
const expenseText = document.getElementById("expenseText");

const barCanvas = document.getElementById("barChart");
const pieCanvas = document.getElementById("pieChart");
const barCtx = barCanvas.getContext("2d");
const pieCtx = pieCanvas.getContext("2d");

const STORAGE_KEY = "expense-tracker-transactions-v1";

let transactions = loadTransactions();

// Set default date today
(function setDefaultDate() {
  const today = new Date();
  dateEl.value = today.toISOString().slice(0, 10);
})();

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatMoney(n) {
  const val = Number(n || 0);
  return "₹" + val.toLocaleString("en-IN");
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function addTransaction(tx) {
  transactions.unshift(tx);
  saveTransactions();
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  render();
}

function clearAll() {
  if (!confirm("Clear all transactions?")) return;
  transactions = [];
  saveTransactions();
  render();
}

function getTotals(filteredTx = transactions) {
  const income = filteredTx
    .filter(t => t.type === "income")
    .reduce((a, b) => a + b.amount, 0);

  const expense = filteredTx
    .filter(t => t.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  const balance = income - expense;

  return { income, expense, balance };
}

function filterTransactions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return transactions;
  return transactions.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q) ||
    t.type.toLowerCase().includes(q)
  );
}

function renderTransactions(items) {
  listEl.innerHTML = "";

  if (!items.length) {
    listEl.innerHTML = `
      <div class="item">
        <div class="item-left">
          <div class="badge">No transactions found</div>
          <div class="meta">Add your first income or expense ✨</div>
        </div>
      </div>
    `;
    return;
  }

  items.forEach(t => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="item-left">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <strong>${escapeHtml(t.title)}</strong>
          <span class="badge">${escapeHtml(t.category)}</span>
          <span class="badge">${t.type.toUpperCase()}</span>
        </div>
        <div class="meta">${escapeHtml(t.date)}</div>
      </div>

      <div class="item-actions">
        <div class="amount ${t.type}">
          ${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}
        </div>
        <button class="icon-btn" title="Delete">🗑</button>
      </div>
    `;

    div.querySelector("button").addEventListener("click", () => deleteTransaction(t.id));
    listEl.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- CHARTS ---------------- */

// helper
function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBarChart(income, expense) {
  clearCanvas(barCtx, barCanvas);

  const ctx = barCtx;
  const W = barCanvas.width;
  const H = barCanvas.height;

  // background
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  drawRoundedRect(ctx, 0, 0, W, H, 18);
  ctx.fill();

  const max = Math.max(income, expense, 1);
  const pad = 60;
  const chartH = H - pad * 1.4;
  const baseY = H - pad;

  // labels
  ctx.fillStyle = "rgba(233,238,252,0.9)";
  ctx.font = "14px system-ui";
  ctx.fillText("Income", pad + 40, H - 22);
  ctx.fillText("Expense", W - pad - 90, H - 22);

  // axis
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, baseY);
  ctx.lineTo(W - pad, baseY);
  ctx.stroke();

  // bars
  const barW = 120;
  const gap = 140;

  const incomeH = Math.round((income / max) * chartH);
  const expenseH = Math.round((expense / max) * chartH);

  // income bar
  ctx.fillStyle = "rgba(34,197,94,0.85)";
  drawRoundedRect(ctx, pad + 10, baseY - incomeH, barW, incomeH, 16);
  ctx.fill();

  // expense bar
  ctx.fillStyle = "rgba(239,68,68,0.85)";
  drawRoundedRect(ctx, pad + 10 + barW + gap, baseY - expenseH, barW, expenseH, 16);
  ctx.fill();

  // values
  ctx.fillStyle = "rgba(233,238,252,0.9)";
  ctx.font = "bold 14px system-ui";
  ctx.fillText(formatMoney(income), pad + 10, baseY - incomeH - 12);
  ctx.fillText(formatMoney(expense), pad + 10 + barW + gap, baseY - expenseH - 12);
}

function drawPieChart(expensesByCategory) {
  clearCanvas(pieCtx, pieCanvas);

  const ctx = pieCtx;
  const W = pieCanvas.width;
  const H = pieCanvas.height;

  // background
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  drawRoundedRect(ctx, 0, 0, W, H, 18);
  ctx.fill();

  const entries = Object.entries(expensesByCategory)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((a, [, v]) => a + v, 0);

  if (!entries.length) {
    ctx.fillStyle = "rgba(233,238,252,0.8)";
    ctx.font = "14px system-ui";
    ctx.fillText("No expense data to show.", 24, 50);
    return;
  }

  const cx = 170;
  const cy = H / 2;
  const r = 105;

  let start = -Math.PI / 2;

  // slice colors (soft)
  const colors = [
    "rgba(91,124,250,0.85)",
    "rgba(34,197,94,0.85)",
    "rgba(245,158,11,0.85)",
    "rgba(236,72,153,0.85)",
    "rgba(56,189,248,0.85)",
    "rgba(168,85,247,0.85)",
    "rgba(239,68,68,0.85)",
    "rgba(148,163,184,0.85)"
  ];

  entries.forEach(([cat, value], idx) => {
    const angle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = colors[idx % colors.length];
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fill();

    start += angle;
  });

  // donut hole
  ctx.beginPath();
  ctx.fillStyle = "rgba(15,26,48,0.95)";
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(233,238,252,0.9)";
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Expense", cx, cy - 6);
  ctx.font = "12px system-ui";
  ctx.fillText(formatMoney(total), cx, cy + 14);

  // legend
  ctx.textAlign = "left";
  ctx.font = "13px system-ui";
  let lx = 320;
  let ly = 60;

  entries.slice(0, 7).forEach(([cat, value], idx) => {
    const pct = Math.round((value / total) * 100);

    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(lx, ly - 10, 12, 12);

    ctx.fillStyle = "rgba(233,238,252,0.9)";
    ctx.fillText(`${cat} - ${pct}% (${formatMoney(value)})`, lx + 18, ly);

    ly += 28;
  });
}

/* ---------------- RENDER ---------------- */

function render() {
  const query = searchInput.value || "";
  const filtered = filterTransactions(query);

  // totals from all transactions (not filtered)
  const totals = getTotals(transactions);

  balanceText.textContent = formatMoney(totals.balance);
  incomeText.textContent = formatMoney(totals.income);
  expenseText.textContent = formatMoney(totals.expense);

  renderTransactions(filtered);

  // charts data: overall (not filtered)
  drawBarChart(totals.income, totals.expense);

  // category expenses
  const categoryTotals = {};
  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  drawPieChart(categoryTotals);
}

/* ---------------- EVENTS ---------------- */

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleEl.value.trim();
  const amount = Number(amountEl.value);
  const type = typeEl.value;
  const category = categoryEl.value;
  const date = dateEl.value;

  if (!title || !amount || amount <= 0 || !date) {
    alert("Please enter valid transaction details.");
    return;
  }

  const tx = {
    id: uid(),
    title,
    amount,
    type,
    category,
    date
  };

  addTransaction(tx);

  // reset fields
  titleEl.value = "";
  amountEl.value = "";
  typeEl.value = "income";
  categoryEl.value = "Salary";
  dateEl.value = new Date().toISOString().slice(0, 10);

  titleEl.focus();
});

searchInput.addEventListener("input", render);
clearAllBtn.addEventListener("click", clearAll);

// initial render
render();
