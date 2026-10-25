// МТА 24/7 — Учет Финансов (Полный финальный файл)

const JSONBIN_BIN_ID = '6adda26bff5d1605389b700';
const JSONBIN_API_KEY = '$2a$10$Tfq85Wevw11TANV9oj.eq.HPLWTDwAj65dyR7oLjUxPXRzem3m8pa';

let state = {
    currentDate: new Date(),
    currency: 'KGS',
    dailyLimit: 2500,
    wallets: [
        { id: 'cash', name: 'Наличные', icon: 'fa-wallet', color: 'bg-cyan-500/20 text-cyan-400', balance: 5000 },
        { id: 'card', name: 'Карта VISA', icon: 'fa-credit-card', color: 'bg-rose-500/20 text-rose-400', balance: 15000 }
    ],
    incomes: [
        { id: 'inc1', name: 'Зарплата', icon: 'fa-money-bill-wave', color: 'bg-emerald-500/20 text-emerald-400' },
        { id: 'inc2', name: 'Фриланс', icon: 'fa-briefcase', color: 'bg-blue-500/20 text-blue-400' }
    ],
    categories: [
        { id: 'cat1', name: 'Продукты', icon: 'fa-cart-shopping', color: 'bg-sky-500/20 text-sky-400' },
        { id: 'cat2', name: 'Еда / Кофе', icon: 'fa-burger', color: 'bg-lime-500/20 text-lime-400' },
        { id: 'cat3', name: 'Транспорт', icon: 'fa-taxi', color: 'bg-amber-500/20 text-amber-400' },
        { id: 'cat4', name: 'Спорт', icon: 'fa-dumbbell', color: 'bg-purple-500/20 text-purple-400' },
        { id: 'cat5', name: 'Горы', icon: 'fa-mountain', color: 'bg-teal-500/20 text-teal-400' },
        { id: 'cat6', name: 'Развлечения', icon: 'fa-film', color: 'bg-fuchsia-500/20 text-fuchsia-400' }
    ],
    loans: [
        { id: 'l1', name: 'Кредит / Долг', totalAmount: 30000, monthlyPayment: 5000, remaining: 20000 }
    ],
    goals: [
        { id: 'g1', name: 'Smart Watch', target: 40000, saved: 12000, monthlyPledge: 5000 }
    ],
    transactions: []
};

let currentTxType = 'expense';
let currentReportType = 'month';
let reportChartInstance = null;
let itemToDelete = null;

document.addEventListener('DOMContentLoaded', async () => {
    const authEl = document.getElementById('authScreen');
    if (authEl) authEl.classList.add('hidden');

    const nameDisp = document.getElementById('userNameDisplay');
    if (nameDisp) nameDisp.innerText = '👤 МТА 24/7 Личный';

    autoSetCurrentMonth();
    await loadState();
    renderUI();
    initChart();
});

// Загрузка данных из облака JSONbin.io с защитой от пробелов в ключе
async function loadState() {
    try {
        let response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 
                'X-Master-Key': JSONBIN_API_KEY.trim() 
            }
        });
        if (response.ok) {
            let data = await response.json();
            if (data && data.record) {
                state = { ...state, ...data.record };
                state.currentDate = new Date();
                return;
            }
        }
    } catch (e) {
        console.log('Облако недоступно, читаем из локального кеша');
    }
    
    const saved = localStorage.getItem('mta_247_v10_direct');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            state.currentDate = new Date();
        } catch (e) {}
    }
}

// Сохранение в облако JSONbin.io + дубликаты в localStorage
async function saveState() {
    localStorage.setItem('mta_247_v10_direct', JSON.stringify(state));

    try {
        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY.trim()
            },
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.log('Ошибка сохранения в облако');
    }
}

