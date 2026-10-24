/* LifeOS Finance — application logic. Data is stored in this browser's localStorage. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} сом`;
  const todayISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  };
  const STORAGE_KEY = "lifeos-finance-v1";
  const defaultData = () => ({
    salary: 60000, credit: 30000, extraIncome: 0,
    expenses: [], goals: [{id: "watch-goal", name: "Умные часы", target: 40000, saved: 0, image: ""}],
    weight: 62, weightGoal: 70, water: 0, waterDate: todayISO(), calories: 0, calorieDate: todayISO()
  });
  let data = loadData();
  let cashflowChart = null, categoryChart = null;
  const categories = {
    "Food & Shops": {icon:"fa-basket-shopping", color:"#a397ff"},
    "Auto & Gas": {icon:"fa-car", color:"#70d6e3"},
    "Entertainment": {icon:"fa-film", color:"#ffb16e"},
    "Utilities": {icon:"fa-bolt", color:"#70e1c1"},
    "Other": {icon:"fa-ellipsis", color:"#f18ca9"}
  };

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === "object" ? {...defaultData(), ...saved} : defaultData();
    } catch { return defaultData(); }
  }
  function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function expensesThisMonth() {
    const now = new Date();
    return data.expenses.filter(e => {
      const d = new Date(`${e.date}T12:00:00`);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }
  function totalExpenses(items = expensesThisMonth()) { return items.reduce((sum, e) => sum + Number(e.amount || 0), 0); }
  function totalSaved() { return data.goals.reduce((sum, g) => sum + Number(g.saved || 0), 0); }
  function currentIncome() { return Number(data.salary) + Number(data.extraIncome); }
  function monthBalance() { return currentIncome() - Number(data.credit) - totalExpenses(); }
  function setGreeting() {
    const hour = new Date().getHours();
    let greeting = "Добро пожаловать! Мы так ждали вас";
    if (hour >= 5 && hour < 12) greeting = "Доброе утро! Мы так ждали вас";
    else if (hour >= 12 && hour < 18) greeting = "Добрый день! Мы так ждали вас";
    else if (hour >= 18 && hour < 23) greeting = "Добрый вечер! Мы так ждали вас";
    else greeting = "Доброй ночи! Мы так ждали вас";
    $("#greeting").textContent = greeting;
    $("#todayLabel").textContent = "ТВОЙ ДЕНЬ • FINANCE & WELLNESS";
    $("#currentDate").textContent = new Intl.DateTimeFormat("ru-RU", {day:"numeric", month:"long", year:"numeric"}).format(new Date());
  }
  function syncDailyCounters() {
    if (data.waterDate !== todayISO()) { data.water = 0; data.waterDate = todayISO(); }
    if (data.calorieDate !== todayISO()) { data.calories = 0; data.calorieDate = todayISO(); }
  }
  function render() {
    syncDailyCounters();
    const monthExpenses = expensesThisMonth();
    const spent = totalExpenses(monthExpenses);
    $("#balanceValue").textContent = money(monthBalance());
    $("#incomeValue").textContent = money(currentIncome());
    $("#expenseValue").textContent = money(spent);
    $("#expenseCount").textContent = monthExpenses.length;
    $("#savedValue").textContent = money(totalSaved());
    $("#balanceStatus").textContent = monthBalance() >= 0 ? "Баланс под контролем" : "Расходы выше доступного дохода";
    $("#balanceStatus").style.color = monthBalance() >= 0 ? "var(--accent2)" : "#ff9aa5";
    $("#salaryInput").value = data.salary;
    $("#creditInput").value = data.credit;
    $("#extraIncomeInput").value = data.extraIncome;
    $("#afterCredit").textContent = money(currentIncome() - Number(data.credit));
    $("#freeCash").textContent = money(monthBalance());
    $("#expenseDate").value ||= todayISO();
    $("#historyCount").textContent = `${data.expenses.length} записей`;
    renderExpenses();
    renderGoals();
    renderWellness();
    renderCharts();
    saveData();
  }
  function renderExpenses() {
    const list = $("#expenseList");
    const sorted = [...data.expenses].sort((a,b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`)).slice(0,12);
    if (!sorted.length) { list.innerHTML = '<div class="empty-state">Пока нет расходов. Добавь первую операцию выше.</div>'; return; }
    list.innerHTML = sorted.map(e => {
      const category = categories[e.category] || categories.Other;
      const date = new Date(`${e.date}T12:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"short"});
      return `<div class="expense-item"><div class="expense-icon" style="color:${category.color}"><i class="fa-solid ${category.icon}"></i></div><div class="expense-main"><strong>${escapeHTML(e.name)}</strong><span>${escapeHTML(e.category)} · ${date}</span></div><strong class="expense-amount">−${money(e.amount)}</strong><button class="delete-button" data-delete-expense="${e.id}" title="Удалить"><i class="fa-solid fa-xmark"></i></button></div>`;
    }).join("");
  }
  function renderGoals() {
    const list = $("#goalList");
    if (!data.goals.length) { list.innerHTML = '<div class="empty-state">Добавь цель, чтобы начать копить.</div>'; return; }
    list.innerHTML = data.goals.map(g => {
      const target = Math.max(1, Number(g.target) || 1), saved = Math.max(0, Number(g.saved) || 0);
      const percent = Math.min(100, Math.round(saved / target * 100));
      const remaining = Math.max(0, target - saved);
      const monthlySave = Math.max(0, monthBalance());
      const months = monthlySave > 0 ? Math.ceil(remaining / monthlySave) : null;
      const arrival = months !== null ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString("ru-RU",{month:"long",year:"numeric"}) : "нужен план накоплений";
      const thumb = g.image ? `<img class="goal-thumb" src="${g.image}" alt="">` : `<div class="goal-thumb"><i class="fa-solid fa-bullseye"></i></div>`;
      return `<div class="goal-card"><div class="goal-title-row">${thumb}<div class="goal-name"><strong>${escapeHTML(g.name)}</strong><span>Цель: ${money(target)}</span></div><span class="goal-money">${money(saved)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><div class="goal-bottom"><span>${percent}% · Осталось ${money(remaining)}</span><span class="muted">Ориентир: ${arrival}</span></div><div class="goal-bottom" style="margin-top:11px"><span>Пополняй понемногу</span><div class="goal-actions"><button data-contribute="${g.id}">+ 500 сом</button><button data-edit-goal="${g.id}">Изменить</button><button data-delete-goal="${g.id}" aria-label="Удалить цель">×</button></div></div></div>`;
    }).join("");
  }
  function renderWellness() {
    $("#weightValue").textContent = Number(data.weight).toLocaleString("ru-RU");
    $("#weightGoalText").textContent = `${Number(data.weightGoal).toLocaleString("ru-RU")} кг`;
    $("#weightInput").value = data.weight;
    $("#weightGoalInput").value = data.weightGoal;
    const progress = Number(data.weightGoal) === 62 ? 100 : Math.max(0, Math.min(100, (Number(data.weight)-62)/(Number(data.weightGoal)-62)*100));
    $("#weightProgress").style.width = `${progress}%`;
    $("#waterValue").textContent = data.water;
    $("#waterGlasses").innerHTML = Array.from({length:8},(_,i)=>`<button class="water-glass" data-water="${i+1}" aria-label="Стакан ${i+1}" style="--fill:${i < data.water ? 100 : 0}%"></button>`).join("");
    $("#calorieValue").textContent = `${Number(data.calories).toLocaleString("ru-RU")} ккал`;
  }
  function renderCharts() {
    if (typeof Chart === "undefined") return;
    const labels = [];
    const incomeData = [], expenseData = [];
    for (let i=5;i>=0;i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      labels.push(d.toLocaleDateString("ru-RU",{month:"short"}));
      const monthItems = data.expenses.filter(e => { const ed = new Date(`${e.date}T12:00:00`); return ed.getFullYear()===d.getFullYear() && ed.getMonth()===d.getMonth(); });
      expenseData.push(totalExpenses(monthItems));
      incomeData.push(currentIncome());
    }
    const cashCtx = $("#cashflowChart").getContext("2d");
    if (cashflowChart) cashflowChart.destroy();
    cashflowChart = new Chart(cashCtx,{type:"line",data:{labels,datasets:[
      {label:"Доход",data:incomeData,borderColor:"#70e1c1",backgroundColor:"#70e1c116",fill:true,tension:.38,borderWidth:2,pointRadius:2},
      {label:"Расходы + кредит",data:expenseData.map(v=>v+Number(data.credit)),borderColor:"#a397ff",backgroundColor:"#a397ff10",fill:true,tension:.38,borderWidth:2,pointRadius:2}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#aab2c8",boxWidth:8,boxHeight:8,usePointStyle:true,font:{size:10}}}},scales:{x:{grid:{color:"#ffffff08"},ticks:{color:"#818ba4",font:{size:10}}},y:{grid:{color:"#ffffff0b"},ticks:{color:"#818ba4",font:{size:10},callback:v=>`${Number(v).toLocaleString("ru-RU")}`}}}}});
    const current = expensesThisMonth();
    const values = Object.keys(categories).map(k => current.filter(e=>e.category===k).reduce((s,e)=>s+Number(e.amount),0));
    const colors = Object.values(categories).map(c=>c.color);
    $("#donutTotal").textContent = Math.round(totalExpenses(current)).toLocaleString("ru-RU");
    const catCtx = $("#categoryChart").getContext("2d");
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(catCtx,{type:"doughnut",data:{labels:Object.keys(categories),datasets:[{data:values.some(v=>v>0)?values:[1,1,1,1,1],backgroundColor:values.some(v=>v>0)?colors:colors.map(c=>c+"35"),borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"76%",plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${money(values[ctx.dataIndex])}`}}}}});
    $("#categoryLegend").innerHTML = Object.keys(categories).map((k,i)=>`<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span><span>${k}</span><strong>${money(values[i])}</strong></div>`).join("");
  }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  $("#incomeForm").addEventListener("submit", e => {
    e.preventDefault();
    data.salary = Math.max(0, Number($("#salaryInput").value)||0);
    data.credit = Math.max(0, Number($("#creditInput").value)||0);
    data.extraIncome = Math.max(0, Number($("#extraIncomeInput").value)||0);
    render(); toastMessage("Финансовые настройки сохранены.");
  });
  $("#expenseForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#expenseName").value.trim(), amount = Number($("#expenseAmount").value);
    if (!name || amount <= 0) return;
    data.expenses.push({id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,amount,category:$("#expenseCategory").value,date:$("#expenseDate").value || todayISO(),createdAt:String(Date.now())});
    $("#expenseName").value = ""; $("#expenseAmount").value = "";
    render(); toastMessage("Расход добавлен.");
  });
  $("#expenseList").addEventListener("click", e => {
    const button = e.target.closest("[data-delete-expense]");
    if (!button) return;
    data.expenses = data.expenses.filter(item=>item.id !== button.dataset.deleteExpense); render();
  });
  $("#goalForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#goalName").value.trim(), target = Number($("#goalTarget").value), saved = Number($("#goalSaved").value)||0;
    if (!name || target <= 0) return;
    const file = $("#goalImage").files[0];
    const addGoal = image => {
      data.goals.push({id:`goal-${Date.now()}`,name,target,saved:Math.min(saved,target),image:image||""});
      $("#goalName").value="";$("#goalTarget").value="";$("#goalSaved").value="0";$("#goalImage").value="";
      render(); toastMessage("Цель добавлена.");
    };
    if (file) {
      if (file.size > 1_500_000) { toastMessage("Изображение должно быть меньше 1,5 МБ."); return; }
      const reader = new FileReader(); reader.onload = () => addGoal(reader.result); reader.readAsDataURL(file);
    } else addGoal("");
  });
  $("#goalList").addEventListener("click", e => {
    const contribute = e.target.closest("[data-contribute]");
    const edit = e.target.closest("[data-edit-goal]");
    const del = e.target.closest("[data-delete-goal]");
    if (contribute) {
      const goal = data.goals.find(g=>g.id===contribute.dataset.contribute);
      if (goal) { goal.saved = Math.min(Number(goal.target), Number(goal.saved)+500); render(); }
    } else if (edit) {
      const goal = data.goals.find(g=>g.id===edit.dataset.editGoal);
      if (goal) {
        const newName = prompt("Название цели:", goal.name);
        if (newName === null) return;
        const newTarget = prompt("Стоимость цели в сомах:", goal.target);
        if (newTarget === null) return;
        const newSaved = prompt("Сколько уже накоплено:", goal.saved);
        if (newSaved === null) return;
        if (newName.trim() && Number(newTarget)>0 && Number(newSaved)>=0) {
          goal.name=newName.trim();goal.target=Number(newTarget);goal.saved=Math.min(Number(newSaved),goal.target);render();
        } else toastMessage("Проверь введённые значения.");
      }
    } else if (del && confirm("Удалить эту цель?")) {
      data.goals = data.goals.filter(g=>g.id!==del.dataset.deleteGoal); render();
    }
  });
  $("#weightForm").addEventListener("submit", e => {
    e.preventDefault();
    data.weight = Number($("#weightInput").value)||62;
    data.weightGoal = Number($("#weightGoalInput").value)||70;
    render(); toastMessage("Данные о весе обновлены.");
  });
  $("#waterGlasses").addEventListener("click", e => {
    const glass = e.target.closest("[data-water]"); if (!glass) return;
    data.water = Number(glass.dataset.water); render();
  });
  $("#addWater").addEventListener("click", () => { data.water = Math.min(8, Number(data.water)+1); render(); });
  $("#calorieForm").addEventListener("submit", e => {
    e.preventDefault(); data.calories += Math.max(0,Number($("#calorieInput").value)||0); $("#calorieInput").value=""; render();
  });
  $("#auditButton").addEventListener("click", () => {
    const spent = totalExpenses(), balance = monthBalance();
    const sorted = Object.entries(categories).map(([name,cat])=>({name,total:expensesThisMonth().filter(e=>e.category===name).reduce((s,e)=>s+Number(e.amount),0)})).sort((a,b)=>b.total-a.total);
    const biggest = sorted[0];
    let intro = balance < 0 ? "Внимание: сейчас расходы вместе с кредитом превышают доход. В первую очередь останови необязательные покупки." : balance < currentIncome()*.2 ? "Запас небольшой. Постарайся ограничить импульсивные покупки и сначала отложить небольшую сумму." : "Баланс выглядит устойчиво. Сохрани этот ритм и регулярно пополняй накопления.";
    const list = sorted.filter(x=>x.total>0).slice(0,3).map(x=>`<li><b>${x.name}</b>: ${money(x.total)}</li>`).join("") || "<li>Пока нет записанных расходов за этот месяц.</li>";
    $("#auditResult").innerHTML = `<b>Ночной аудит</b><p>${intro}</p><p>Расходы за месяц: <b>${money(spent)}</b>. Кредит: <b>${money(data.credit)}</b>.</p><p>Категории с наибольшими расходами:</p><ul>${list}</ul><p>${biggest.total ? `Проверь, можно ли сократить категорию «${biggest.name}» без ущерба для важных потребностей.` : "Добавляй траты по мере их появления, чтобы советы стали точнее."}</p>`;
    $("#auditResult").classList.remove("hidden");
  });
  function assistantReply(message) {
    const q = message.toLowerCase();
    if (/баланс|деньг|финанс|сколько/.test(q)) return `Твой расчётный баланс за месяц — ${money(monthBalance())}. Доход: ${money(currentIncome())}, кредит: ${money(data.credit)}, записанные расходы: ${money(totalExpenses())}.`;
    if (/эконом|сэконом|расход|трат/.test(q)) return "Попробуй правило 24 часов для необязательных покупок, планируй продукты заранее и записывай расходы сразу. Нельзя оценить траты, которые ещё не внесены в систему.";
    if (/цель|копить|накоп/.test(q)) return data.goals.length ? `Сейчас у тебя ${data.goals.length} целей. Уже накоплено ${money(totalSaved())}. Выбери одну главную цель и пополняй её регулярно.` : "Создай первую цель накопления и укажи стоимость — так будет проще двигаться по плану.";
    if (/вес|калор|вода|здоров/.test(q)) return `Сегодня: вес ${data.weight} кг, вода ${data.water}/8 стаканов, калории ${data.calories} ккал. Иди постепенно и ориентируйся на самочувствие, а не только на цифры.`;
    return "Я помогу следить за балансом, расходами, накоплениями и привычками. Спроси, например: «Какой у меня баланс?» или «Как сократить расходы?»";
  }
  function sendChat() {
    const input = $("#chatInput"), message = input.value.trim(); if (!message) return;
    $("#chatReply").textContent = assistantReply(message); $("#chatReply").classList.remove("hidden"); input.value="";
  }
  $("#chatSend").addEventListener("click", sendChat);
  $("#chatInput").addEventListener("keydown", e => { if(e.key==="Enter") sendChat(); });
  $("#voiceButton").addEventListener("click", () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { toastMessage("Голосовой ввод не поддерживается этим браузером. Попробуй Chrome."); return; }
    const recognition = new Recognition(); recognition.lang="ru-RU"; recognition.interimResults=false;
    recognition.onresult = event => { $("#chatInput").value = event.results[0][0].transcript; sendChat(); };
    recognition.onerror = () => toastMessage("Не удалось распознать речь. Проверь доступ к микрофону.");
    recognition.start();
  });
  $("#resetDemo").addEventListener("click", () => {
    if (!confirm("Сбросить все локальные данные и вернуться к демо-значениям?")) return;
    data = defaultData(); render(); toastMessage("Демо-данные восстановлены.");
  });
  function toastMessage(message) {
    let toast = $("#toast");
    if (!toast) { toast=document.createElement("div");toast.id="toast";toast.style.cssText="position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:20;background:#20263a;border:1px solid #ffffff1b;color:#f4f5ff;padding:12px 17px;border-radius:12px;font-size:12px;box-shadow:0 10px 35px #0006;max-width:calc(100% - 28px);text-align:center";document.body.appendChild(toast); }
    toast.textContent=message; toast.style.opacity="1";
    clearTimeout(toastMessage.timer); toastMessage.timer=setTimeout(()=>{toast.style.opacity="0";},2400);
  }
  setGreeting(); render();
})();
