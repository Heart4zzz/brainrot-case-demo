(() => {
  "use strict";

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#100d19"); tg.setBackgroundColor("#0d0b14"); } catch (_) {}
  }

  const CASE_PRICE = 13;
  const START_BALANCE = 999999;
  const STORAGE_KEY = "brainrot_case_demo_v1";
  const ITEMS = [
    { id: "noobini", name: "Noobini Pizzanini", short: "Noobini", emoji: "🍕", rarity: "ОБЫЧНЫЙ", rarityClass: "common", value: 7, chance: 55, weight: 55 },
    { id: "lirili", name: "Lirilì Larilà", short: "Lirilì", emoji: "🌵", rarity: "НЕОБЫЧНЫЙ", rarityClass: "uncommon", value: 11, chance: 30, weight: 30 },
    { id: "brr", name: "Brr Brr Patapim", short: "Patapim", emoji: "🌳", rarity: "РЕДКИЙ", rarityClass: "rare", value: 24, chance: 12, weight: 12 },
    { id: "tralalero", name: "Tralalero Tralala", short: "Tralalero", emoji: "🦈", rarity: "ЭПИЧЕСКИЙ", rarityClass: "epic", value: 70, chance: 3, weight: 3 },
  ];

  const $ = (id) => document.getElementById(id);
  let state = loadState();
  let selectedCount = state.lastDrop.length ? Math.min(10, Math.max(1, state.lastCount)) : 1;
  let isSpinning = false;
  let toastTimer = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Number.isFinite(parsed.balance) && Array.isArray(parsed.inventory)) {
        return { balance: parsed.balance, inventory: parsed.inventory, lastDrop: Array.isArray(parsed.lastDrop) ? parsed.lastDrop : [], lastCount: Number(parsed.lastCount) || 1 };
      }
    } catch (_) {}
    return { balance: START_BALANCE, inventory: [], lastDrop: [], lastCount: 1 };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function format(value) {
    return Math.max(0, Math.floor(value)).toLocaleString("ru-RU");
  }

  function updateBalance() {
    $("balanceValue").textContent = format(state.balance);
    $("totalCost").textContent = `${format(CASE_PRICE * selectedCount)} B`;
    updateQuantityOptions();
  }

  function updateQuantityOptions() {
    const maxAffordable = Math.min(10, Math.floor(state.balance / CASE_PRICE));
    if (maxAffordable > 0 && selectedCount > maxAffordable) selectedCount = maxAffordable;
    $("quantityOptions").innerHTML = "";
    for (let i = 1; i <= 10; i += 1) {
      const button = document.createElement("button");
      button.className = `quantity-option${i === selectedCount ? " active" : ""}`;
      button.textContent = String(i);
      button.disabled = i > maxAffordable || isSpinning;
      button.addEventListener("click", () => {
        if (isSpinning || i > maxAffordable) return;
        selectedCount = i;
        updateBalance();
      });
      $("quantityOptions").appendChild(button);
    }
    $("spinButton").disabled = isSpinning || maxAffordable < 1;
    $("spinButtonText").textContent = isSpinning ? "КРУТИМ..." : `КРУТИТЬ ×${selectedCount}!`;
  }

  function renderDrops() {
    const examples = [
      { player: "Player_042", item: ITEMS[3] },
      { player: "Ghost_013", item: ITEMS[1] },
      { player: "Pumpkin_7", item: ITEMS[2] },
      { player: "User_128", item: ITEMS[0] },
      { player: "NightFox", item: ITEMS[1] },
    ];
    $("dropsRail").innerHTML = examples.map(({ player, item }) => `
      <div class="drop-card">
        <div class="drop-emoji">${item.emoji}</div>
        <div class="drop-name">${item.name}</div>
        <div class="drop-player">${player} · Начальный</div>
      </div>`).join("");
  }

  function renderContents() {
    $("caseContents").innerHTML = ITEMS.map(item => `
      <div class="content-item">
        <div class="content-emoji">${item.emoji}</div>
        <div class="content-copy">
          <div class="content-name">${item.name}</div>
          <div class="content-rarity">${item.rarity}</div>
          <div class="content-chance">Шанс выпадения: ${item.chance}%</div>
        </div>
        <div class="content-value">${item.value} B<small>ПРОДАЖА</small></div>
      </div>`).join("");
  }

  function chooseItem() {
    const total = ITEMS.reduce((sum, item) => sum + item.weight, 0);
    const random = randomInt(total);
    let cursor = 0;
    for (const item of ITEMS) {
      cursor += item.weight;
      if (random < cursor) return item;
    }
    return ITEMS[0];
  }

  function randomInt(max) {
    if (window.crypto?.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return Math.floor((array[0] / 4294967296) * max);
    }
    return Math.floor(Math.random() * max);
  }

  function makePrize(item) {
    return { uid: `${Date.now()}-${randomInt(1_000_000_000)}-${randomInt(1_000_000)}`, itemId: item.id, name: item.name, emoji: item.emoji, rarity: item.rarity, rarityClass: item.rarityClass, value: item.value };
  }

  function getItemById(id) { return ITEMS.find(item => item.id === id) || ITEMS[0]; }

  function renderReels(prizes) {
    const area = $("reels");
    area.innerHTML = "";
    const rows = [];
    prizes.forEach((prize, rowIndex) => {
      const row = document.createElement("div");
      row.className = "reel-row";
      const track = document.createElement("div");
      track.className = "reel-track";
      const cells = [];
      const fillerCount = 23;
      for (let i = 0; i < fillerCount; i += 1) {
        const item = ITEMS[randomInt(ITEMS.length)];
        const cell = createReelCell(item);
        track.appendChild(cell);
        cells.push(cell);
      }
      const winningItem = getItemById(prize.itemId);
      const winningCell = createReelCell(winningItem);
      winningCell.classList.add("winning-cell");
      track.appendChild(winningCell);
      row.appendChild(track);
      area.appendChild(row);
      rows.push({ track, winningCell, row, rowIndex });
    });
    return rows;
  }

  function createReelCell(item) {
    const cell = document.createElement("div");
    cell.className = `reel-cell rarity-${item.rarityClass}`;
    cell.innerHTML = `<span class="emoji">${item.emoji}</span><span class="short-name">${item.short}</span>`;
    return cell;
  }

  function renderResult() {
    const prizes = state.lastDrop || [];
    if (!prizes.length) {
      $("resultPanel").classList.add("hidden");
      return;
    }
    $("resultItems").innerHTML = prizes.map(prize => `
      <div class="result-item">
        <div class="item-emoji">${prize.emoji}</div>
        <div class="item-name">${prize.name}</div>
        <div class="item-rarity">${prize.rarity}</div>
        <div class="item-value">${format(prize.value)} B</div>
      </div>`).join("");
    const total = prizes.reduce((sum, prize) => sum + prize.value, 0);
    $("sellTotal").textContent = format(total);
    $("resultPanel").classList.remove("hidden");
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function showHome() {
    $("homeView").classList.remove("hidden");
    $("caseView").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showCase() {
    $("homeView").classList.add("hidden");
    $("caseView").classList.remove("hidden");
    renderResult();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function spin() {
    if (isSpinning) return;
    const cost = CASE_PRICE * selectedCount;
    if (state.balance < cost) {
      showToast("Недостаточно тестовых монет");
      return;
    }

    isSpinning = true;
    state.balance -= cost;
    const prizes = Array.from({ length: selectedCount }, () => makePrize(chooseItem()));
    state.lastDrop = prizes;
    state.lastCount = selectedCount;
    state.inventory.push(...prizes);
    saveState();
    updateBalance();
    $("resultPanel").classList.add("hidden");
    $("rollStatus").textContent = "КРУТИТСЯ";
    $("rollStatus").style.color = "#f0a25b";

    const rows = renderReels(prizes);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const animations = rows.map(({ track, winningCell, rowIndex }) => {
      const center = winningCell.offsetLeft + winningCell.offsetWidth / 2;
      const destination = Math.max(0, center - track.parentElement.clientWidth / 2);
      const animation = track.animate(
        [{ transform: "translateX(0px)" }, { transform: `translateX(-${destination}px)` }],
        { duration: 4900 + rowIndex * 95, easing: "cubic-bezier(0.08, 0.78, 0.12, 1)", fill: "forwards" }
      );
      return animation.finished.catch(() => undefined);
    });
    await Promise.all(animations);

    isSpinning = false;
    $("rollStatus").textContent = "ГОТОВО";
    $("rollStatus").style.color = "#a9c18b";
    updateBalance();
    renderResult();
    saveState();
    showToast(prizes.length === 1 ? "Новый предмет добавлен в коллекцию" : `Получено предметов: ${prizes.length}`);
    $("resultPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function sellLastDrop() {
    const prizes = state.lastDrop || [];
    if (!prizes.length) return;
    const ids = new Set(prizes.map(prize => prize.uid));
    const total = prizes.reduce((sum, prize) => sum + prize.value, 0);
    state.inventory = state.inventory.filter(prize => !ids.has(prize.uid));
    state.balance += total;
    state.lastDrop = [];
    state.lastCount = 1;
    saveState();
    selectedCount = 1;
    updateBalance();
    renderResult();
    $("rollStatus").textContent = "ГОТОВО";
    showToast(`Продано за ${format(total)} тестовых монет`);
  }

  function playAgain() {
    if (isSpinning) return;
    state.lastDrop = [];
    saveState();
    renderResult();
    if (state.balance < CASE_PRICE * selectedCount) {
      showToast("Для повторного открытия не хватает монет");
      return;
    }
    spin();
  }

  $("openStarterCase").addEventListener("click", showCase);
  $("backHome").addEventListener("click", showHome);
  $("brandHome").addEventListener("click", showHome);
  $("spinButton").addEventListener("click", spin);
  $("sellAllButton").addEventListener("click", sellLastDrop);
  $("againButton").addEventListener("click", playAgain);
  $("resetDemo").addEventListener("click", () => {
    if (isSpinning) return;
    state = { balance: START_BALANCE, inventory: [], lastDrop: [], lastCount: 1 };
    selectedCount = 1;
    saveState();
    updateBalance();
    renderResult();
    $("rollStatus").textContent = "ГОТОВО";
    $("reels").innerHTML = '<div class="roulette-empty"><span>✦</span><b>ТВОЙ ДРОП ЖДЁТ</b><small>Выбери количество и нажми «Крутить»</small></div>';
    showToast("Демо-баланс восстановлен: 999 999 B");
  });

  renderDrops();
  renderContents();
  updateBalance();
  if (state.lastDrop.length) {
    showCase();
    $("reels").innerHTML = '<div class="roulette-empty"><span>✦</span><b>ПОСЛЕДНИЙ ДРОП СОХРАНЁН</b><small>Результат восстановлен из локального демо-сохранения</small></div>';
  }
})();