// Экспорт бэкапа в файл
function exportBackupFile() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    let dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `mta_247_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
}

function autoSetCurrentMonth() {
    state.currentDate = new Date();
}

function renderUI() {
    updatePeriodLabel();
    renderPanel();
    renderLoans();
    renderGoals();
    renderForecast();
    renderHistory();
    renderReport();
    saveState();
}

function updatePeriodLabel() {
    const monthNames = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
    let m = monthNames[state.currentDate.getMonth()];
    let y = state.currentDate.getFullYear();
    document.getElementById('currentPeriodLabel').innerText = `${m} ${y}`;
}

function changePeriod(delta) {
    state.currentDate.setMonth(state.currentDate.getMonth() + delta);
    renderUI();
}

function getPeriodPrefix() {
    let y = state.currentDate.getFullYear();
    let m = String(state.currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function renderPanel() {
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date.startsWith(period));

    let totalInc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    document.getElementById('totalIncomeHeader').innerText = `${totalInc.toLocaleString()} ${state.currency}`;
    
    const incList = document.getElementById('incomeList');
    incList.innerHTML = '';
    state.incomes.forEach(inc => {
        let sum = periodTx.filter(t => t.type === 'income' && t.category === inc.name).reduce((s, t) => s + t.amount, 0);
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center relative';
        el.innerHTML = `
            <button onclick="promptManageItem('income', '${inc.id}', '${inc.name}')" class="absolute top-1 right-1 text-gray-600 hover:text-rose-400 text-[10px] p-1"><i class="fa-solid fa-xmark"></i></button>
            <div class="w-8 h-8 rounded-full ${inc.color} flex items-center justify-center text-sm mb-1"><i class="fa-solid ${inc.icon}"></i></div>
            <div class="text-[10px] text-gray-400 font-medium">${inc.name}</div>
            <div class="text-xs font-bold font-mono text-gray-100 mt-0.5">${sum.toLocaleString()}</div>
        `;
        incList.appendChild(el);
    });

    let addIncBtn = document.createElement('button');
    addIncBtn.onclick = () => {
        let name = prompt("Название источника дохода:");
        if (name) {
            state.incomes.push({ id: 'inc_' + Date.now(), name, icon: 'fa-money-bill-wave', color: 'bg-emerald-500/20 text-emerald-400' });
            renderUI();
        }
    };
    addIncBtn.className = 'bg-gray-900/40 border border-dashed border-gray-800 p-2.5 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:text-gray-300';
    addIncBtn.innerHTML = `<i class="fa-solid fa-plus text-base"></i><span class="text-[9px] mt-1">Добавить</span>`;
    incList.appendChild(addIncBtn);

    let totalWallets = 0;
    const wallList = document.getElementById('walletList');
    wallList.innerHTML = '';
    
    state.wallets.forEach(w => {
        let wExpenses = state.transactions.filter(t => t.walletId === w.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        let wIncomes = state.transactions.filter(t => t.walletId === w.id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
        let currentBal = w.balance + wIncomes - wExpenses;
        totalWallets += currentBal;

        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-3 rounded-2xl flex items-center justify-between relative';
        el.innerHTML = `
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full ${w.color} flex items-center justify-center text-sm"><i class="fa-solid ${w.icon}"></i></div>
                <div>
                    <div class="text-[10px] text-gray-400">${w.name}</div>
                    <div class="text-xs font-bold font-mono text-gray-100">${currentBal.toLocaleString()} ${state.currency}</div>
                </div>
            </div>
            <button onclick="promptManageItem('wallet', '${w.id}', '${w.name}')" class="text-gray-600 hover:text-rose-400 text-xs px-1"><i class="fa-solid fa-trash"></i></button>
        `;
        wallList.appendChild(el);
    });
    document.getElementById('totalWalletHeader').innerText = `${totalWallets.toLocaleString()} ${state.currency}`;

    let addWallBtn = document.createElement('button');
    addWallBtn.onclick = () => {
        let name = prompt("Название кошелька:");
        if (name) {
            let bal = parseFloat(prompt("Начальный баланс (сом):") || 0);
            state.wallets.push({ id: 'w_' + Date.now(), name, icon: 'fa-credit-card', color: 'bg-cyan-500/20 text-cyan-400', balance: bal });
            renderUI();
        }
    };
    addWallBtn.className = 'bg-gray-900/40 border border-dashed border-gray-800 p-3 rounded-2xl flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-xs';
    addWallBtn.innerHTML = `<i class="fa-solid fa-plus"></i><span>Добавить кошелек</span>`;
    wallList.appendChild(addWallBtn);

    let totalExp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('totalExpenseHeader').innerText = `${totalExp.toLocaleString()} ${state.currency}`;

    const catGrid = document.getElementById('categoryGrid');
    catGrid.innerHTML = '';
    state.categories.forEach(cat => {
        let sum = periodTx.filter(t => t.type === 'expense' && t.category === cat.name).reduce((s, t) => s + t.amount, 0);
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center relative';
        el.innerHTML = `
            <button onclick="promptManageItem('category', '${cat.id}', '${cat.name}')" class="absolute top-1 right-1 text-gray-600 hover:text-rose-400 text-[10px] p-1"><i class="fa-solid fa-xmark"></i></button>
            <div class="w-8 h-8 rounded-full ${cat.color} flex items-center justify-center text-sm mb-1"><i class="fa-solid ${cat.icon}"></i></div>
            <div class="text-[10px] text-gray-400 font-medium">${cat.name}</div>
            <div class="text-xs font-bold font-mono text-rose-400 mt-0.5">${sum.toLocaleString()}</div>
        `;
        catGrid.appendChild(el);
    });

    let addCatBtn = document.createElement('button');
    addCatBtn.onclick = () => {
        let name = prompt("Название категории расходов:");
        if (name) {
            state.categories.push({ id: 'c_' + Date.now(), name, icon: 'fa-tag', color: 'bg-rose-500/20 text-rose-400' });
            renderUI();
        }
    };
    addCatBtn.className = 'bg-gray-900/40 border border-dashed border-gray-800 p-2.5 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:text-gray-300';
    addCatBtn.innerHTML = `<i class="fa-solid fa-plus text-base"></i><span class="text-[9px] mt-1">Добавить</span>`;
    catGrid.appendChild(addCatBtn);
}

function renderLoans() {
    const list = document.getElementById('loansList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.loans || state.loans.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет долгов. Чистый горизонт!</div>';
        return;
    }

    state.loans.forEach(l => {
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-3 rounded-2xl flex justify-between items-center text-xs';
        el.innerHTML = `
            <div>
                <div class="font-bold text-gray-200">${l.name}</div>
                <div class="text-[10px] text-gray-400">Остаток долга: <b class="text-rose-400 font-mono">${l.remaining.toLocaleString()} ${state.currency}</b></div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="payLoan('${l.id}')" class="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold hover:bg-rose-500/30">Внести платеж</button>
                <button onclick="promptManageItem('loan', '${l.id}', '${l.name}')" class="text-gray-600 hover:text-rose-400 px-1"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(el);
    });
}

