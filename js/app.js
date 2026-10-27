// МТА 24/7 — Учет Финансов + Цели, Долги & Фокус Дня (Supabase + Multi-User Auth)

const SUPABASE_URL = 'https://sztrhecvoyfyuqruujoh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T_KVCWo75Uh4P45qUs1KMQ_iEHnQYjO'; 

let currentUser = localStorage.getItem('mta_current_user') || null;

let state = {
    currentDate: new Date(),
    currency: 'KGS',
    dailyLimit: 2500,
    wallets: [
        { id: 'cash', name: 'Наличные', icon: 'fa-wallet', color: 'bg-cyan-500/20 text-cyan-400', balance: 0 },
        { id: 'card', name: 'Карта VISA', icon: 'fa-credit-card', color: 'bg-rose-500/20 text-rose-400', balance: 0 }
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
    loans: [],
    debtsToMe: [],   // Новое: Кто должен мне
    goals: [],
    yearDreams: [],  // Новое: Мечты и планы на год
    dailyTasks: [],  // Новое: Задачи дня
    transactions: []
};

let currentTxType = 'expense';
let currentReportType = 'month';
let reportChartInstance = null;
let itemToDelete = null;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuthStatus();
});

function checkAuthStatus() {
    const authEl = document.getElementById('authScreen');
    currentUser = localStorage.getItem('mta_current_user');

    if (!currentUser || currentUser === 'null' || currentUser === 'undefined' || currentUser.trim() === '') {
        currentUser = null;
        if (authEl) authEl.classList.remove('hidden');
    } else {
        if (authEl) authEl.classList.add('hidden');
        initApp();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('usernameInput');
    if (!input || !input.value.trim()) return;

    currentUser = input.value.trim().toLowerCase();
    localStorage.setItem('mta_current_user', currentUser);

    const authEl = document.getElementById('authScreen');
    if (authEl) authEl.classList.add('hidden');

    await initApp();
}

function logoutUser() {
    localStorage.removeItem('mta_current_user');
    currentUser = null;
    location.reload();
}

async function initApp() {
    autoSetCurrentMonth();
    renderUserBadge();
    await loadState();
    ensureNewStateFields(); // Защита от потери данных у старых юзеров
    renderUI();
    initChart();
}

// Проверка и инициализация новых полей у старых юзеров
function ensureNewStateFields() {
    if (!state.debtsToMe) state.debtsToMe = [];
    if (!state.yearDreams) state.yearDreams = [];
    if (!state.dailyTasks) state.dailyTasks = [];
}

function renderUserBadge() {
    const nameDisp = document.getElementById('userNameDisplay') || document.querySelector('header .max-w-md');
    if (!nameDisp) return;
    
    let existingBadge = document.getElementById('userBadgeBlock');
    if (existingBadge) existingBadge.remove();

    let badgeDiv = document.createElement('div');
    badgeDiv.id = 'userBadgeBlock';
    badgeDiv.className = 'flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1 text-xs text-cyan-400 font-bold ml-2';
    badgeDiv.innerHTML = `
        <i class="fa-solid fa-user text-[10px]"></i>
        <span>${currentUser.toUpperCase()}</span>
        <button onclick="logoutUser()" class="text-gray-500 hover:text-rose-400 ml-1" title="Сменить пользователя"><i class="fa-solid fa-right-from-bracket"></i></button>
    `;
    
    const titleBlock = nameDisp.querySelector('.flex.items-center.gap-2\\.5');
    if (titleBlock) titleBlock.appendChild(badgeDiv);
}

async function loadState() {
    try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${currentUser}&select=data`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (response.ok) {
            let resData = await response.json();
            if (resData && resData.length > 0 && resData[0].data) {
                state = { ...state, ...resData[0].data };
                state.currentDate = new Date();
                return;
            }
        }
    } catch (e) {}
    
    const saved = localStorage.getItem(`mta_247_${currentUser}`);
    if (saved) {
        try {
            state = { ...state, ...JSON.parse(saved) };
            state.currentDate = new Date();
        } catch (e) {}
    }
}

async function saveState() {
    if (!currentUser) return;
    localStorage.setItem(`mta_247_${currentUser}`, JSON.stringify(state));

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                user_id: currentUser,
                data: state,
                updated_at: new Date().toISOString()
            })
        });
    } catch (e) {}
}

function autoSetCurrentMonth() {
    state.currentDate = new Date();
}

function renderUI() {
    updatePeriodLabel();
    renderPanel();
    renderLoans();
    renderDebtsToMe();  // Отрисовка "Мне должны"
    renderGoals();
    renderYearDreams(); // Отрисовка Мечт на год
    renderDailyTasks(); // Отрисовка Задач дня
    renderForecast();
    renderHistory();
    renderReport();
    saveState();
}

function updatePeriodLabel() {
    const monthNames = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
    let m = monthNames[state.currentDate.getMonth()];
    let y = state.currentDate.getFullYear();
    const lbl = document.getElementById('currentPeriodLabel');
    if (lbl) lbl.innerText = `${m} ${y}`;
}

function changePeriod(delta) {
    state.currentDate.setMonth(state.currentDate.getMonth() + delta);
    renderUI();
}

function getPeriodPrefix() {
    let y = state.currentDate.getFullYear();
    let m = String(state.currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}function renderPanel() {
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date && t.date.startsWith(period));

    let totalInc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const incHeader = document.getElementById('totalIncomeHeader');
    if (incHeader) incHeader.innerText = `${totalInc.toLocaleString()} ${state.currency}`;
    
    const incList = document.getElementById('incomeList');
    if (incList) {
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
    }

    let totalWallets = 0;
    const wallList = document.getElementById('walletList');
    if (wallList) {
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
    }
    const wallHeader = document.getElementById('totalWalletHeader');
    if (wallHeader) wallHeader.innerText = `${totalWallets.toLocaleString()} ${state.currency}`;

    let totalExp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expHeader = document.getElementById('totalExpenseHeader');
    if (expHeader) expHeader.innerText = `${totalExp.toLocaleString()} ${state.currency}`;

    const catGrid = document.getElementById('categoryGrid');
    if (catGrid) {
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
}

// МОИ ДОЛГИ
function renderLoans() {
    const list = document.getElementById('loansList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.loans || state.loans.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет ваших долгов</div>';
        return;
    }

    state.loans.forEach(l => {
        let monthsLeft = (l.monthlyPayment && l.monthlyPayment > 0) ? Math.ceil(l.remaining / l.monthlyPayment) : 0;
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-3 rounded-2xl space-y-1.5 text-xs';
        el.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-100">${l.name}</span>
                <span class="font-mono text-rose-400 font-bold">${l.remaining.toLocaleString()} ${state.currency}</span>
            </div>
            <div class="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-800/60">
                <span>Ежемесячно: <b class="text-gray-200">${l.monthlyPayment || 0} ${state.currency}</b> ${monthsLeft > 0 ? `(~${monthsLeft} мес.)` : ''}</span>
                <button onclick="payLoan('${l.id}')" class="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg font-bold">Внести</button>
            </div>
        `;
        list.appendChild(el);
    });
}

