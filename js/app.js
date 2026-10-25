// SUPABASE CONNECTION
const SUPABASE_URL = 'https://syihsecugrnygqbzfxck.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lr8LOltfXwDhNE6EizDVeA_BqRKidPK';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let transactions = [];
let currentType = 'expense';

// Unique Device / User ID for isolation
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
    }
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const title = document.getElementById('txTitle').value;
    const wallet = document.getElementById('txWallet').value;
    const category = document.getElementById('txCategory').value;

    const newTx = {
        user_id: userId,
        type: currentType,
        amount: amount,
        title: title,
        wallet: wallet,
        category: category
    };

    try {
        const { data, error } = await db.from('transactions').insert([newTx]).select();
        if (error) throw error;

        if (data) {
            transactions.unshift(data[0]);
            renderUI();
            closeAddModal();
        }
    } catch (err) {
        alert('Ошибка сохранения в облако: ' + err.message);
    }
}

function renderUI() {
    let totalInc = 0;
    let totalExp = 0;

    const historyList = document.getElementById('historyList');
    if (historyList) historyList.innerHTML = '';

    transactions.forEach(tx => {
        if (tx.type === 'income') totalInc += Number(tx.amount);
        if (tx.type === 'expense') totalExp += Number(tx.amount);

        if (historyList) {
            const item = document.createElement('div');
            item.className = 'bg-gray-900 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-xs';
            item.innerHTML = `
                <div>
                    <div class="font-bold text-gray-200">${tx.title}</div>
                    <div class="text-[10px] text-gray-400">${tx.wallet} • ${tx.category}</div>
                </div>
                <div class="font-mono font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
                    ${tx.type === 'income' ? '+' : '-'}${tx.amount} сом
                </div>
            `;
            historyList.appendChild(item);
        }
    });

    if (document.getElementById('totalIncomeHeader')) {
        document.getElementById('totalIncomeHeader').innerText = totalInc + ' сом';
    }
    if (document.getElementById('totalExpenseHeader')) {
        document.getElementById('totalExpenseHeader').innerText = totalExp + ' сом';
    }
    if (document.getElementById('totalWalletHeader')) {
        document.getElementById('totalWalletHeader').innerText = (totalInc - totalExp) + ' сом';
    }
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
    document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('txAmount').value = '';
    document.getElementById('txTitle').value = '';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
}

function openNightAuditModal() {}