function addNewLoan() {
    let name = prompt("Название кредита или долга:");
    if (!name) return;
    let totalAmount = parseFloat(prompt("Общая сумма долга (сом):") || 0);
    let monthlyPayment = parseFloat(prompt("Ежемесячный платеж (сом):") || 0);

    state.loans.push({ id: 'l_' + Date.now(), name, totalAmount, monthlyPayment, remaining: totalAmount });
    renderUI();
}

function payLoan(loanId) {
    let loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    let paySum = parseFloat(prompt(`Сумма взноса по долгу "${loan.name}" (сом):`, loan.monthlyPayment) || 0);
    if (!paySum) return;

    loan.remaining = Math.max(0, loan.remaining - paySum);
    state.transactions.push({
        id: Date.now(),
        type: 'expense',
        amount: paySum,
        title: `Платеж по долгу: ${loan.name}`,
        walletId: state.wallets[0]?.id || 'cash',
        category: '💳 Долги',
        date: getPeriodPrefix(),
        fullDate: new Date().toISOString().slice(0, 10)
    });

    if (loan.remaining === 0) {
        state.loans = state.loans.filter(l => l.id !== loanId);
        alert(`🎉 Кредит "${loan.name}" полностью погашен!`);
    }
    renderUI();
}

function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    list.innerHTML = '';

    if (state.goals.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет целей. Нажми "+ Добавить цель"!</div>';
        return;
    }

    state.goals.forEach(g => {
        let pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        let left = Math.max(0, g.target - g.saved);
        let monthsLeft = g.monthlyPledge > 0 ? Math.ceil(left / g.monthlyPledge) : 0;

        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-3 rounded-2xl space-y-2 text-xs relative';
        el.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-100">${g.name}</span>
                <div class="flex items-center gap-2">
                    <span class="font-mono text-cyan-400 font-bold">${g.saved.toLocaleString()} / ${g.target.toLocaleString()} ${state.currency}</span>
                    <button onclick="promptManageItem('goal', '${g.id}', '${g.name}')" class="text-gray-600 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            
            <div class="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800">
                <div class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>

            <div class="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                <span>Осталось: <b class="text-rose-400 font-mono">${left.toLocaleString()} ${state.currency}</b> ${monthsLeft > 0 ? `(~${monthsLeft} мес.)` : ''}</span>
                <button onclick="depositToGoal('${g.id}')" class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-bold hover:bg-cyan-500/30">+ Пополнить</button>
            </div>
        `;
        list.appendChild(el);
    });
}

function addNewGoal() {
    let name = prompt("Название цели (например: Smart Watch):");
    if (!name) return;
    let target = parseFloat(prompt("Стоимость цели (сом):") || 0);
    if (!target) return;
    let pledge = parseFloat(prompt("Сколько откладывать в месяц (сом):") || 2000);

    state.goals.push({ id: 'g_' + Date.now(), name, target, saved: 0, monthlyPledge: pledge });
    renderUI();
}

function depositToGoal(goalId) {
    let amount = parseFloat(prompt("Сколько отложить в копилку (сом)?") || 0);
    if (!amount) return;

    let goal = state.goals.find(g => g.id === goalId);
    if (goal) {
        goal.saved += amount;
        state.transactions.push({
            id: Date.now(),
            type: 'expense',
            amount: amount,
            title: `Копилка: ${goal.name}`,
            walletId: state.wallets[0]?.id || 'cash',
            category: '🎯 Цели',
            date: getPeriodPrefix(),
            fullDate: new Date().toISOString().slice(0, 10)
        });
        renderUI();
    }
}

function renderForecast() {
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date.startsWith(period));

    let inc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let exp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    let monthlySavings = Math.max(0, inc - exp);
    let yearForecast = monthlySavings * 12;

    document.getElementById('forecastYearTotal').innerText = `${yearForecast.toLocaleString()} ${state.currency}`;
    document.getElementById('forecastDescText').innerText = `При остатке ${monthlySavings.toLocaleString()} сом в месяц, за 12 месяцев у вас зафиксируется ${yearForecast.toLocaleString()} ${state.currency}.`;
}

function promptManageItem(type, id, name) {
    itemToDelete = { type, id };
    document.getElementById('manageItemTitle').innerText = `Удалить "${name}"?`;
    document.getElementById('manageItemModal').classList.remove('hidden');
}

function closeManageModal() {
    document.getElementById('manageItemModal').classList.add('hidden');
    itemToDelete = null;
}

function confirmDeleteItem() {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'income') state.incomes = state.incomes.filter(i => i.id !== itemToDelete.id);
    else if (itemToDelete.type === 'wallet') state.wallets = state.wallets.filter(w => w.id !== itemToDelete.id);
    else if (itemToDelete.type === 'category') state.categories = state.categories.filter(c => c.id !== itemToDelete.id);
    else if (itemToDelete.type === 'goal') state.goals = state.goals.filter(g => g.id !== itemToDelete.id);
    else if (itemToDelete.type === 'loan') state.loans = state.loans.filter(l => l.id !== itemToDelete.id);
    closeManageModal();
    renderUI();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date.startsWith(period));

    let inc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let exp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('historySaldo').innerText = `${(inc - exp).toLocaleString()} ${state.currency}`;

    if (periodTx.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-8">За этот период нет записей</div>';
        return;
    }

    periodTx.slice().reverse().forEach(t => {
        let isInc = t.type === 'income';
        let el = document.createElement('div');
        el.className = 'bg-gray-900/80 border border-gray-800 p-3 rounded-2xl flex items-center justify-between text-xs';
        el.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg ${isInc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} flex items-center justify-center font-bold text-xs">
                    ${isInc ? '+' : '-'}
                </div>
                <div>
                    <div class="font-bold text-gray-200">${t.title}</div>
                    <div class="text-[10px] text-gray-400">${t.category} • ${t.fullDate}</div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-mono font-bold ${isInc ? 'text-emerald-400' : 'text-rose-400'}">
                    ${isInc ? '+' : '-'}${t.amount.toLocaleString()} ${state.currency}
                </span>
                <button onclick="deleteTx(${t.id})" class="text-gray-500 hover:text-rose-400"><i class="fa-solid fa-trash text-xs"></i></button>
            </div>
        `;
        list.appendChild(el);
    });
}