function addNewLoan() {
    let name = prompt("Название кредита или кому вы должны:");
    if (!name) return;
    let totalAmount = parseFloat(prompt("Сумма долга (сом):") || 0);
    let monthlyPayment = parseFloat(prompt("Ежемесячный платеж (сом):") || 0);
    state.loans.push({ id: 'l_' + Date.now(), name, totalAmount, monthlyPayment, remaining: totalAmount });
    renderUI();
}

function payLoan(loanId) {
    let loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    let paySum = parseFloat(prompt(`Сумма взноса по "${loan.name}" (сом):`, loan.monthlyPayment) || 0);
    if (!paySum) return;
    loan.remaining = Math.max(0, loan.remaining - paySum);
    if (loan.remaining === 0) state.loans = state.loans.filter(l => l.id !== loanId);
    renderUI();
}

// КТО ДОЛЖЕН МНЕ
function renderDebtsToMe() {
    const list = document.getElementById('debtsToMeList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.debtsToMe || state.debtsToMe.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Никто вам не должен</div>';
        return;
    }

    state.debtsToMe.forEach(d => {
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-emerald-900/40 p-3 rounded-2xl flex justify-between items-center text-xs';
        el.innerHTML = `
            <div>
                <div class="font-bold text-gray-100">${d.personName}</div>
                <div class="text-[10px] text-emerald-400 font-mono font-bold">${d.amount.toLocaleString()} ${state.currency}</div>
            </div>
            <button onclick="collectDebt('${d.id}')" class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold">Вернул долг</button>
        `;
        list.appendChild(el);
    });
}

function addNewDebtToMe() {
    let personName = prompt("Кто взял у вас в долг (Имя):");
    if (!personName) return;
    let amount = parseFloat(prompt("Сумма долга (сом):") || 0);
    if (!amount) return;
    state.debtsToMe.push({ id: 'dtm_' + Date.now(), personName, amount });
    renderUI();
}

function collectDebt(id) {
    let debt = state.debtsToMe.find(d => d.id === id);
    if (debt && confirm(`${debt.personName} вернул вам ${debt.amount} ${state.currency}?`)) {
        state.debtsToMe = state.debtsToMe.filter(d => d.id !== id);
        renderUI();
    }
}

