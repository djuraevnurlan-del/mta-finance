// SUPABASE CONNECTION
const SUPABASE_URL = 'https://syihsecugrnygqbzfxck.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lr8LOltfXwDhNE6EizDVeA_BqRKidPK';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_WALLETS = [
    { name: 'Оптима', icon: 'fa-credit-card', color: 'text-cyan-400' },
    { name: 'MBank', icon: 'fa-mobile-screen', color: 'text-emerald-400' },
    { name: 'Наличные', icon: 'fa-wallet', color: 'text-amber-400' }
];

const DEFAULT_CATEGORIES = [
    { name: 'Еда & Продукты', icon: 'fa-utensils', color: 'text-rose-400' },
    { name: 'Транспорт', icon: 'fa-car', color: 'text-blue-400' },
    { name: 'Жилье & Комуналка', icon: 'fa-house', color: 'text-purple-400' },
    { name: 'Развлечения', icon: 'fa-gamepad', color: 'text-pink-400' }
];

let transactions = [];
let currentType = 'expense';

let userId = localStorage.getItem('mta_user_id');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('mta_user_id', userId);
}

document.addEventListener('DOMContentLoaded', () => {
    loadTransactionsFromCloud();
});

async function loadTransactionsFromCloud() {
    try {
        const { data, error } = await db
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        transactions = data || [];
        renderUI();
    } catch (err) {
        console.error('Cloud load error:', err.message);
        renderUI();
    }
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    const amountVal = parseFloat(document.getElementById('txAmount').value);
    const titleVal = document.getElementById('txTitle').value;
    const walletVal = document.getElementById('txWallet').value;
    const categoryVal = document.getElementById('txCategory').value;

    if (!amountVal || amountVal <= 0) {
        alert('Введите корректную сумму!');
        return;
    }

    const newTx = {
        user_id: userId,
        type: currentType,
        amount: amountVal,
        title: titleVal,
        wallet: walletVal,
        category: categoryVal
    };

    try {
        const { data, error } = await db.from('transactions').insert([newTx]).select();
        if (error) throw error;

        if (data && data.length > 0) {
            transactions.unshift(data[0]);
        } else {
            transactions.unshift(newTx);
        }
        
        renderUI();
        closeAddModal();
    } catch (err) {
        alert('Ошибка сохранения в облако: ' + err.message);
    }
}

function renderUI() {
    let totalInc = 0;
    let totalExp = 0;
    let walletBalances = { 'Оптима': 0, 'MBank': 0, 'Наличные': 0 };
    let categoryExpenses = { 'Еда & Продукты': 0, 'Транспорт': 0, 'Жилье & Комуналка': 0, 'Развлечения': 0 };

    const historyList = document.getElementById('historyList');
    if (historyList) historyList.innerHTML = '';

    transactions.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
            totalInc += amt;
            if (walletBalances[tx.wallet] !== undefined) walletBalances[tx.wallet] += amt;
        } else {
            totalExp += amt;
            if (walletBalances[tx.wallet] !== undefined) walletBalances[tx.wallet] -= amt;
            if (categoryExpenses[tx.category] !== undefined) categoryExpenses[tx.category] += amt;
        }

        if (historyList) {
            const item = document.createElement('div');
            item.className = 'bg-gray-900/90 p-3.5 rounded-2xl border border-gray-800 flex justify-between items-center text-xs shadow-md';
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} flex items-center justify-center font-bold">
                        <i class="fa-solid ${tx.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
                    </div>
                    <div>
                        <div class="font-bold text-gray-100">${tx.title}</div>
                        <div class="text-[10px] text-gray-400">${tx.wallet} • ${tx.category}</div>
                    </div>
                </div>
                <div class="font-mono font-bold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
                    ${tx.type === 'income' ? '+' : '-'}${amt.toLocaleString()} сом
                </div>
            `;
            historyList.appendChild(item);
        }
    });

    const walletList = document.getElementById('walletList');
    if (walletList) {
        walletList.innerHTML = '';
        DEFAULT_WALLETS.forEach(w => {
            const bal = walletBalances[w.name] || 0;
            const card = document.createElement('div');
            card.className = 'bg-gray-900/90 p-3 rounded-2xl border border-gray-800 space-y-1 shadow-sm';
            card.innerHTML = `
                <div class="flex items-center justify-between text-gray-400 text-[11px]">
                    <span class="font-bold">${w.name}</span>
                    <i class="fa-solid ${w.icon} ${w.color}"></i>
                </div>
                <div class="text-sm font-black font-mono text-gray-100">${bal.toLocaleString()} сом</div>
            `;
            walletList.appendChild(card);
        });
    }

    const categoryGrid = document.getElementById('categoryGrid');
    if (categoryGrid) {
        categoryGrid.innerHTML = '';
        DEFAULT_CATEGORIES.forEach(c => {
            const exp = categoryExpenses[c.name] || 0;
            const card = document.createElement('div');
            card.className = 'bg-gray-900/90 p-2.5 rounded-2xl border border-gray-800 space-y-1 text-center shadow-sm';
            card.innerHTML = `
                <i class="fa-solid ${c.icon} ${c.color} text-sm"></i>
                <div class="text-[10px] font-bold text-gray-300 truncate">${c.name}</div>
                <div class="text-xs font-black font-mono text-rose-400">${exp.toLocaleString()} сом</div>
            `;
            categoryGrid.appendChild(card);
        });
    }

    const incomeList = document.getElementById('incomeList');
    if (incomeList) {
        incomeList.innerHTML = `
            <div class="bg-gray-900/90 p-3 rounded-2xl border border-gray-800 text-center space-y-1 shadow-sm col-span-3">
                <div class="text-[10px] font-bold text-gray-400 uppercase">Зарплата & Доходы</div>
                <div class="text-sm font-black font-mono text-emerald-400">${totalInc.toLocaleString()} сом</div>
            </div>
        `;
    }

    if (document.getElementById('totalIncomeHeader')) document.getElementById('totalIncomeHeader').innerText = totalInc.toLocaleString() + ' сом';
    if (document.getElementById('totalExpenseHeader')) document.getElementById('totalExpenseHeader').innerText = totalExp.toLocaleString() + ' сом';
    if (document.getElementById('totalWalletHeader')) document.getElementById('totalWalletHeader').innerText = (totalInc - totalExp).toLocaleString() + ' сом';
}

function setTxType(type) {
    currentType = type;
    const btnExp = document.getElementById('txTypeExp');
    const btnInc = document.getElementById('txTypeInc');

    if (type === 'expense') {
        btnExp.className = 'flex-1 py-1 rounded-lg bg-rose-500 text-white font-extrabold';
        btnInc.className = 'flex-1 py-1 rounded-lg text-gray-400';
    } else {
        btnInc.className = 'flex-1 py-1 rounded-lg bg-emerald-500 text-white font-extrabold';
        btnExp.className = 'flex-1 py-1 rounded-lg text-gray-400';
    }
}

function openAddTransactionModal() {
    const modal = document.getElementById('addModal');
    if (modal) modal.classList.remove('hidden');
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) modal.classList.add('hidden');
    const amt = document.getElementById('txAmount');
    const ttl = document.getElementById('txTitle');
    if (amt) amt.value = '';
    if (ttl) ttl.value = '';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('text-cyan-400');
        el.classList.add('text-gray-400');
    });
    const activeNav = document.getElementById('nav-' + tabId);
    if (activeNav) {
        activeNav.classList.remove('text-gray-400');
        activeNav.classList.add('text-cyan-400');
    }
}