function deleteTx(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    renderUI();
}

function openAddTransactionModal() {
    const wSelect = document.getElementById('txWallet');
    wSelect.innerHTML = '';
    state.wallets.forEach(w => { wSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`; });
    setTxType('expense');
    document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

function setTxType(type) {
    currentTxType = type;
    const btnExp = document.getElementById('txTypeExp');
    const btnInc = document.getElementById('txTypeInc');
    const cSelect = document.getElementById('txCategory');
    cSelect.innerHTML = '';

    if (type === 'expense') {
        btnExp.className = 'flex-1 py-1 rounded-lg bg-rose-500 text-white font-extrabold';
        btnInc.className = 'flex-1 py-1 rounded-lg text-gray-400';
        state.categories.forEach(c => cSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    } else {
        btnInc.className = 'flex-1 py-1 rounded-lg bg-emerald-500 text-white font-extrabold';
        btnExp.className = 'flex-1 py-1 rounded-lg text-gray-400';
        state.incomes.forEach(i => cSelect.innerHTML += `<option value="${i.name}">${i.name}</option>`);
    }
}

function handleSaveTransaction(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const title = document.getElementById('txTitle').value;
    const walletId = document.getElementById('txWallet').value;
    const category = document.getElementById('txCategory').value;

    if (!amount || !title) return;

    state.transactions.push({
        id: Date.now(),
        type: currentTxType,
        amount,
        title,
        walletId,
        category,
        date: getPeriodPrefix(),
        fullDate: new Date().toISOString().slice(0, 10)
    });

    document.getElementById('txAmount').value = '';
    document.getElementById('txTitle').value = '';
    closeAddModal();
    renderUI();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('text-cyan-400'));
    document.getElementById(`nav-${tabName}`).classList.add('text-cyan-400');
}

function initChart() {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    reportChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#06b6d4', '#f43f5e', '#3b82f6', '#eab308', '#a855f7', '#10b981', '#f97316'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }
    });
}

function setReportType(type) {
    currentReportType = type;
    document.getElementById('repBtnDay').className = type === 'day' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
    document.getElementById('repBtnMonth').className = type === 'month' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
    document.getElementById('repBtnYear').className = type === 'year' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
    renderReport();
}

function renderReport() {
    if (!reportChartInstance) return;

    let targetTx = [];
    let title = '';

    if (currentReportType === 'day') {
        const todayStr = new Date().toISOString().slice(0, 10);
        targetTx = state.transactions.filter(t => t.type === 'expense' && t.fullDate === todayStr);
        title = `Анализ за сегодня: ${todayStr}`;
    } else if (currentReportType === 'month') {
        const period = getPeriodPrefix();
        targetTx = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(period));
        title = `Анализ за месяц: ${document.getElementById('currentPeriodLabel').innerText}`;
    } else if (currentReportType === 'year') {
        const year = state.currentDate.getFullYear().toString();
        targetTx = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(year));
        title = `Полный анализ за весь ${year} год`;
    }

    document.getElementById('reportTitleHeader').innerText = title;

    const catMap = {};
    targetTx.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });

    const labels = Object.keys(catMap);
    const values = Object.values(catMap);

    reportChartInstance.data.labels = labels.length ? labels : ['Нет трат'];
    reportChartInstance.data.datasets[0].data = values.length ? values : [1];
    reportChartInstance.update();

    const bd = document.getElementById('reportBreakdown');
    bd.innerHTML = '';
    let total = values.reduce((a, b) => a + b, 0);

    labels.forEach((cat, idx) => {
        let val = values[idx];
        let pct = total > 0 ? Math.round((val / total) * 100) : 0;
        let color = reportChartInstance.data.datasets[0].backgroundColor[idx % 7];
        bd.innerHTML += `
            <div class="flex justify-between items-center text-gray-300">
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background-color:${color}"></span><span>${cat}</span></div>
                <div class="font-mono font-bold">${val.toLocaleString()} ${state.currency} (${pct}%)</div>
            </div>
        `;
    });
}

function calcExchange() {
    let rate = parseFloat(document.getElementById('usdRate').value) || 87.5;
    let usd = parseFloat(document.getElementById('calcUsdInput').value) || 0;
    let kgs = Math.round(usd * rate);
    document.getElementById('calcResultDisplay').innerText = `${usd} $ = ${kgs.toLocaleString()} сом`;
}

function openNightAuditModal() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTx = state.transactions.filter(t => t.type === 'expense' && t.fullDate === todayStr);
    let todaySum = todayTx.reduce((s, t) => s + t.amount, 0);

    const auditEl = document.getElementById('auditContent');
    auditEl.innerHTML = `
        <div>• Потрачено за сегодня: <b class="text-rose-400 font-mono">${todaySum.toLocaleString()} ${state.currency}</b></div>
        <div>• Дневной лимит: <b class="text-cyan-400 font-mono">${state.dailyLimit.toLocaleString()} ${state.currency}</b></div>
        <div class="pt-2 border-t border-gray-800 text-emerald-400 font-semibold">
            ${todaySum <= state.dailyLimit ? '🟢 Отличный день! Ты удержался в рамках дневного бюджета.' : '🔴 Внимание! Дневной лимит превышен.'}
        </div>
    `;
    document.getElementById('nightAuditModal').classList.remove('hidden');
}

function closeNightAuditModal() {
    document.getElementById('nightAuditModal').classList.add('hidden');
}

function updateSettings() {
    state.currency = document.getElementById('settingCurrency').value;
    state.dailyLimit = parseFloat(document.getElementById('settingDailyLimit').value) || 2500;
    renderUI();
}

function resetData() {
    if (confirm("Сбросить все данные до начального вида?")) {
        localStorage.removeItem('mta_247_v10_direct');
        location.reload();
    }
}
