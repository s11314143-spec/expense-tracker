(() => {
  "use strict";

  const STORAGE_KEYS = {
    transactions: "daily_ledger_transactions_v1",
    budgets: "daily_ledger_budgets_v1",
    theme: "daily_ledger_theme_v1"
  };

  const CATEGORIES = {
    expense: [
      { id: "food", name: "餐飲", icon: "🍜", color: "#f97316" },
      { id: "transport", name: "交通", icon: "🚇", color: "#3b82f6" },
      { id: "shopping", name: "購物", icon: "🛍️", color: "#ec4899" },
      { id: "housing", name: "居住", icon: "🏠", color: "#8b5cf6" },
      { id: "entertainment", name: "娛樂", icon: "🎬", color: "#14b8a6" },
      { id: "medical", name: "醫療", icon: "💊", color: "#ef4444" },
      { id: "education", name: "學習", icon: "📚", color: "#eab308" },
      { id: "other_exp", name: "其他", icon: "📦", color: "#64748b" }
    ],
    income: [
      { id: "salary", name: "薪資", icon: "💼", color: "#10b981" },
      { id: "bonus", name: "獎金", icon: "🎁", color: "#06b6d4" },
      { id: "invest", name: "投資", icon: "📈", color: "#6366f1" },
      { id: "side", name: "副業", icon: "🛠️", color: "#84cc16" },
      { id: "refund", name: "回饋", icon: "🪙", color: "#f59e0b" },
      { id: "other_inc", name: "其他", icon: "✨", color: "#64748b" }
    ]
  };

  const todayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const monthKeyFromDate = (dateStr) => dateStr.slice(0, 7);

  const currentMonthKey = () => monthKeyFromDate(todayStr());

  const formatMoney = (amount) =>
    `NT$ ${Math.round(Number(amount) || 0).toLocaleString("zh-TW")}`;

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const getCategoryMeta = (type, categoryId) => {
    const list = CATEGORIES[type] || [];
    return (
      list.find((c) => c.id === categoryId) || {
        id: categoryId,
        name: "未分類",
        icon: "📌",
        color: "#64748b"
      }
    );
  };

  const loadJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const state = {
    transactions: loadJson(STORAGE_KEYS.transactions, []),
    budgets: loadJson(STORAGE_KEYS.budgets, {}),
    selectedMonth: currentMonthKey(),
    showAllPeriods: false,
    formType: "expense",
    selectedCategory: "food",
    chartType: "expense",
    lastDeleted: null,
    toastTimer: null
  };

  // DOM 元素參照
  const el = {
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    currentPeriodBtn: document.getElementById("currentPeriodBtn"),
    toggleAllPeriodBtn: document.getElementById("toggleAllPeriodBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    backupBtn: document.getElementById("backupBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),

    balancePeriodLabel: document.getElementById("balancePeriodLabel"),
    savingRateBadge: document.getElementById("savingRateBadge"),
    netBalanceValue: document.getElementById("netBalanceValue"),
    transactionCountHint: document.getElementById("transactionCountHint"),
    totalIncomeValue: document.getElementById("totalIncomeValue"),
    incomeCountHint: document.getElementById("incomeCountHint"),
    totalExpenseValue: document.getElementById("totalExpenseValue"),
    expenseCountHint: document.getElementById("expenseCountHint"),

    editBudgetBtn: document.getElementById("editBudgetBtn"),
    budgetRemainingValue: document.getElementById("budgetRemainingValue"),
    budgetTargetText: document.getElementById("budgetTargetText"),
    budgetProgressBar: document.getElementById("budgetProgressBar"),
    budgetProgressFill: document.getElementById("budgetProgressFill"),
    budgetHint: document.getElementById("budgetHint"),

    formTitle: document.getElementById("formTitle"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    entryForm: document.getElementById("entryForm"),
    editingId: document.getElementById("editingId"),
    typeButtons: document.querySelectorAll(".type-btn"),
    amountInput: document.getElementById("amountInput"),
    categoryGrid: document.getElementById("categoryGrid"),
    dateInput: document.getElementById("dateInput"),
    paymentSelect: document.getElementById("paymentSelect"),
    noteInput: document.getElementById("noteInput"),
    formError: document.getElementById("formError"),
    submitEntryBtn: document.getElementById("submitEntryBtn"),
    loadSampleBtn: document.getElementById("loadSampleBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),

    donutTitle: document.getElementById("donutTitle"),
    miniTabs: document.querySelectorAll(".mini-tab"),
    donutContainer: document.getElementById("donutContainer"),
    categoryLegend: document.getElementById("categoryLegend"),
    trendTitle: document.getElementById("trendTitle"),
    trendContainer: document.getElementById("trendContainer"),

    searchInput: document.getElementById("searchInput"),
    filterTypeSelect: document.getElementById("filterTypeSelect"),
    filterCategorySelect: document.getElementById("filterCategorySelect"),
    filterPaymentSelect: document.getElementById("filterPaymentSelect"),
    sortSelect: document.getElementById("sortSelect"),
    transactionList: document.getElementById("transactionList"),

    budgetDialog: document.getElementById("budgetDialog"),
    budgetForm: document.getElementById("budgetForm"),
    budgetInput: document.getElementById("budgetInput"),
    closeBudgetDialog: document.getElementById("closeBudgetDialog"),

    backupDialog: document.getElementById("backupDialog"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput"),
    closeBackupDialog: document.getElementById("closeBackupDialog"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage"),
    toastUndoBtn: document.getElementById("toastUndoBtn")
  };

  // 主題設定
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  };

  const initTheme = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  };

  // Toast 通知
  const showToast = (message, canUndo = false) => {
    el.toastMessage.textContent = message;
    el.toastUndoBtn.classList.toggle("hidden", !canUndo);
    el.toast.classList.add("visible");

    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.toast.classList.remove("visible");
    }, canUndo ? 5000 : 2800);
  };

  // 期間處理
  const shiftMonth = (monthKey, delta) => {
    const [y, m] = monthKey.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const formatMonthLabel = (monthKey) => {
    const [y, m] = monthKey.split("-");
    return `${y}年 ${Number(m)}月`;
  };

  const getPeriodTransactions = () => {
    if (state.showAllPeriods) return state.transactions;
    return state.transactions.filter((tx) => monthKeyFromDate(tx.date) === state.selectedMonth);
  };

  // 表單分類渲染
  const renderCategoryGrid = () => {
    const cats = CATEGORIES[state.formType];
    if (!cats.some((c) => c.id === state.selectedCategory)) {
      state.selectedCategory = cats[0].id;
    }

    el.categoryGrid.innerHTML = cats
      .map((cat) => {
        const selected = cat.id === state.selectedCategory ? "selected" : "";
        return `
          <button
            type="button"
            class="cat-chip ${selected}"
            data-cat-id="${cat.id}"
            aria-checked="${cat.id === state.selectedCategory}"
            role="radio"
          >
            <span class="cat-icon" aria-hidden="true">${cat.icon}</span>
            <span>${escapeHtml(cat.name)}</span>
          </button>
        `;
      })
      .join("");
  };

  // 更新分類篩選下拉選項
  const renderCategoryFilterOptions = () => {
    const current = el.filterCategorySelect.value;
    const allCats = [
      ...CATEGORIES.expense.map((c) => ({ ...c, group: "支出" })),
      ...CATEGORIES.income.map((c) => ({ ...c, group: "收入" }))
    ];

    el.filterCategorySelect.innerHTML =
      `<option value="all">全部分類</option>` +
      allCats
        .map((c) => `<option value="${c.id}">${c.icon} ${c.name} (${c.group})</option>`)
        .join("");

    if ([...el.filterCategorySelect.options].some((o) => o.value === current)) {
      el.filterCategorySelect.value = current;
    }
  };

  // 切換表單收支類型
  const setFormType = (type) => {
    state.formType = type;
    el.typeButtons.forEach((btn) => {
      const active = btn.dataset.type === type;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", String(active));
    });
    renderCategoryGrid();
  };

  const resetForm = () => {
    el.editingId.value = "";
    el.formTitle.textContent = "新增紀錄";
    el.submitEntryBtn.textContent = "加入記帳本";
    el.cancelEditBtn.classList.add("hidden");
    el.amountInput.value = "";
    el.noteInput.value = "";
    el.dateInput.value = todayStr();
    el.paymentSelect.value = "現金";
    el.formError.classList.add("hidden");
    setFormType("expense");
  };

  // 摘要統計與預算
  const renderSummary = (periodTxs) => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const tx of periodTxs) {
      if (tx.type === "income") {
        income += tx.amount;
        incomeCount += 1;
      } else {
        expense += tx.amount;
        expenseCount += 1;
      }
    }

    const net = income - expense;
    el.balancePeriodLabel.textContent = state.showAllPeriods ? "累計總結餘" : `${formatMonthLabel(state.selectedMonth)} 結餘`;
    el.netBalanceValue.textContent = `${net < 0 ? "-" : ""}${formatMoney(Math.abs(net))}`;
    el.netBalanceValue.classList.toggle("positive", net > 0);
    el.netBalanceValue.classList.toggle("negative", net < 0);
    el.transactionCountHint.textContent = `共 ${periodTxs.length} 筆紀錄`;

    el.totalIncomeValue.textContent = formatMoney(income);
    el.incomeCountHint.textContent = `${incomeCount} 筆收入`;
    el.totalExpenseValue.textContent = formatMoney(expense);
    el.expenseCountHint.textContent = `${expenseCount} 筆支出`;

    if (income > 0) {
      const rate = Math.round(((income - expense) / income) * 100);
      el.savingRateBadge.textContent = `儲蓄率 ${rate}%`;
    } else {
      el.savingRateBadge.textContent = "儲蓄率 --";
    }

    // 預算進度（以目前選擇月份計算）
    const targetMonth = state.selectedMonth;
    const monthExpense = state.transactions
      .filter((tx) => tx.type === "expense" && monthKeyFromDate(tx.date) === targetMonth)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const budget = Number(state.budgets[targetMonth] || 0);

    el.budgetProgressFill.classList.remove("warn", "over");

    if (budget <= 0) {
      el.budgetRemainingValue.textContent = "尚未設定";
      el.budgetTargetText.textContent = "";
      el.budgetProgressFill.style.width = "0%";
      el.budgetProgressBar.setAttribute("aria-valuenow", "0");
      el.budgetHint.textContent = `${formatMonthLabel(targetMonth)} 尚未設定支出上限`;
      return;
    }

    const remaining = budget - monthExpense;
    const pct = Math.min(100, Math.round((monthExpense / budget) * 100));

    el.budgetTargetText.textContent = `/ ${formatMoney(budget)}`;
    el.budgetProgressFill.style.width = `${pct}%`;
    el.budgetProgressBar.setAttribute("aria-valuenow", String(pct));

    if (remaining < 0) {
      el.budgetRemainingValue.textContent = `超支 ${formatMoney(Math.abs(remaining))}`;
      el.budgetRemainingValue.style.color = "var(--expense)";
      el.budgetProgressFill.classList.add("over");
      el.budgetHint.textContent = `${formatMonthLabel(targetMonth)} 已超過預算 ${Math.round((monthExpense / budget) * 100 - 100)}%`;
    } else {
      el.budgetRemainingValue.textContent = `剩 ${formatMoney(remaining)}`;
      el.budgetRemainingValue.style.color = "";
      if (pct >= 80) el.budgetProgressFill.classList.add("warn");
      el.budgetHint.textContent = `${formatMonthLabel(targetMonth)} 已使用 ${pct}% 預算`;
    }
  };

  // SVG 圓環圖
  const renderDonutChart = (periodTxs) => {
    const type = state.chartType;
    el.donutTitle.textContent = type === "expense" ? "支出分類佔比" : "收入分類佔比";

    const filtered = periodTxs.filter((tx) => tx.type === type);
    const total = filtered.reduce((sum, tx) => sum + tx.amount, 0);

    if (total <= 0) {
      el.donutContainer.innerHTML = `<div class="empty-chart">暫無${type === "expense" ? "支出" : "收入"}資料</div>`;
      el.categoryLegend.innerHTML = "";
      return;
    }

    const grouped = new Map();
    for (const tx of filtered) {
      grouped.set(tx.category, (grouped.get(tx.category) || 0) + tx.amount);
    }

    const entries = [...grouped.entries()]
      .map(([catId, amount]) => ({
        ...getCategoryMeta(type, catId),
        amount,
        ratio: amount / total
      }))
      .sort((a, b) => b.amount - a.amount);

    const size = 156;
    const cx = size / 2;
    const cy = size / 2;
    const r = 54;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    const segments = entries
      .map((item) => {
        const dash = item.ratio * circumference;
        const gap = circumference - dash;
        const circle = `
          <circle
            cx="${cx}"
            cy="${cy}"
            r="${r}"
            fill="transparent"
            stroke="${item.color}"
            stroke-width="22"
            stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
            stroke-dashoffset="${(-offset).toFixed(2)}"
            transform="rotate(-90 ${cx} ${cy})"
          >
            <title>${escapeHtml(item.name)}: ${formatMoney(item.amount)} (${Math.round(item.ratio * 100)}%)</title>
          </circle>
        `;
        offset += dash;
        return circle;
      })
      .join("");

    el.donutContainer.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${el.donutTitle.textContent}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="var(--surface-alt)" stroke-width="22" />
        ${segments}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${type === "expense" ? "總支出" : "總收入"}</text>
        <text x="${cx}" y="${cy + 15}" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="700">NT$ ${Math.round(total).toLocaleString("zh-TW")}</text>
      </svg>
    `;

    el.categoryLegend.innerHTML = entries
      .map(
        (item) => `
        <li class="legend-item">
          <span class="legend-swatch" style="background:${item.color}"></span>
          <span class="legend-name">${item.icon} ${escapeHtml(item.name)} (${Math.round(item.ratio * 100)}%)</span>
          <span class="legend-value">${formatMoney(item.amount)}</span>
        </li>
      `
      )
      .join("");
  };

  // SVG 收支趨勢長條圖
  const renderTrendChart = (periodTxs) => {
    if (periodTxs.length === 0) {
      el.trendTitle.textContent = state.showAllPeriods ? "每月收支趨勢" : "每日收支趨勢";
      el.trendContainer.innerHTML = `<div class="empty-chart">新增交易後將自動繪製趨勢圖</div>`;
      return;
    }

    const bucketMap = new Map();
    if (state.showAllPeriods) {
      el.trendTitle.textContent = "每月收支趨勢";
      for (const tx of periodTxs) {
        const key = monthKeyFromDate(tx.date);
        const cur = bucketMap.get(key) || { label: key.slice(2), income: 0, expense: 0 };
        cur[tx.type] += tx.amount;
        bucketMap.set(key, cur);
      }
    } else {
      el.trendTitle.textContent = `${formatMonthLabel(state.selectedMonth)} 每日趨勢`;
      const [y, m] = state.selectedMonth.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d += 1) {
        const key = `${state.selectedMonth}-${String(d).padStart(2, "0")}`;
        bucketMap.set(key, { label: String(d), income: 0, expense: 0 });
      }
      for (const tx of periodTxs) {
        const cur = bucketMap.get(tx.date);
        if (cur) cur[tx.type] += tx.amount;
      }
    }

    const buckets = [...bucketMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const maxVal = Math.max(
      1,
      ...buckets.map((b) => Math.max(b.income, b.expense))
    );

    const width = 460;
    const height = 185;
    const padX = 12;
    const padTop = 14;
    const padBottom = 24;
    const plotH = height - padTop - padBottom;
    const slotW = (width - padX * 2) / buckets.length;
    const barW = Math.max(2, Math.min(12, slotW * 0.36));

    const labelStep = buckets.length > 16 ? 5 : buckets.length > 10 ? 2 : 1;

    const bars = buckets
      .map((b, idx) => {
        const xCenter = padX + slotW * idx + slotW / 2;
        const incH = (b.income / maxVal) * plotH;
        const expH = (b.expense / maxVal) * plotH;
        const showLabel = idx % labelStep === 0 || idx === buckets.length - 1;

        return `
          <g>
            ${
              b.income > 0
                ? `<rect x="${(xCenter - barW - 0.5).toFixed(1)}" y="${(padTop + plotH - incH).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, incH).toFixed(1)}" rx="2" fill="var(--income)">
                    <title>${escapeHtml(b.label)} 收入: ${formatMoney(b.income)}</title>
                  </rect>`
                : ""
            }
            ${
              b.expense > 0
                ? `<rect x="${(xCenter + 0.5).toFixed(1)}" y="${(padTop + plotH - expH).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, expH).toFixed(1)}" rx="2" fill="var(--expense)">
                    <title>${escapeHtml(b.label)} 支出: ${formatMoney(b.expense)}</title>
                  </rect>`
                : ""
            }
            ${
              showLabel
                ? `<text x="${xCenter.toFixed(1)}" y="${height - 6}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${escapeHtml(b.label)}</text>`
                : ""
            }
          </g>
        `;
      })
      .join("");

    el.trendContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="190" role="img" aria-label="${el.trendTitle.textContent}">
        <line x1="${padX}" y1="${padTop + plotH}" x2="${width - padX}" y2="${padTop + plotH}" stroke="var(--border)" stroke-width="1" />
        ${bars}
      </svg>
    `;
  };

  // 明細篩選與排序
  const getFilteredTransactions = (periodTxs) => {
    const q = el.searchInput.value.trim().toLowerCase();
    const typeFilter = el.filterTypeSelect.value;
    const catFilter = el.filterCategorySelect.value;
    const payFilter = el.filterPaymentSelect.value;
    const sortBy = el.sortSelect.value;

    const list = periodTxs.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (catFilter !== "all" && tx.category !== catFilter) return false;
      if (payFilter !== "all" && tx.payment !== payFilter) return false;
      if (q) {
        const catName = getCategoryMeta(tx.type, tx.category).name.toLowerCase();
        const note = (tx.note || "").toLowerCase();
        const payment = (tx.payment || "").toLowerCase();
        if (!catName.includes(q) && !note.includes(q) && !payment.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "date-desc") return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
      if (sortBy === "date-asc") return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return 0;
    });

    return list;
  };

  const renderTransactionList = (periodTxs) => {
    const items = getFilteredTransactions(periodTxs);

    if (items.length === 0) {
      el.transactionList.innerHTML = `
        <div class="empty-state">
          <strong>目前沒有符合條件的紀錄</strong>
          <p>可以在左側表單新增一筆收支，或點擊「載入範例資料」體驗功能。</p>
        </div>
      `;
      return;
    }

    const sortBy = el.sortSelect.value;
    const groupByDate = sortBy === "date-desc" || sortBy === "date-asc";

    if (!groupByDate) {
      el.transactionList.innerHTML = `<div class="date-group-items">${items.map(renderTxRow).join("")}</div>`;
      return;
    }

    const groups = new Map();
    for (const tx of items) {
      if (!groups.has(tx.date)) groups.set(tx.date, []);
      groups.get(tx.date).push(tx);
    }

    el.transactionList.innerHTML = [...groups.entries()]
      .map(([date, txs]) => {
        const dayNet = txs.reduce((s, tx) => s + (tx.type === "income" ? tx.amount : -tx.amount), 0);
        const netText = `${dayNet >= 0 ? "+" : "-"}${formatMoney(Math.abs(dayNet))}`;
        return `
          <div class="date-group">
            <div class="date-group-header">
              <span>${date}</span>
              <span>當日淨額：${netText}</span>
            </div>
            <div class="date-group-items">
              ${txs.map(renderTxRow).join("")}
            </div>
          </div>
        `;
      })
      .join("");
  };

  const renderTxRow = (tx) => {
    const meta = getCategoryMeta(tx.type, tx.category);
    const title = tx.note ? escapeHtml(tx.note) : escapeHtml(meta.name);
    const sign = tx.type === "income" ? "+" : "-";
    return `
      <div class="tx-row" data-id="${escapeHtml(tx.id)}">
        <div class="tx-icon" aria-hidden="true">${meta.icon}</div>
        <div class="tx-main">
          <div class="tx-title">${title}</div>
          <div class="tx-meta">
            <span>${escapeHtml(meta.name)}</span>
            <span>•</span>
            <span>${escapeHtml(tx.payment || "現金")}</span>
            <span>•</span>
            <span>${escapeHtml(tx.date)}</span>
          </div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}${formatMoney(tx.amount)}</div>
        <div class="tx-actions">
          <button type="button" class="row-btn edit" data-action="edit" data-id="${escapeHtml(tx.id)}">編輯</button>
          <button type="button" class="row-btn delete" data-action="delete" data-id="${escapeHtml(tx.id)}">刪除</button>
        </div>
      </div>
    `;
  };

  const renderAll = () => {
    el.currentPeriodBtn.textContent = state.showAllPeriods
      ? "全部期間"
      : formatMonthLabel(state.selectedMonth);
    el.prevMonthBtn.disabled = state.showAllPeriods;
    el.nextMonthBtn.disabled = state.showAllPeriods;
    el.toggleAllPeriodBtn.setAttribute("aria-pressed", String(state.showAllPeriods));
    el.toggleAllPeriodBtn.textContent = state.showAllPeriods ? "回到單月檢視" : "顯示全部期間";

    const periodTxs = getPeriodTransactions();
    renderSummary(periodTxs);
    renderDonutChart(periodTxs);
    renderTrendChart(periodTxs);
    renderTransactionList(periodTxs);
  };

  // 資料異動
  const persistTransactions = () => {
    saveJson(STORAGE_KEYS.transactions, state.transactions);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    el.formError.classList.add("hidden");

    const amount = Math.round(Number(el.amountInput.value));
    const date = el.dateInput.value;
    const payment = el.paymentSelect.value;
    const note = el.noteInput.value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      el.formError.textContent = "請輸入大於 0 的有效金額。";
      el.formError.classList.remove("hidden");
      el.amountInput.focus();
      return;
    }

    if (!date) {
      el.formError.textContent = "請選擇交易日期。";
      el.formError.classList.remove("hidden");
      el.dateInput.focus();
      return;
    }

    const editId = el.editingId.value;
    if (editId) {
      const idx = state.transactions.findIndex((t) => t.id === editId);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          type: state.formType,
          amount,
          category: state.selectedCategory,
          date,
          payment,
          note
        };
        persistTransactions();
        showToast("已更新記帳紀錄");
      }
    } else {
      const newTx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: state.formType,
        amount,
        category: state.selectedCategory,
        date,
        payment,
        note,
        createdAt: Date.now()
      };
      state.transactions.unshift(newTx);
      persistTransactions();
      if (!state.showAllPeriods) {
        state.selectedMonth = monthKeyFromDate(date);
      }
      showToast("已新增一筆記帳紀錄");
    }

    resetForm();
    renderAll();
  };

  const startEdit = (id) => {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;

    el.editingId.value = tx.id;
    el.formTitle.textContent = "編輯紀錄";
    el.submitEntryBtn.textContent = "儲存變更";
    el.cancelEditBtn.classList.remove("hidden");

    state.selectedCategory = tx.category;
    setFormType(tx.type);

    el.amountInput.value = String(tx.amount);
    el.dateInput.value = tx.date;
    el.paymentSelect.value = tx.payment || "現金";
    el.noteInput.value = tx.note || "";
    el.formError.classList.add("hidden");
    el.amountInput.focus();
  };

  const deleteTransaction = (id) => {
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const [removed] = state.transactions.splice(idx, 1);
    state.lastDeleted = { item: removed, index: idx };
    persistTransactions();

    if (el.editingId.value === id) resetForm();
    renderAll();
    showToast("已刪除該筆紀錄", true);
  };

  const undoDelete = () => {
    if (!state.lastDeleted) return;
    const { item, index } = state.lastDeleted;
    state.transactions.splice(Math.min(index, state.transactions.length), 0, item);
    state.lastDeleted = null;
    persistTransactions();
    renderAll();
    showToast("已復原刪除的紀錄");
  };

  // CSV 匯出 (含 UTF-8 BOM 以利 Windows Excel 正確顯示繁體中文)
  const exportCsv = () => {
    const items = getFilteredTransactions(getPeriodTransactions());
    if (items.length === 0) {
      showToast("目前沒有可匯出的資料");
      return;
    }

    const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["日期", "類型", "分類", "金額", "付款方式", "備註"];
    const rows = items.map((tx) => [
      tx.date,
      tx.type === "income" ? "收入" : "支出",
      getCategoryMeta(tx.type, tx.category).name,
      tx.amount,
      tx.payment || "現金",
      tx.note || ""
    ]);

    const csvText = "\uFEFF" + [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `記帳明細_${state.showAllPeriods ? "全部期間" : state.selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("已匯出 CSV 檔案");
  };

  // JSON 備份與還原
  const exportJsonBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: state.transactions,
      budgets: state.budgets
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `日常記帳本備份_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("已下載 JSON 備份檔");
  };

  const importJsonBackup = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.transactions)) {
        throw new Error("格式不正確");
      }

      const validTxs = data.transactions
        .filter(
          (tx) =>
            tx &&
            typeof tx.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(tx.date) &&
            (tx.type === "income" || tx.type === "expense") &&
            Number(tx.amount) > 0
        )
        .map((tx, idx) => ({
          id: String(tx.id || `imp_${Date.now()}_${idx}`),
          type: tx.type,
          amount: Math.round(Number(tx.amount)),
          category: String(tx.category || (tx.type === "income" ? "other_inc" : "other_exp")),
          date: tx.date,
          payment: String(tx.payment || "現金"),
          note: String(tx.note || ""),
          createdAt: Number(tx.createdAt) || Date.now()
        }));

      state.transactions = validTxs;
      if (data.budgets && typeof data.budgets === "object") {
        state.budgets = data.budgets;
      }

      persistTransactions();
      saveJson(STORAGE_KEYS.budgets, state.budgets);
      el.backupDialog.close();
      renderAll();
      showToast(`已成功還原 ${validTxs.length} 筆紀錄`);
    } catch {
      showToast("匯入失敗：請確認選擇的是有效的記帳備份 JSON 檔");
    }
  };

  const loadSampleData = () => {
    const m = state.selectedMonth;
    const samples = [
      { type: "income", amount: 52000, category: "salary", date: `${m}-05`, payment: "銀行轉帳", note: "本月薪資入帳" },
      { type: "expense", amount: 14500, category: "housing", date: `${m}-05`, payment: "銀行轉帳", note: "房租與水電管理費" },
      { type: "expense", amount: 1200, category: "transport", date: `${m}-06`, payment: "電子支付", note: "TPASS 月票儲值" },
      { type: "expense", amount: 265, category: "food", date: `${m}-08`, payment: "電子支付", note: "午餐健康餐盒與咖啡" },
      { type: "expense", amount: 1890, category: "shopping", date: `${m}-11`, payment: "信用卡", note: "日用品採購" },
      { type: "income", amount: 3200, category: "invest", date: `${m}-15`, payment: "銀行轉帳", note: "ETF 季配息" },
      { type: "expense", amount: 680, category: "entertainment", date: `${m}-17`, payment: "信用卡", note: "電影票與爆米花" },
      { type: "expense", amount: 420, category: "medical", date: `${m}-20`, payment: "現金", note: "牙科定期洗牙掛號" },
      { type: "expense", amount: 950, category: "food", date: `${m}-23`, payment: "信用卡", note: "朋友聚餐" }
    ].map((item, idx) => ({
      id: `sample_${Date.now()}_${idx}`,
      ...item,
      createdAt: Date.now() - idx * 1000
    }));

    state.transactions = [...samples, ...state.transactions];
    if (!state.budgets[m]) {
      state.budgets[m] = 30000;
      saveJson(STORAGE_KEYS.budgets, state.budgets);
    }
    persistTransactions();
    renderAll();
    showToast("已載入範例資料並設定本月示範預算");
  };

  // 事件綁定
  const bindEvents = () => {
    el.themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });

    el.prevMonthBtn.addEventListener("click", () => {
      state.selectedMonth = shiftMonth(state.selectedMonth, -1);
      renderAll();
    });

    el.nextMonthBtn.addEventListener("click", () => {
      state.selectedMonth = shiftMonth(state.selectedMonth, 1);
      renderAll();
    });

    el.currentPeriodBtn.addEventListener("click", () => {
      state.showAllPeriods = false;
      state.selectedMonth = currentMonthKey();
      renderAll();
    });

    el.toggleAllPeriodBtn.addEventListener("click", () => {
      state.showAllPeriods = !state.showAllPeriods;
      renderAll();
    });

    el.typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => setFormType(btn.dataset.type));
    });

    el.categoryGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-chip");
      if (!btn) return;
      state.selectedCategory = btn.dataset.catId;
      renderCategoryGrid();
    });

    document.querySelector(".quick-amounts").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip-btn");
      if (!btn) return;
      if (btn.dataset.clearAmount) {
        el.amountInput.value = "";
        return;
      }
      const add = Number(btn.dataset.add || 0);
      const cur = Number(el.amountInput.value || 0);
      el.amountInput.value = String(cur + add);
    });

    el.entryForm.addEventListener("submit", handleFormSubmit);
    el.cancelEditBtn.addEventListener("click", resetForm);

    el.miniTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        state.chartType = tab.dataset.chartType;
        el.miniTabs.forEach((t) => t.classList.toggle("active", t === tab));
        renderDonutChart(getPeriodTransactions());
      });
    });

    [el.searchInput, el.filterTypeSelect, el.filterCategorySelect, el.filterPaymentSelect, el.sortSelect].forEach(
      (control) => {
        control.addEventListener("input", () => renderTransactionList(getPeriodTransactions()));
        control.addEventListener("change", () => renderTransactionList(getPeriodTransactions()));
      }
    );

    el.transactionList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "edit") startEdit(id);
      if (action === "delete") deleteTransaction(id);
    });

    el.toastUndoBtn.addEventListener("click", undoDelete);

    el.editBudgetBtn.addEventListener("click", () => {
      el.budgetInput.value = String(state.budgets[state.selectedMonth] || "");
      el.budgetDialog.showModal();
    });

    el.closeBudgetDialog.addEventListener("click", () => el.budgetDialog.close());

    el.budgetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = Math.round(Number(el.budgetInput.value || 0));
      if (val <= 0) {
        delete state.budgets[state.selectedMonth];
      } else {
        state.budgets[state.selectedMonth] = val;
      }
      saveJson(STORAGE_KEYS.budgets, state.budgets);
      el.budgetDialog.close();
      renderAll();
      showToast(val > 0 ? `已更新 ${formatMonthLabel(state.selectedMonth)} 預算` : "已清除本月預算");
    });

    el.exportCsvBtn.addEventListener("click", exportCsv);
    el.backupBtn.addEventListener("click", () => el.backupDialog.showModal());
    el.closeBackupDialog.addEventListener("click", () => el.backupDialog.close());
    el.exportJsonBtn.addEventListener("click", exportJsonBackup);
    el.importJsonInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importJsonBackup(file);
      e.target.value = "";
    });

    el.loadSampleBtn.addEventListener("click", loadSampleData);
    el.clearAllBtn.addEventListener("click", () => {
      if (state.transactions.length === 0 && Object.keys(state.budgets).length === 0) {
        showToast("目前已經沒有資料");
        return;
      }
      if (!window.confirm("確定要清空所有記帳資料與預算設定嗎？此動作無法復原。")) return;
      state.transactions = [];
      state.budgets = {};
      state.lastDeleted = null;
      persistTransactions();
      saveJson(STORAGE_KEYS.budgets, state.budgets);
      resetForm();
      renderAll();
      showToast("已清空所有記帳資料");
    });
  };

  // 初始化
  initTheme();
  el.dateInput.value = todayStr();
  renderCategoryGrid();
  renderCategoryFilterOptions();
  bindEvents();
  renderAll();
})();