// ЦЕЛИ С РАСЧЕТОМ МЕСЯЦЕВ
function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.goals || state.goals.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет целей. Нажми "+ Добавить цель"!</div>';
        return;
    }

    state.goals.forEach(g => {
        let pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        let left = Math.max(0, g.target - g.saved);
        let monthsLeft = (g.monthlyPledge && g.monthlyPledge > 0) ? Math.ceil(left / g.monthlyPledge) : 0;

        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-3 rounded-2xl space-y-2 text-xs relative';
        el.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-100">${g.name}</span>
                <span class="font-mono text-cyan-400 font-bold">${g.saved.toLocaleString()} / ${g.target.toLocaleString()} ${state.currency}</span>
            </div>
            <div class="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800">
                <div class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full" style="width: ${pct}%"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                <span>Осталось: <b class="text-rose-400">${left.toLocaleString()} ${state.currency}</b> ${monthsLeft > 0 ? `(~${monthsLeft} мес.)` : ''}</span>
                <button onclick="depositToGoal('${g.id}')" class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-bold">+ Пополнить</button>
            </div>
        `;
        list.appendChild(el);
    });
}

function addNewGoal() {
    let name = prompt("Название финансовой цели:");
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
        renderUI();
    }
}

// МЕЧТЫ НА ГОД
function renderYearDreams() {
    const list = document.getElementById('yearDreamsList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.yearDreams || state.yearDreams.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет главных планов на год</div>';
        return;
    }

    state.yearDreams.forEach(dream => {
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-purple-900/40 p-3 rounded-2xl flex justify-between items-center text-xs';
        el.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-star text-purple-400"></i>
                <span class="text-gray-200 font-medium">${dream.title}</span>
            </div>
            <button onclick="deleteDream('${dream.id}')" class="text-gray-600 hover:text-rose-400 text-xs"><i class="fa-solid fa-xmark"></i></button>
        `;
        list.appendChild(el);
    });
}

function addNewYearDream() {
    let title = prompt("Ваша мечта или главная цель на этот год:");
    if (!title) return;
    state.yearDreams.push({ id: 'yd_' + Date.now(), title });
    renderUI();
}

function deleteDream(id) {
    state.yearDreams = state.yearDreams.filter(d => d.id !== id);
    renderUI();
}

// ЗАДАЧИ ДНЯ
function renderDailyTasks() {
    const list = document.getElementById('dailyTasksList');
    if (!list) return;
    list.innerHTML = '';

    if (!state.dailyTasks || state.dailyTasks.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-xs text-center py-2">Нет задач на сегодня</div>';
        return;
    }

    state.dailyTasks.forEach(task => {
        let el = document.createElement('div');
        el.className = 'bg-gray-900/90 border border-gray-800 p-2.5 rounded-2xl flex justify-between items-center text-xs';
        el.innerHTML = `
            <div class="flex items-center gap-2.5">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${task.id}')" class="rounded accent-cyan-500">
                <span class="${task.done ? 'line-through text-gray-500' : 'text-gray-200'}">${task.title}</span>
            </div>
            <button onclick="deleteTask('${task.id}')" class="text-gray-600 hover:text-rose-400"><i class="fa-solid fa-trash text-[10px]"></i></button>
        `;
        list.appendChild(el);
    });
}

function addNewDailyTask() {
    let title = prompt("Задача на сегодня:");
    if (!title) return;
    state.dailyTasks.push({ id: 'dt_' + Date.now(), title, done: false });
    renderUI();
}

function toggleTask(id) {
    let task = state.dailyTasks.find(t => t.id === id);
    if (task) task.done = !task.done;
    renderUI();
}

function deleteTask(id) {
    state.dailyTasks = state.dailyTasks.filter(t => t.id !== id);
    renderUI();
}

function openNightAuditModal() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTx = state.transactions.filter(t => t.type === 'expense' && t.fullDate === todayStr);
    let todaySpent = todayTx.reduce((s, t) => s + t.amount, 0);
    let limit = state.dailyLimit || 2500;
    let diff = limit - todaySpent;

    const content = document.getElementById('auditContent');
    if (content) {
        content.innerHTML = `
            <div class="flex justify-between"><span>Дата:</span><b class="text-cyan-400">${todayStr}</b></div>
            <div class="flex justify-between"><span>Дневной лимит:</span><b class="text-gray-200">${limit.toLocaleString()} ${state.currency}</b></div>
            <div class="flex justify-between"><span>Потрачено сегодня:</span><b class="text-rose-400">${todaySpent.toLocaleString()} ${state.currency}</b></div>
            <div class="border-t border-gray-800 pt-2 mt-2 flex justify-between font-bold">
                <span>Итог дня:</span>
                <b class="${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${diff >= 0 ? 'Экономия: +' + diff.toLocaleString() : 'Перерасход: ' + diff.toLocaleString()} ${state.currency}</b>
            </div>
        `;
    }

    const modal = document.getElementById('nightAuditModal');
    if (modal) modal.classList.remove('hidden');
}

