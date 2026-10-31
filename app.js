(() => {
  "use strict";
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor("#11101a"); tg.setBackgroundColor("#0d0c13"); } catch (_) {} }

  const CASE_PRICE = 13, START_BALANCE = 999999, STORAGE_KEY = "brainrot_case_demo_v2";
  const REEL_CELLS = 76, REEL_MIN_RESULT_INDEX = 5, REEL_MAX_RESULT_INDEX = 59;
  const EXTRA_FOR_MAX_CHANCE = 40, EXTRA_BONUS_MAX = 75;
  const ITEMS = [
    {id:"noobini",name:"Noobini Pizzanini",short:"Noobini",emoji:"🍕",rarity:"ОБЫЧНЫЙ",rarityClass:"common",value:7,weight:48},
    {id:"lirili",name:"Lirilì Larilà",short:"Lirilì",emoji:"🌵",rarity:"НЕОБЫЧНЫЙ",rarityClass:"uncommon",value:11,weight:29},
    {id:"brr",name:"Brr Brr Patapim",short:"Patapim",emoji:"🌳",rarity:"РЕДКИЙ",rarityClass:"rare",value:24,weight:17},
    {id:"tralalero",name:"Tralalero Tralala",short:"Tralalero",emoji:"🦈",rarity:"ЭПИЧЕСКИЙ",rarityClass:"epic",value:70,weight:6},
    {id:"cappuccino",name:"Cappuccino Assassino",short:"Cappuccino",emoji:"☕",rarity:"РЕДКИЙ",rarityClass:"rare",value:38,weight:0},
    {id:"bombardiro",name:"Bombardiro Crocodilo",short:"Bombardiro",emoji:"🐊",rarity:"ЭПИЧЕСКИЙ",rarityClass:"epic",value:95,weight:0},
    {id:"chimpanzini",name:"Chimpanzini Bananini",short:"Chimpanzini",emoji:"🍌",rarity:"НЕОБЫЧНЫЙ",rarityClass:"uncommon",value:16,weight:0},
    {id:"tung",name:"Tung Tung Tung Sahur",short:"Tung Tung",emoji:"🪵",rarity:"ЛЕГЕНДАРНЫЙ",rarityClass:"legendary",value:180,weight:0},
    {id:"tralala-gold",name:"Tralalero Neon",short:"Neon Shark",emoji:"🦈",rarity:"ЛЕГЕНДАРНЫЙ",rarityClass:"legendary",value:320,weight:0},
    {id:"dragon",name:"Dragon Brainrot",short:"Dragon",emoji:"🐉",rarity:"МИФИЧЕСКИЙ",rarityClass:"mythic",value:650,weight:0}
  ];
  const $ = id => document.getElementById(id);
  const money = n => Math.max(0,Math.floor(n)).toLocaleString("ru-RU");
  const randomInt = max => { if (window.crypto?.getRandomValues) { const a=new Uint32Array(1); window.crypto.getRandomValues(a); return Math.floor(a[0]/4294967296*max); } return Math.floor(Math.random()*max); };
  const getItem = id => ITEMS.find(x=>x.id===id) || null;
  const newId = () => `${Date.now()}-${randomInt(1e9)}-${randomInt(1e6)}`;
  function freshState(){return {balance:START_BALANCE,inventory:[],lastDrop:[],lastCount:1,history:[]};}
  function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));if(s&&Number.isFinite(s.balance)&&Array.isArray(s.inventory))return {...freshState(),...s,history:Array.isArray(s.history)?s.history:[]};}catch(_){}return freshState();}
  let state=loadState(), selectedCount=1, isSpinning=false, quickCaseMode=false, quickUpgradeMode=false, wheelRotation=0, selectedSource=null, selectedTarget=null, presetMode="", toastTimer=null;
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300);}
  function balanceUI(){ $("balanceValue").textContent=money(state.balance); $("totalCost").textContent=`${money(CASE_PRICE*selectedCount)} B`; quantityUI(); }
  function quantityUI(){const max=Math.min(10,Math.floor(state.balance/CASE_PRICE));if(max&&selectedCount>max)selectedCount=max;$("quantityOptions").innerHTML="";for(let n=1;n<=10;n++){const b=document.createElement("button");b.className=`quantity-option${n===selectedCount?" active":""}`;b.textContent=n;b.disabled=n>max||isSpinning;b.onclick=()=>{selectedCount=n;balanceUI();};$("quantityOptions").append(b);}$("spinButton").disabled=isSpinning||max<1;$("quickSpin").disabled=isSpinning||max<1;$("quickSpin").classList.toggle("active",quickCaseMode);$("quickSpin").setAttribute("aria-pressed",String(quickCaseMode));$("spinButtonText").textContent=isSpinning?"КРУТИМ...":`${quickCaseMode?"БЫСТРО ОТКРЫТЬ":"ОТКРЫТЬ"} ×${selectedCount}`;$("caseSpeedNote").textContent=quickCaseMode?"Быстрый режим выбран · запуск по кнопке «Открыть».":"Обычная прокрутка · нажми ϟ, чтобы выбрать быструю.";}
  function setView(id){["homeView","caseView","upgradeView","inventoryView"].forEach(v=>$(v).classList.toggle("hidden",v!==id));document.querySelectorAll(".tab-button").forEach(b=>b.classList.toggle("active",b.dataset.view===id||(id==="caseView"&&b.dataset.view==="homeView")));window.scrollTo({top:0,behavior:"smooth"});if(id==="upgradeView")renderUpgrade();if(id==="inventoryView")renderInventory();}
  function chooseCaseItem(){const pool=ITEMS.filter(i=>i.weight>0),total=pool.reduce((s,i)=>s+i.weight,0),r=randomInt(total);let n=0;for(const item of pool){n+=item.weight;if(r<n)return item;}return pool[0];}
  function prize(item,source="Кейс «Начальный»"){return {uid:newId(),itemId:item.id,name:item.name,emoji:item.emoji,rarity:item.rarity,rarityClass:item.rarityClass,value:item.value,source,createdAt:Date.now()};}
  function renderDrops(){const sample=[ITEMS[3],ITEMS[1],ITEMS[2],ITEMS[0],ITEMS[6],ITEMS[4],ITEMS[7]];$("dropsRail").innerHTML=sample.map((it,i)=>`<div class="drop-card"><div class="drop-emoji">${it.emoji}</div><div class="drop-name">${it.name}</div><div class="drop-player">${["MoonFox","User_83","NightOwl","Raven_7","Ghost","Mika","Player_19"][i]} · Начальный</div></div>`).join("");}
  function renderContents(){$("caseContents").innerHTML=ITEMS.filter(i=>i.weight>0).map(i=>`<div class="content-item"><div class="content-emoji">${i.emoji}</div><div class="content-copy"><div class="content-name">${i.name}</div><div class="content-rarity">${i.rarity}</div></div><div class="content-value">${i.value} B<small>СТОИМОСТЬ</small></div></div>`).join("");}
  function cell(item){const d=document.createElement("div");d.className=`reel-cell rarity-${item.rarityClass}`;d.innerHTML=`<span class="emoji">${item.emoji}</span><span class="short-name">${item.short}</span>`;return d;}
  function renderReels(prizes){
    const area=$("reels");
    const pool=ITEMS.filter(item=>item.weight>0);
    area.innerHTML="";
    return prizes.map((p,index)=>{
      const row=document.createElement("div");row.className="reel-row";
      const track=document.createElement("div");track.className="reel-track";
      const resultIndex=REEL_MIN_RESULT_INDEX+randomInt(REEL_MAX_RESULT_INDEX-REEL_MIN_RESULT_INDEX+1);
      let resultCell=null;
      for(let i=0;i<REEL_CELLS;i++){
        const item=i===resultIndex?getItem(p.itemId):chooseCaseItem();
        const tile=cell(item||pool[0]);
        if(i===resultIndex)resultCell=tile;
        track.append(tile);
      }
      row.append(track);area.append(row);
      return {track,resultCell,index};
    });
  }
  function animatePosition(element,from,to,duration,format){
    const started=performance.now();
    return new Promise(resolve=>{
      function frame(now){
        const progress=Math.min(1,(now-started)/duration);
        const eased=1-Math.pow(1-progress,3.15);
        element.style.transform=format(from+(to-from)*eased);
        if(progress<1)requestAnimationFrame(frame);
        else{element.style.transform=format(to);resolve();}
      }
      requestAnimationFrame(frame);
    });
  }
  async function spin(fast=quickCaseMode){
    if(isSpinning)return;
    const cost=CASE_PRICE*selectedCount;
    if(state.balance<cost){toast("Недостаточно тестовых монет");return;}
    isSpinning=true;state.balance-=cost;
    const prizes=Array.from({length:selectedCount},()=>prize(chooseCaseItem()));
    state.lastDrop=prizes;state.lastCount=selectedCount;state.inventory.push(...prizes);save();balanceUI();
    $("resultPanel").classList.add("hidden");$("rollStatus").textContent=fast?"БЫСТРАЯ КРУТКА":"КРУТИТСЯ";$("rollStatus").style.color="#f2a04d";
    const rows=renderReels(prizes);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const duration=fast?650:9000;
    const animations=rows.map(({track,resultCell,index})=>{
      const viewport=track.parentElement.clientWidth;
      const cellCenter=resultCell.offsetLeft+resultCell.offsetWidth/2;
      const finish=viewport/2-cellCenter;
      track.style.transform="translate3d(0,0,0)";
      return animatePosition(track,0,finish,duration+index*55,value=>`translate3d(${value}px,0,0)`);
    });
    await Promise.all(animations);
    isSpinning=false;$("rollStatus").textContent="ГОТОВО";$("rollStatus").style.color="#a9c18b";
    balanceUI();renderResult();save();
    toast(prizes.length===1?"Находка добавлена в инвентарь":`Получено предметов: ${prizes.length}`);
    $("resultPanel").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function sellLast(){const prizes=state.lastDrop||[];if(!prizes.length)return;const ids=new Set(prizes.map(x=>x.uid)),total=prizes.reduce((s,x)=>s+x.value,0);state.inventory=state.inventory.filter(x=>!ids.has(x.uid));state.balance+=total;state.lastDrop=[];save();balanceUI();renderResult();toast(`Продано за ${money(total)} B`);}
  function renderInventory(){const list=state.inventory;$("inventoryCount").textContent=list.length;$("inventoryWorth").textContent=`${money(list.reduce((s,x)=>s+(Number(x.value)||0),0))} B`;$ ("inventoryGrid").innerHTML=list.length?list.slice().reverse().map(x=>{const available=!!getItem(x.itemId);return `<article class="inventory-card ${available?`rarity-${x.rarityClass||"common"}`:"unavailable"}"><div class="inventory-emoji">${available?x.emoji:"?"}</div><div class="inventory-name">${available?x.name:"Предмет недоступен"}</div><div class="inventory-source">${x.source||"Старый предмет"}</div><div class="inventory-value">${money(x.value||0)} B</div><div class="inventory-actions"><button data-sell="${x.uid}">Продать</button><button class="withdraw-demo" disabled>Вывод</button></div></article>`;}).join(""):'<div class="empty-state">🎒<b>Здесь пока пусто</b><small>Открой кейс, чтобы получить первую находку.</small></div>';
    $("inventoryGrid").querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>sellOne(b.dataset.sell));
    const h=state.history||[];$("upgradeHistory").innerHTML=h.length?h.slice().reverse().slice(0,20).map(x=>`<div class="history-row"><div class="history-icons"><span>${x.fromEmoji}</span><i>→</i><span>${x.toEmoji||"—"}</span></div><div class="history-copy"><b>${x.won?"Победа":"Попытка не удалась"}</b><small>${x.fromName} → ${x.toName||"потеряно"}</small></div><span class="history-state ${x.won?"won":"lost"}">${x.won?"УСПЕХ":"ПРОИГРЫШ"}</span></div>`).join(""):'<div class="empty-state compact-empty">История появится после первой попытки апгрейда.</div>';
  }
  function sellOne(uid){const i=state.inventory.findIndex(x=>x.uid===uid);if(i<0)return;const [x]=state.inventory.splice(i,1);state.balance+=Number(x.value)||0;save();balanceUI();renderInventory();renderUpgrade();toast(`Продано за ${money(x.value)} B`);}
  function rarityClassFor(item){return item?.rarityClass||"common";}
  function renderPicker(){const owned=state.inventory.slice().reverse();$("sourceCount").textContent=String(owned.length);$("sourcePicker").innerHTML=owned.length?owned.map(x=>`<button class="picker-card ${selectedSource===x.uid?"selected":""}" data-source="${x.uid}"><span class="picker-emoji">${getItem(x.itemId)?x.emoji:"?"}</span><b>${getItem(x.itemId)?x.name:"Недоступный предмет"}</b><small>${money(x.value)} B</small></button>`).join(""):'<div class="empty-state compact-empty">Сначала открой кейс и получи предмет.</div>';
    $("sourcePicker").querySelectorAll("[data-source]").forEach(b=>b.onclick=()=>{selectedSource=b.dataset.source;const src=state.inventory.find(x=>x.uid===selectedSource);if(src&&selectedTarget&&chanceFor(src,selectedTarget,Number($("extraBalance").value))<=0)selectedTarget=null;renderUpgrade();});
  }
  function renderTargetPicker(){const q=$("targetSearch").value.trim().toLowerCase(),min=Number($("minValue").value)||0,max=$("maxValue").value===""?Infinity:Number($("maxValue").value);const list=ITEMS.filter(x=>x.value>=min&&x.value<=max&&x.name.toLowerCase().includes(q)).slice().sort((a,b)=>b.value-a.value);$("targetPicker").innerHTML=list.map(x=>`<button class="picker-card target-card ${selectedTarget===x.id?"selected":""}" data-target="${x.id}"><span class="picker-emoji">${x.emoji}</span><b>${x.name}</b><small>${money(x.value)} B</small></button>`).join("")||'<div class="empty-state compact-empty">Ничего не найдено. Измени фильтр.</div>';
    $("targetPicker").querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>{selectedTarget=b.dataset.target;presetMode="";renderUpgrade();});
  }
  function selectedItem(){return state.inventory.find(x=>x.uid===selectedSource)||null;}
  function chanceFor(src,target,extra=0){
    if(!src||!target)return 0;
    const baseChance=(Number(src.value)||0)/(Number(target.value)||1)*100;
    const added=Math.min(EXTRA_FOR_MAX_CHANCE,Math.max(0,Number(extra)||0));
    const balanceBoost=(added/EXTRA_FOR_MAX_CHANCE)*EXTRA_BONUS_MAX;
    return Math.min(75,Math.max(1,baseChance+balanceBoost));
  }
  function updateGauge(){const src=selectedItem(),target=getItem(selectedTarget),extra=Number($("extraBalance").value)||0;const chance=chanceFor(src,target,extra);$("chanceValue").classList.remove("center-win","center-loss");$("chanceValue").textContent=src&&target?`${chance.toFixed(1)}%`:"—";$("chanceCaption").textContent=src&&target?`При успехе получишь ${target.name}`:"Выбери предметы для расчёта";$("gaugeWheel").style.setProperty("--win-angle",`${chance*3.6}deg`);$("gaugeWheel").classList.toggle("has-chance",!!(src&&target));$("upgradeButton").disabled=!(src&&target)||isSpinning;}
  function syncExtra(value){const max=Math.max(0,Math.floor(state.balance));const amount=Math.min(max,Math.max(0,Math.floor(Number(value)||0)));$("extraBalance").value=amount;$("extraAmount").value=amount;$("extraAmount").max=max;$("extraBalance").max=max;$("extraValue").textContent=`${money(amount)} B`;$("extraMax").textContent=`${money(max)} B`;updateGauge();}
  function renderUpgrade(){const src=selectedItem(),target=getItem(selectedTarget);$("upgradeSource").className=`slot-content ${src?"filled-slot":"empty-slot"}`;$("upgradeSource").innerHTML=src?`<span>${getItem(src.itemId)?src.emoji:"?"}</span><b>${src.name}</b><small>${money(src.value)} B</small>`:'<span>＋</span><small>Выбери из инвентаря</small>';
    $("upgradeTarget").className=`slot-content ${target?"filled-slot":"empty-slot"}`;$("upgradeTarget").innerHTML=target?`<span>${target.emoji}</span><b>${target.name}</b><small>${money(target.value)} B</small>`:'<span>✧</span><small>Выбери цель ниже</small>';
    const maxExtra=Math.max(0,Math.floor(state.balance));$("extraBalance").max=maxExtra;$("extraAmount").max=maxExtra;$("extraMax").textContent=`${money(maxExtra)} B`;if(Number($("extraBalance").value)>maxExtra)syncExtra(maxExtra);else{$("extraAmount").value=Number($("extraBalance").value)||0;$("extraValue").textContent=`${money(Number($("extraBalance").value)||0)} B`;}
    document.querySelectorAll(".preset-button").forEach(b=>b.classList.toggle("active",b.dataset.preset===presetMode));$("quickUpgrade").classList.toggle("active",quickUpgradeMode);$("quickUpgrade").setAttribute("aria-pressed",String(quickUpgradeMode));$("upgradeSpeedNote").textContent=quickUpgradeMode?"Быстрый режим выбран · результат сразу после нажатия.":"Плавное замедление · около 9,5 секунд";updateGauge();renderPicker();renderTargetPicker();}
  function choosePreset(p){const src=selectedItem();if(!src){toast("Сначала выбери свой предмет");return;}const wanted=p.startsWith("x")?100/Number.parseFloat(p.slice(1)):Number.parseFloat(p.replace("%",""));if(!Number.isFinite(wanted)){toast("Не удалось определить пресет");return;}const desiredValue=src.value/(wanted/100);const low=p.startsWith("x")?.72:.78;const high=p.startsWith("x")?1.38:1.25;let candidates=ITEMS.filter(x=>x.value>src.value&&x.value>=desiredValue*low&&x.value<=desiredValue*high);if(!candidates.length){candidates=ITEMS.filter(x=>x.value>src.value).sort((a,b)=>Math.abs(a.value-desiredValue)-Math.abs(b.value-desiredValue)).slice(0,1);}if(!candidates.length){toast("Нет предмета дороже выбранного");return;}presetMode=p;selectedTarget=candidates[randomInt(candidates.length)].id;renderUpgrade();}
  function buildPresets(){$("presetButtons").innerHTML=["x2","x5","x10","30%","50%","75%"].map(p=>`<button class="preset-button" type="button" data-preset="${p}">${p.toUpperCase()}</button>`).join("");document.querySelectorAll(".preset-button").forEach(b=>b.onclick=()=>choosePreset(b.dataset.preset));const ticks=$("gaugeWheel").querySelector(".wheel-ticks");ticks.innerHTML=Array.from({length:48},(_,i)=>`<i style="--tick:${i*7.5}deg"></i>`).join("");}
  function confetti(){const host=$("upgradeResult");host.querySelectorAll(".confetti-piece").forEach(x=>x.remove());for(let i=0;i<32;i++){const s=document.createElement("i");s.className="confetti-piece";s.style.left=`${randomInt(100)}%`;s.style.animationDelay=`${randomInt(350)}ms`;s.textContent=["✦","•","✧","🎃"][i%4];host.append(s);}}
  function animateWheel(finalRotation,duration){
    const wheel=$("gaugeWheel"),start=wheelRotation;
    return animatePosition(wheel,start,finalRotation,duration,value=>`rotate(${value}deg)`).then(()=>{wheelRotation=finalRotation;});
  }
  async function runUpgrade(){if(isSpinning)return;const src=selectedItem(),target=getItem(selectedTarget);if(!src||!target)return;const extra=Number($("extraBalance").value)||0;if(extra>state.balance){toast("Недостаточно монет для дополнительной ставки");return;}isSpinning=true;$("upgradeButton").disabled=true;$("upgradeButton").innerHTML="<span>КОЛЕСО КРУТИТСЯ...</span><span>✦</span>";const chance=chanceFor(src,target,extra);const roll=(randomInt(1000000)/1000000)*100;const won=roll<chance;const fromName=src.name,fromEmoji=src.emoji;const rollAngle=roll*3.6;const desiredMod=(360-rollAngle)%360;const currentMod=((wheelRotation%360)+360)%360;const correction=(desiredMod-currentMod+360)%360;const turns=quickUpgradeMode?1:9+randomInt(3);const finalRotation=wheelRotation+turns*360+correction;await animateWheel(finalRotation,quickUpgradeMode?320:9500);const idx=state.inventory.findIndex(x=>x.uid===src.uid);if(idx>=0)state.inventory.splice(idx,1);state.balance-=extra;let received=null;if(won){received=prize(target,"Апгрейд");state.inventory.push(received);}state.history.push({id:newId(),fromName,fromEmoji,toName:won?target.name:"Потеряно",toEmoji:won?target.emoji:"💨",won,at:Date.now(),chance:Number(chance.toFixed(2)),extra});state.history=state.history.slice(-50);state.lastDrop=[];save();isSpinning=false;$("upgradeButton").innerHTML="<span>ЗАПУСТИТЬ АПГРЕЙД</span><span>↗</span>";selectedSource=null;selectedTarget=null;presetMode="";syncExtra(0);const result=$("upgradeResult");result.className=`upgrade-result ${won?"success":"failure"}`;result.innerHTML=won?`<strong>ПОБЕДА!</strong><span>${target.emoji} ${target.name} · ${money(target.value)} B</span>`:`<strong>НИЧЕГО, В СЛЕДУЮЩИЙ РАЗ ПОВЕЗЁТ 😖</strong><span>Предмет ${fromName} потерян. Попробуй ещё раз.</span>`;if(won)confetti();balanceUI();renderUpgrade();renderInventory();const center=$("chanceValue");center.textContent=won?"ПОБЕДА!":"НИЧЕГО";center.classList.toggle("center-win",won);center.classList.toggle("center-loss",!won);$("chanceCaption").textContent=won?"Предмет успешно улучшен":"В следующий раз повезёт 😖";toast(won?"Апгрейд успешен!":"Неудача. Попробуй ещё раз.");}


  $("openStarterCase").onclick=()=>setView("caseView");$("backHome").onclick=()=>setView("homeView");$("brandHome").onclick=()=>setView("homeView");document.querySelectorAll(".tab-button").forEach(b=>b.onclick=()=>setView(b.dataset.view));$("spinButton").onclick=()=>spin(quickCaseMode);$("quickSpin").onclick=()=>{if(isSpinning)return;quickCaseMode=!quickCaseMode;quantityUI();toast(quickCaseMode?"Быстрая прокрутка выбрана":"Обычная прокрутка выбрана");};$("sellAllButton").onclick=sellLast;$("againButton").onclick=()=>{if(state.balance<CASE_PRICE*selectedCount){toast("Не хватает тестовых монет");return;}state.lastDrop=[];renderResult();spin(quickCaseMode);};$("resetDemo").onclick=()=>{if(isSpinning)return;state=freshState();selectedCount=1;selectedSource=null;selectedTarget=null;quickCaseMode=false;quickUpgradeMode=false;wheelRotation=0;save();balanceUI();renderResult();$("reels").innerHTML='<div class="roulette-empty"><span>✦</span><b>ЧТО ЖЕ ВНУТРИ?</b><small>Выбери количество и запускай рулетку</small></div>';$("gaugeWheel").style.transform="rotate(0deg)";renderUpgrade();renderInventory();quantityUI();toast("Демо-счёт сброшен");};
  $("extraBalance").oninput=()=>syncExtra($("extraBalance").value);$("extraAmount").oninput=()=>syncExtra($("extraAmount").value);$("quickUpgrade").onclick=()=>{if(isSpinning)return;quickUpgradeMode=!quickUpgradeMode;$("quickUpgrade").classList.toggle("active",quickUpgradeMode);$("quickUpgrade").setAttribute("aria-pressed",String(quickUpgradeMode));$("upgradeSpeedNote").textContent=quickUpgradeMode?"Быстрый режим выбран · результат сразу после нажатия.":"Плавное замедление · около 9,5 секунд";toast(quickUpgradeMode?"Быстрый апгрейд включён":"Обычная анимация включена");};$("targetSearch").oninput=renderTargetPicker;$("applyFilter").onclick=renderTargetPicker;$("upgradeButton").onclick=runUpgrade;
  buildPresets();renderDrops();renderContents();balanceUI();renderUpgrade();renderInventory();if(state.lastDrop.length){setView("caseView");$("reels").innerHTML='<div class="roulette-empty"><span>✦</span><b>ПОСЛЕДНИЙ ДРОП СОХРАНЁН</b><small>Результат доступен ниже</small></div>';renderResult();}
})();
