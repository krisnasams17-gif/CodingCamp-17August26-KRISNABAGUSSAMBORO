const STORAGE_KEY = "sefc-expenses-v1";
const CATEGORY_KEY = "sefc-categories-v1";
const THEME_KEY = "sefc-theme-v1";

let transactions = loadTransactions();
let categories = loadCategories();
let chart = null;

const expenseForm = document.getElementById("expenseForm");
const itemNameInput = document.getElementById("itemName");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const customCategoryInput = document.getElementById("customCategory");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const formMessage = document.getElementById("formMessage");
const transactionList = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const totalBalance = document.getElementById("totalBalance");
const transactionCount = document.getElementById("transactionCount");
const sortBy = document.getElementById("sortBy");
const monthlySummary = document.getElementById("monthlySummary");
const themeToggle = document.getElementById("themeToggle");
const chartCanvas = document.getElementById("expenseChart");
const chartEmpty = document.getElementById("chartEmpty");

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_KEY));
    return Array.isArray(saved) && saved.length
      ? saved
      : ["Food", "Transport", "Fun"];
  } catch {
    return ["Food", "Transport", "Fun"];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function showMessage(message = "") {
  formMessage.textContent = message;
}

function renderCategoryOptions() {
  const currentValue = categorySelect.value;

  categorySelect.innerHTML = `
    <option value="">Pilih kategori</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
  `;

  if (categories.includes(currentValue)) {
    categorySelect.value = currentValue;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addTransaction(event) {
  event.preventDefault();
  showMessage("");

  const name = itemNameInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categorySelect.value;

  if (!name || !amount || amount <= 0 || !category) {
    showMessage("Semua field wajib diisi dengan benar.");
    return;
  }

  transactions.push({
    id: Date.now(),
    name,
    amount,
    category,
    date: new Date().toISOString()
  });

  saveTransactions();
  expenseForm.reset();
  showMessage("Transaksi berhasil ditambahkan.");
  renderAll();
}

function deleteTransaction(id) {
  transactions = transactions.filter(transaction => transaction.id !== id);
  saveTransactions();
  renderAll();
}

function getSortedTransactions() {
  const result = [...transactions];

  switch (sortBy.value) {
    case "amountDesc":
      return result.sort((a, b) => b.amount - a.amount);
    case "amountAsc":
      return result.sort((a, b) => a.amount - b.amount);
    case "category":
      return result.sort((a, b) => a.category.localeCompare(b.category));
    case "newest":
    default:
      return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

function renderTransactions() {
  const sorted = getSortedTransactions();

  transactionList.innerHTML = sorted.map(transaction => `
    <article class="transaction-item">
      <div>
        <div class="transaction-name">${escapeHtml(transaction.name)}</div>
        <p class="transaction-meta">${escapeHtml(transaction.category)} • ${new Date(transaction.date).toLocaleDateString("id-ID")}</p>
      </div>
      <div class="transaction-amount">${formatRupiah(transaction.amount)}</div>
      <button class="delete-button" type="button" data-id="${transaction.id}" aria-label="Hapus ${escapeHtml(transaction.name)}">Hapus</button>
    </article>
  `).join("");

  emptyState.style.display = transactions.length ? "none" : "block";
}

function renderBalance() {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  totalBalance.textContent = formatRupiah(total);
  transactionCount.textContent = `${transactions.length} transaksi`;
}

function renderChart() {
  const totals = {};

  transactions.forEach(transaction => {
    totals[transaction.category] = (totals[transaction.category] || 0) + transaction.amount;
  });

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (!labels.length) {
    chartCanvas.style.display = "none";
    chartEmpty.style.display = "block";
    return;
  }

  chartCanvas.style.display = "block";
  chartEmpty.style.display = "none";

  chart = new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: context => `${context.label}: ${formatRupiah(context.raw)}`
          }
        }
      }
    }
  });
}

function renderMonthlySummary() {
  const months = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + transaction.amount;
  });

  const entries = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));

  monthlySummary.innerHTML = entries.length
    ? entries.map(([month, amount]) => {
        const [year, monthNumber] = month.split("-");
        const label = new Date(Number(year), Number(monthNumber) - 1, 1)
          .toLocaleDateString("id-ID", { month: "long", year: "numeric" });

        return `
          <div class="summary-row">
            <span class="summary-month">${label}</span>
            <span class="summary-amount">${formatRupiah(amount)}</span>
          </div>
        `;
      }).join("")
    : `<p class="subtitle">Belum ada ringkasan karena belum ada transaksi.</p>`;
}

function addCustomCategory() {
  const newCategory = customCategoryInput.value.trim();

  if (!newCategory) {
    showMessage("Tulis nama kategori terlebih dahulu.");
    return;
  }

  if (categories.some(category => category.toLowerCase() === newCategory.toLowerCase())) {
    showMessage("Kategori tersebut sudah ada.");
    return;
  }

  categories.push(newCategory);
  saveCategories();
  renderCategoryOptions();
  categorySelect.value = newCategory;
  customCategoryInput.value = "";
  showMessage(`Kategori "${newCategory}" berhasil ditambahkan.`);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
}

function renderAll() {
  renderBalance();
  renderTransactions();
  renderChart();
  renderMonthlySummary();
}

expenseForm.addEventListener("submit", addTransaction);

addCategoryBtn.addEventListener("click", addCustomCategory);

sortBy.addEventListener("change", renderTransactions);

themeToggle.addEventListener("click", toggleTheme);

transactionList.addEventListener("click", event => {
  const button = event.target.closest(".delete-button");
  if (!button) return;

  deleteTransaction(Number(button.dataset.id));
});

loadTheme();
renderCategoryOptions();
renderAll();
