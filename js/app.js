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
}