function closeNightAuditModal() {
    const modal = document.getElementById('nightAuditModal');
    if (modal) modal.classList.add('hidden');
}

function renderForecast() {
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date && t.date.startsWith(period));

    let inc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let exp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    let monthlySavings = Math.max(0, inc - exp);
    let yearForecast = monthlySavings * 12;

    const fcTot = document.getElementById('forecastYearTotal');
    if (fcTot) fcTot.innerText = `${yearForecast.toLocaleString()} ${state.currency}`;
    const fcDesc = document.getElementById('forecastDescText');
    if (fcDesc) fcDesc.innerText = `При остатке ${monthlySavings.toLocaleString()} сом в месяц, за 12 месяцев у вас зафиксируется ${yearForecast.toLocaleString()} ${state.currency}.`;
}

function promptManageItem(type, id, name) {
    itemToDelete = { type, id };
    const modalTitle = document.getElementById('manageItemTitle');
    if (modalTitle) modalTitle.innerText = `Удалить "${name}"?`;
    const modal = document.getElementById('manageItemModal');
    if (modal) modal.classList.remove('hidden');
}

function closeManageModal() {
    const modal = document.getElementById('manageItemModal');
    if (modal) modal.classList.add('hidden');
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
    if (!list) return;
    list.innerHTML = '';
    const period = getPeriodPrefix();
    const periodTx = state.transactions.filter(t => t.date && t.date.startsWith(period));

    let inc = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let exp = periodTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const saldoEl = document.getElementById('historySaldo');
    if (saldoEl) saldoEl.innerText = `${(inc - exp).toLocaleString()} ${state.currency}`;

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
    if (wSelect) {
        wSelect.innerHTML = '';
        state.wallets.forEach(w => { wSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`; });
    }
    setTxType('expense');
    const modal = document.getElementById('addModal');
    if (modal) modal.classList.remove('hidden');
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) modal.classList.add('hidden');
}

function setTxType(type) {
    currentTxType = type;
    const btnExp = document.getElementById('txTypeExp');
    const btnInc = document.getElementById('txTypeInc');
    const cSelect = document.getElementById('txCategory');
    if (!cSelect) return;
    cSelect.innerHTML = '';

    if (type === 'expense') {
        if (btnExp) btnExp.className = 'flex-1 py-1 rounded-lg bg-rose-500 text-white font-extrabold';
        if (btnInc) btnInc.className = 'flex-1 py-1 rounded-lg text-gray-400';
        state.categories.forEach(c => cSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    } else {
        if (btnInc) btnInc.className = 'flex-1 py-1 rounded-lg bg-emerald-500 text-white font-extrabold';
        if (btnExp) btnExp.className = 'flex-1 py-1 rounded-lg text-gray-400';
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
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('text-cyan-400'));
    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) targetNav.classList.add('text-cyan-400');
}

function initChart() {
    const canvas = document.getElementById('reportChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    reportChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#06b6d4', '#f43f5e', '#3b82f6', '#eab308', '#a855f7', '#10b981', '#f97316'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }
    });
}

function setReportType(type) {
    currentReportType = type;
    const btnD = document.getElementById('repBtnDay');
    if (btnD) btnD.className = type === 'day' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
    const btnM = document.getElementById('repBtnMonth');
    if (btnM) btnM.className = type === 'month' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
    const btnY = document.getElementById('repBtnYear');
    if (btnY) btnY.className = type === 'year' ? 'flex-1 py-1.5 rounded-lg bg-cyan-500 text-black font-extrabold' : 'flex-1 py-1.5 rounded-lg text-gray-400';
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
        targetTx = state.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(period));
        const lbl = document.getElementById('currentPeriodLabel');
        title = `Анализ за месяц: ${lbl ? lbl.innerText : ''}`;
    } else if (currentReportType === 'year') {
        const year = state.currentDate.getFullYear().toString();
        targetTx = state.transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(year));
        title = `Полный анализ за весь ${year} год`;
    }

    const repHeader = document.getElementById('reportTitleHeader');
    if (repHeader) repHeader.innerText = title;

    const catMap = {};
    targetTx.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });

    const labels = Object.keys(catMap);
    const values = Object.values(catMap);

    reportChartInstance.data.labels = labels.length ? labels : ['Нет трат'];
    reportChartInstance.data.datasets[0].data = values.length ? values : [1];
    reportChartInstance.update();

    const bd = document.getElementById('reportBreakdown');
    if (!bd) return;
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
