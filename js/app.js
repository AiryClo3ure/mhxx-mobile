// MHXX Dex Mobile - Main Application
const DATA_BASE = 'data/';
const cache = {};

function $(sel, ctx) { return (ctx||document).querySelector(sel); }
function $$(sel, ctx) { return [...(ctx||document).querySelectorAll(sel)]; }

// Category definitions
const CATEGORIES = [
  { id:'weapons',       icon:'⚔️', label:'武器',     file:'weapons.json' },
  { id:'armor',         icon:'🛡️', label:'防具',     file:'armor.json' },
  { id:'items',         icon:'🧪', label:'物品',     file:'items.json' },
  { id:'monsters',      icon:'🐉', label:'怪物',     file:'monsters.json' },
  { id:'skills',        icon:'✨', label:'技能',     file:'skills.json' },
  { id:'decorations',   icon:'💎', label:'装饰品',   file:'decorations.json' },
  { id:'monster_hitzones', icon:'🎯', label:'肉质', file:'monster_hitzones.json' },
  { id:'monster_drops', icon:'📦', label:'报酬',    file:'monster_drops.json' },
  { id:'monster_locations', icon:'🗺️', label:'栖息地', file:'monster_locations.json' },
  { id:'recipes',       icon:'🔬', label:'调和配方', file:'recipes.json' },
  { id:'gathering',     icon:'⛏️', label:'采集',    file:'gathering.json' },
  { id:'crafting_materials', icon:'🔧', label:'制作材料', file:'crafting_materials.json' },
];

// Tab config (first 5 + More)
const TABS = [
  { id:'home',     icon:'🏠', label:'首页' },
  { id:'weapons',  icon:'⚔️', label:'武器' },
  { id:'armor',    icon:'🛡️', label:'防具' },
  { id:'monsters', icon:'🐉', label:'怪物' },
  { id:'more',     icon:'📋', label:'更多' },
];

let currentView = { page:'home', category:null, item:null, filter:{} };
let navHistory = [];
let counts = {}; // category counts loaded from counts.json

async function loadData(file) {
  if (cache[file]) return cache[file];
  const label = CATEGORIES.find(c=>c.file===file)?.label||file;
  showLoading(true);
  try {
    // Try fetch first (works with HTTP server)
    const res = await fetch(DATA_BASE+file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache[file] = data;
    return data;
  } catch(e) {
    // If fetch fails (e.g. file:// protocol), try XHR fallback
    try {
      const data = await loadDataXHR(file);
      cache[file] = data;
      return data;
    } catch(e2) {
      console.error('Load failed:', file, e2);
      if (isFileProtocol()) {
        showFileProtocolError();
      } else {
        showError(`加载${label}失败: ${e2.message}`);
      }
      return [];
    }
  } finally {
    showLoading(false);
  }
}

function isFileProtocol() {
  return window.location.protocol === 'file:';
}

function loadDataXHR(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', DATA_BASE+file, true);
    xhr.overrideMimeType('application/json');
    xhr.onload = () => {
      if (xhr.status === 0 || xhr.status === 200) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch(e) { reject(e); }
      } else {
        reject(new Error('XHR failed'));
      }
    };
    xhr.onerror = () => reject(new Error('XHR error'));
    xhr.send();
  });
}

function showFileProtocolError() {
  const c = $('.content');
  if (!c) return;
  c.innerHTML = `<div class="detail" style="text-align:center;padding:40px 20px">
    <div style="font-size:48px;margin-bottom:16px">⚠️</div>
    <h2 style="margin-bottom:12px">需要使用本地服务器</h2>
    <p style="color:var(--dim);margin-bottom:20px;line-height:1.6">
      直接打开 HTML 文件无法加载数据。<br>
      请使用以下方式之一：
    </p>
    <div style="background:var(--surface);border-radius:var(--radius);padding:16px;text-align:left;margin-bottom:16px">
      <p style="font-weight:600;margin-bottom:8px">方式一：运行启动脚本</p>
      <p style="color:var(--dim);font-size:13px">在 <code>mhxx-mobile/</code> 目录下双击运行 <code>start_server.bat</code></p>
    </div>
    <div style="background:var(--surface);border-radius:var(--radius);padding:16px;text-align:left;margin-bottom:16px">
      <p style="font-weight:600;margin-bottom:8px">方式二：手动启动服务器</p>
      <p style="color:var(--dim);font-size:13px">在终端中运行：<br>
      <code style="display:block;padding:8px;margin-top:4px;background:var(--bg);border-radius:4px">cd mhxx-mobile && python -m http.server 8080</code></p>
    </div>
    <div style="background:var(--surface);border-radius:var(--radius);padding:16px;text-align:left;margin-bottom:16px">
      <p style="font-weight:600;margin-bottom:8px">方式三：手机访问</p>
      <p style="color:var(--dim);font-size:13px">启动服务器后，在同一 WiFi 下用手机浏览器访问：<br>
      <code style="display:block;padding:8px;margin-top:4px;background:var(--bg);border-radius:4px">http://你的电脑IP:8080</code></p>
    </div>
    <button onclick="location.reload()" style="padding:12px 32px;background:var(--accent);color:#000;border:none;border-radius:var(--radius);font-size:16px;font-weight:600;cursor:pointer">重试</button>
  </div>`;
}

function showLoading(on) {
  const p = $('progress');
  if (p) p.style.display = on ? 'block' : 'none';
}

function showError(msg) {
  const c = $('.content');
  if (c) c.innerHTML = `<div class="empty">${msg}</div>`;
}

// === Navigation ===
function navigate(page, opt, fromHistory) {
  // Push current page to history (except when going back or initial load)
  if (!fromHistory && page !== 'home') {
    navHistory.push({ page: currentView.page, category: currentView.category });
    // Keep history manageable
    if (navHistory.length > 20) navHistory.shift();
  }

  currentView = { page, category: null, item: null, filter: {} };
  if (page !== 'category') {
    $('.search-bar')?.classList.remove('show');
    searchQuery = '';
  }
  if (page === 'home') { navHistory = []; renderHome(); }
  else if (page === 'more') renderMore();
  else if (page === 'category') {
    currentView.category = opt?.id;
    currentView.filter = {};
    renderCategory(opt);
  } else if (page === 'detail') {
    currentView.page = 'detail';
    currentView.category = opt?.category;
    currentView.item = opt?.item;
    renderDetail(opt);
  }
  updateTabs();
  updateBack();
  scrollToTop();
}

function scrollToTop() {
  const c = $('.content');
  if (c) c.scrollTop = 0;
}

function updateBack() {
  const b = $('.back');
  if (!b) return;
  const show = currentView.page === 'category' || currentView.page === 'detail';
  b.classList.toggle('show', show);
}

let backLock = false;
function goBack() {
  if (backLock) return; // Prevent double-fire from rapid clicks
  backLock = true;
  setTimeout(() => backLock = false, 300);

  const prev = navHistory.pop();
  if (!prev) { navigate('home', null, true); backLock = false; return; }
  if (prev.page === 'detail' || prev.page === 'category') {
    const cat = CATEGORIES.find(c => c.id === prev.category);
    if (cat) navigate('category', cat, true);
    else navigate('home', null, true);
  } else {
    navigate(prev.page, null, true);
  }
}

function updateTabs() {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.page === currentView.page ||
    (currentView.category && t.dataset.page === currentView.category) ||
    (currentView.page === 'more' && t.dataset.page === 'more')));
}

function setTitle(t) {
  const h = $('.header h1');
  if (h) h.textContent = t;
}

// === Data helpers ===
function searchItems(items, query, fields) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    fields.some(f => item[f] && String(item[f]).toLowerCase().includes(q)));
}

function uniqueValues(items, field) {
  return [...new Set(items.map(i=>i[field]).filter(Boolean))].sort();
}

// === Home Page ===
function renderHome() {
  setTitle('MHXX 图鉴');
  const c = $('.content');
  let html = '<div class="home-grid">';
  for (const cat of CATEGORIES) {
    const count = counts[cat.id] ?? '...';
    html += `<div class="home-card" data-id="${cat.id}">
      <div class="icon">${cat.icon}</div>
      <div class="label">${cat.label}</div>
      <div class="count">${count}</div>
    </div>`;
  }
  html += '</div>';
  c.innerHTML = html;
  $('.search-bar').classList.remove('show');
  $$('.home-card').forEach(el => {
    el.addEventListener('click', () => {
      const cat = CATEGORIES.find(c => c.id === el.dataset.id);
      if (cat) navigate('category', cat);
    });
  });
}

// === More Page ===
function renderMore() {
  setTitle('更多分类');
  const c = $('.content');
  const more = CATEGORIES.slice(5);
  let html = '<div class="home-grid">';
  for (const cat of more) {
    const count = counts[cat.id] ?? '...';
    html += `<div class="home-card" data-id="${cat.id}">
      <div class="icon">${cat.icon}</div>
      <div class="label">${cat.label}</div>
      <div class="count">${count}</div>
    </div>`;
  }
  html += '</div>';
  c.innerHTML = html;
  $('.search-bar').classList.remove('show');
  $$('.home-card').forEach(el => {
    el.addEventListener('click', () => {
      const cat = CATEGORIES.find(c => c.id === el.dataset.id);
      if (cat) navigate('category', cat);
    });
  });
}

// === Category list ===
let searchQuery = '';

async function renderCategory(cat) {
  setTitle(cat.label);
  $('.search-bar').classList.add('show');
  const sb = $('.search-bar input');
  sb.value = searchQuery;
  sb.placeholder = `搜索${cat.label}...`;

  const c = $('.content');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';

  const data = await loadData(cat.file);
  renderList(cat, data, searchQuery);
}

let lastFilteredItems = [];

function renderList(cat, data, query, filterField, filterValue) {
  const c = $('.content');
  let items = data;

  if (query) {
    const fields = guessSearchFields(cat.id, data[0]);
    items = searchItems(items, query, fields);
  }
  if (filterField && filterValue) {
    items = items.filter(i => String(i[filterField]) === String(filterValue));
  }

  // Aggregate gathering items by ID
  if (cat.id === 'gathering') {
    const groups = {};
    for (const item of items) {
      const gid = item.ID;
      if (!groups[gid]) {
        groups[gid] = { id: gid, name: item['物品名称'] || '未知', locations: [] };
      }
      if (item['物品名称']) groups[gid].name = item['物品名称'];
      groups[gid].locations.push(item);
    }
    items = Object.values(groups);
    // Sort by name
    items.sort((a, b) => (a.name||'').localeCompare(b.name||'', 'zh'));
  }

  lastFilteredItems = items;

  if (items.length === 0) {
    c.innerHTML = '<div class="empty">没有找到匹配的结果</div>';
    return;
  }

  let html = '';
  // For monsters show chips for classification filter
  if (cat.id === 'monsters' && !filterField) {
    const classes = uniqueValues(data, '分类');
    html += `<div class="chips" data-cat="${cat.id}">`;
    html += `<div class="chip ${!filterValue?'active':''}" data-filter="">全部</div>`;
    for (const cls of classes) {
      html += `<div class="chip ${filterValue===cls?'active':''}" data-filter="${cls}">${cls}</div>`;
    }
    html += '</div>';
  }

  // Category-specific list rendering
  html += renderListItems(cat, items);
  c.innerHTML = html;

  // Bind chip events
  $$('.chips .chip').forEach(el => {
    el.addEventListener('click', () => {
      const fv = el.dataset.filter;
      renderList(cat, data, query, '分类', fv);
    });
  });
}

function guessSearchFields(catId, sample) {
  const nameKeys = ['名称','怪物名称','武器名称','技能名称', '成品名称', '物品名称', '素材名称', '素材1名称', '素材2名称'];
  if (!sample) return nameKeys;
  const keys = Object.keys(sample);
  const found = nameKeys.filter(k => keys.includes(k));
  if (found.length) return found;
  return keys.slice(0, 2);
}

function renderListItems(cat, items) {
  const map = {
    weapons:       item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.名称||item.武器名称||'-'}</div>
        <div class="sub">${item.类型||''} ${item.攻击力?'ATK:'+item.攻击力:''} ${item.会心率?item.会心率+'%':''}</div>
      </div>
      <div class="badge">${item.攻击力||''}</div>
    </div>`,

    armor:         item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.名称||'-'}</div>
        <div class="sub">${item.部位||''} DEF:${item.防御力||0} ${item.火耐性?'🔥'+item.火耐性:''}</div>
      </div>
      <div class="badge">${item.防御力||''}</div>
    </div>`,

    items:         item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.名称||'-'}</div>
        <div class="sub">${item.种类||''} ${item.稀有度?'★'.repeat(item.稀有度):''}</div>
      </div>
      <div class="badge">${item.稀有度?'★'+item.稀有度:''}</div>
    </div>`,

    monsters:      item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.名称||'-'}</div>
        <div class="sub">${item.分类||''} HP:${item.基础HP||0}</div>
      </div>
      <div class="badge safe">${item.基础HP||''}</div>
    </div>`,

    skills:        item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.技能名称||'-'}</div>
        <div class="sub">${item.技能树名称||''} 需求:${item.所需点数||0}</div>
      </div>
      <div class="badge ${(item.所需点数||0)<0?'danger':'safe'}">${item.所需点数||''}</div>
    </div>`,

    decorations:   item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.名称||'-'}</div>
        <div class="sub">${item.技能树||''} ${item.插槽数?'槽'+item.插槽数+'个':''}</div>
      </div>
      <div class="badge">${item.技能点数>0?'+':''}${item.技能点数||''}</div>
    </div>`,

    recipes:       item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.成品名称||'-'}</div>
        <div class="sub">${item.素材1名称||''} + ${item.素材2名称||''}</div>
      </div>
      <div class="badge">${item.成功率?item.成功率+'%':''}</div>
    </div>`,

    monster_drops: item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.怪物名称||'-'} → ${item.物品名称||''}</div>
        <div class="sub">${item.方法||''} ${item.难度||''} ${item.数量?'×'+item.数量:''}</div>
      </div>
      <div class="badge" style="font-size:13px">${item.概率||item['概率(%)']||''}${item['概率(%)']?'%':''}</div>
    </div>`,

    monster_hitzones: item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.怪物名称||'-'} — ${item.部位||''}</div>
        <div class="sub">斩:${item.斩||'-'} 打:${item.打||'-'} 弾:${item.弾||'-'} 🔥:${item.火||'-'} 水:${item.水||'-'} 雷:${item.雷||'-'} 氷:${item.氷||'-'} 龙:${item.龙||'-'}</div>
      </div>
    </div>`,

    monster_locations: item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item.怪物名称||'-'}</div>
        <div class="sub">🗺️ ${item.场地||''} 初始:${item.初始区域||'-'}</div>
      </div>
    </div>`,

    gathering:     item => `<div class="list-item" data-id="${item.id||item.ID}">
      <div class="info">
        <div class="title">${item.name||'-'}</div>
        <div class="sub">${item.locations||item.locations===0?item.locations+' 个采集点':'...'}</div>
      </div>
      <div class="badge">${item.locations||''}</div>
    </div>`,

    crafting_materials: item => `<div class="list-item" data-id="${item.ID}">
      <div class="info">
        <div class="title">${item['武器名称']||item.名称||'-'}</div>
        <div class="sub">${item.素材名称||''} ${item.数量?'×'+item.数量:''}</div>
      </div>
      <div class="badge ${item.关键?'safe':''}">${item.关键?'关键':''}</div>
    </div>`,
  };

  const render = map[cat.id];
  if (!render) {
    // Generic fallback
    const keys = Object.keys(items[0]||{}).slice(0,3);
    return items.map(item => `<div class="list-item" data-id="${item.ID||item.id}">
      <div class="info"><div class="title">${item[keys[0]]||item[keys[1]]||'-'}</div></div>
    </div>`).join('');
  }

  let html = items.map((item, idx) => {
    const r = render(item);
    return r.replace('<div class="list-item"', `<div class="list-item" data-index="${idx}"`);
  }).join('');
  return `<div class="list" data-cat="${cat.id}">${html}</div>`;
}

// === Detail View ===
async function renderDetail(opt) {
  const { category, item } = opt;
  const cat = CATEGORIES.find(c => c.id === category);
  if (!cat) return;

  setTitle(item?.名称 || item?.怪物名称 || '详情');
  $('.search-bar').classList.remove('show');

  const c = $('.content');

  const detailMap = {
    weapons: renderWeaponDetail,
    armor: renderArmorDetail,
    items: renderItemDetail,
    monsters: renderMonsterDetail,
    skills: renderSkillDetail,
    decorations: renderDecorationDetail,
    recipes: renderRecipeDetail,
    monster_drops: renderMonsterDropDetail,
    monster_hitzones: renderHitzoneDetail,
    monster_locations: renderLocationsDetail,
    gathering: renderGatheringDetail,
    crafting_materials: renderCraftingDetail,
  };

  const render = detailMap[category];
  if (render) {
    c.innerHTML = render(item);
  } else {
    renderGeneric(category, item, c);
  }
}

function renderTable(item, fields) {
  let html = '<table class="detail-table">';
  for (const [key, label] of fields) {
    const val = item[key];
    if (val === null || val === undefined || val === '') continue;
    html += `<tr><td>${label}</td><td>${val}</td></tr>`;
  }
  html += '</table>';
  return html;
}

function renderWeaponDetail(item) {
  return `<div class="detail">
    <h2>${item.名称||item.武器名称||'-'}</h2>
    <div class="meta">${item.类型||''} | ID:${item.ID}</div>
    ${renderTable(item, [
      ['类型','类型'],['攻击力','攻击力'],['会心率(%)','会心率'],
      ['属性','属性'],['属性値','属性值'],['防御力','防御力'],
      ['锐利度','锋利度'],['装填速度','装填速度'],['反动','后坐力'],
      ['穿孔','偏移'],['弹种','可用弹药'],
    ])}
  </div>`;
}

function renderArmorDetail(item) {
  const elMap = { '火耐性': '🔥','水耐性': '💧','雷耐性': '⚡','冰耐性': '❄️','龙耐性': '🐉' };
  let elHtml = '';
  for (const [k,icon] of Object.entries(elMap)) {
    if (item[k] !== undefined && item[k] !== null) {
      elHtml += `<span class="skill-tag">${icon} ${item[k]}</span> `;
    }
  }
  return `<div class="detail">
    <h2>${item.名称||'-'}</h2>
    <div class="meta">${item.部位||''} | ${item.性别||''}</div>
    ${renderTable(item, [
      ['防御力','防御力'],['最大防御','最大防御'],['等级','等级'],
    ])}
    <div style="margin-top:8px">${elHtml}</div>
    ${item.所需技能?`<div style="margin-top:12px"><div class="section-title">技能</div><span class="skill-tag">${item.所需技能} ${item.技能点数>0?'+':''}${item.技能点数}</span></div>`:''}
  </div>`;
}

function renderItemDetail(item) {
  return `<div class="detail">
    <h2>${item.名称||'-'}</h2>
    <div class="meta">${item.种类||''} | 稀有度:${item.稀有度||'-'}</div>
    ${item.说明?`<p style="color:var(--dim);font-size:13px;margin:8px 0">${item.说明}</p>`:''}
    ${renderTable(item, [
      ['携带量','携带量'],['买入价格','买入'],['卖出价格','卖出'],
    ])}
  </div>`;
}

function renderMonsterDetail(item) {
  return `<div class="detail">
    <div class="monster-header">
      <div class="info">
        <h2>${item.名称||'-'}</h2>
        <div class="meta">${item.分类||''}</div>
      </div>
      <div class="hp">${item.基础HP||''}</div>
    </div>
    ${item.图标?`<div style="text-align:center;margin:8px 0;color:var(--dim);font-size:12px">图标: ${item.图标}</div>`:''}
    ${renderTable(item, [
      ['基础HP','基础 HP'],
    ])}
  </div>`;
}

function renderSkillDetail(item) {
  return `<div class="detail">
    <h2>${item.技能名称||'-'}</h2>
    <div class="meta">${item.技能树名称||''} | 需求: ${item.所需点数||0}点</div>
    ${item.效果说明?`<p style="color:var(--text);font-size:13px;margin:12px 0;padding:12px;background:var(--surface);border-radius:var(--radius-sm)">${item.效果说明}</p>`:''}
  </div>`;
}

function renderDecorationDetail(item) {
  return `<div class="detail">
    <h2>${item.名称||'-'}</h2>
    <div class="meta">${item.插槽数?'插槽: '+item.插槽数+'个':''}</div>
    ${renderTable(item, [
      ['技能树','技能树'],['技能点数','技能点数'],
    ])}
  </div>`;
}

function renderRecipeDetail(item) {
  return `<div class="detail">
    <h2>${item.成品名称||'-'}</h2>
    ${renderTable(item, [
      ['素材1名称','素材1'],['素材1ID','素材1 ID'],
      ['素材2名称','素材2'],['素材2ID','素材2 ID'],
      ['最少产量','最少产量'],['最大产量','最大产量'],
      ['成功率(%)','成功率'],
    ])}
  </div>`;
}

function renderHitzoneDetail(item) {
  if (!item) return '';
  return `<div class="detail">
    <h2>${item.怪物名称||'-'}</h2>
    <div class="meta">${item.部位||''}</div>
    <table class="zone-table">
      <tr><th>斩</th><th>打</th><th>弾</th><th>🔥</th><th>💧</th><th>⚡</th><th>❄</th><th>🐉</th><th>气绝</th></tr>
      <tr>
        <td>${item.斩||'-'}</td><td>${item.打||'-'}</td><td>${item.弾||'-'}</td>
        <td style="color:var(--el-fire,var(--text))">${item.火||'-'}</td>
        <td style="color:var(--el-water,var(--text))">${item.水||'-'}</td>
        <td style="color:var(--el-thunder,var(--text))">${item.雷||'-'}</td>
        <td style="color:var(--el-ice,var(--text))">${item.氷||'-'}</td>
        <td style="color:var(--el-dragon,var(--text))">${item.龙||'-'}</td>
        <td>${item.气绝||'-'}</td>
      </tr>
    </table>
  </div>`;
}

function renderMonsterDropDetail(item) {
  const prob = item['概率(%)'] || item.概率;
  return `<div class="detail">
    <h2>${item.怪物名称||'-'}</h2>
    <div class="meta">掉落物品</div>
    <table class="detail-table">
      <tr><td>怪物</td><td>${item.怪物名称||'-'}</td></tr>
      <tr><td>物品</td><td>${item.物品名称||'-'}</td></tr>
      <tr><td>方法</td><td>${item.方法||'-'}</td></tr>
      <tr><td>难度</td><td>${item.难度||'-'}</td></tr>
      <tr><td>数量</td><td>${item.数量!=null?item.数量:'-'}</td></tr>
      <tr><td>概率</td><td style="color:var(--accent);font-weight:600">${prob!=null?prob+'%':'-'}</td></tr>
    </table>
  </div>`;
}

function renderCraftingDetail(item) {
  return `<div class="detail">
    <h2>${item['武器名称']||item.名称||'-'}</h2>
    <div class="meta">制作材料</div>
    <table class="detail-table">
      <tr><td>武器</td><td>${item['武器名称']||item.名称||'-'}</td></tr>
      <tr><td>素材</td><td>${item.素材名称||'-'}</td></tr>
      <tr><td>数量</td><td>${item.数量!=null?item.数量:'-'}</td></tr>
      <tr><td>种类</td><td>${item.种类||'-'}</td></tr>
      <tr><td>关键</td><td>${item.关键?'✅ 是':'-'}</td></tr>
    </table>
  </div>`;
}

function renderLocationsDetail(item) {
  return `<div class="detail">
    <h2>${item.怪物名称||'-'}</h2>
    ${renderTable(item, [
      ['场地','场地'],['初始区域','初始区域'],
      ['移动区域','移动区域'],['休息区域','休息区域'],
    ])}
  </div>`;
}

const DIFF_SORT = { '下位':0, '上位':1, 'G位':2, 'G級':2 };

function renderGatheringDetail(group) {
  // group = { id, name, locations: [...] }
  const locs = group.locations || [];

  // Sort by difficulty order, then by area number
  const areaNum = a => {
    const m = a.match(/\d+/);
    return m ? parseInt(m[0]) : 999;
  };
  locs.sort((a, b) => {
    const da = DIFF_SORT[a['难度']] ?? 99;
    const db = DIFF_SORT[b['难度']] ?? 99;
    if (da !== db) return da - db;
    return areaNum(a['区域']||'') - areaNum(b['区域']||'');
  });

  // Group by difficulty
  const byDiff = {};
  for (const loc of locs) {
    const d = loc['难度']||'其他';
    if (!byDiff[d]) byDiff[d] = [];
    byDiff[d].push(loc);
  }

  let html = `<div class="detail">
    <h2>${group.name||'-'}</h2>
    <div class="meta">共 ${locs.length} 个采集点</div>`;

  for (const [diff, rows] of Object.entries(byDiff)) {
    html += `<div class="section-title">${diff}</div>`;
    html += `<table class="gather-table">`;
    for (const r of rows) {
      const prob = r['概率(%)'];
      html += `<tr>
        <td><span style="color:var(--text)">${r['采集场']||'-'}</span><br><span style="font-size:12px;color:var(--dim)">${r['区域']||''} ${r['采集点']||''}</span></td>
        <td style="text-align:right;vertical-align:middle;color:var(--accent);font-weight:600;font-size:16px">${prob!=null?prob+'%':'-'}</td>
      </tr>`;
      if (r['备注']) {
        html += `<tr><td colspan="2" style="font-size:12px;color:var(--dim);padding:0 12px 6px">${r['备注']}</td></tr>`;
      }
    }
    html += `</table>`;
  }

  html += `</div>`;
  return html;
}

function renderGenericDetail(item) {
  const keys = Object.keys(item);
  const fields = keys.map(k => [k, k]);
  return `<div class="detail">
    <h2>${item.名称||item.怪物名称||item.物品名称||'详情'}</h2>
    ${renderTable(item, fields)}
  </div>`;
}

// === Search handling ===
let searchTimer;

function setupSearch() {
  const input = $('.search-bar input');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      searchQuery = input.value;
      if (currentView.page === 'category' && currentView.category) {
        const cat = CATEGORIES.find(c => c.id === currentView.category);
        if (cat) {
          const data = await loadData(cat.file);
          renderList(cat, data, searchQuery);
        }
      }
    }, 250);
  });
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  // Build header
  const header = $('.header');
  header.innerHTML = `
    <button class="back">‹</button>
    <h1>MHXX 图鉴</h1>
    <button class="search-toggle" id="searchToggle">🔍</button>
  `;

  // Build search bar
  const sb = document.createElement('div');
  sb.className = 'search-bar';
  sb.innerHTML = '<input type="text" placeholder="搜索..." />';
  document.body.insertBefore(sb, document.querySelector('.content'));

  // Build tab bar
  const tb = $('.tab-bar');
  tb.innerHTML = TABS.map(t =>
    `<button class="tab" data-page="${t.id}"><span class="tab-icon">${t.icon}</span>${t.label}</button>`
  ).join('');

  // Event listeners
  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const id = t.dataset.page;
      if (id === 'home') navigate('home');
      else if (id === 'more') navigate('more');
      else {
        const cat = CATEGORIES.find(c => c.id === id);
        if (cat) navigate('category', cat);
      }
    });
  });

  $('.back').addEventListener('click', goBack);

  $('.search-toggle')?.addEventListener('click', () => {
    const sb = $('.search-bar');
    sb.classList.toggle('show');
    if (sb.classList.contains('show')) sb.querySelector('input')?.focus();
  });

  setupSearch();

  // Load counts first (tiny file), then render home
  loadData('counts.json').then(c => { counts = c; updateCounts(); });
  // Preload commonly-used data in background
  preloadData();
  navigate('home');
});

function updateCounts() {
  $$('.home-card').forEach(el => {
    const id = el.dataset.id;
    if (counts[id]) el.querySelector('.count').textContent = counts[id];
  });
}

// === Background preloading ===
const PRELOAD_ORDER = ['monsters','skills','decorations','recipes','armor','weapons','items'];

function preloadData() {
  // Load smaller files first, largest last
  let i = 0;
  function loadNext() {
    if (i >= PRELOAD_ORDER.length) return;
    const id = PRELOAD_ORDER[i++];
    const cat = CATEGORIES.find(c => c.id === id);
    if (!cat || cache[cat.file]) { loadNext(); return; }
    fetch(DATA_BASE + cat.file)
      .then(r => r.json())
      .then(d => { cache[cat.file] = d; loadNext(); })
      .catch(() => loadNext());
  }
  // Start preloading after a short delay (let page paint first)
  setTimeout(loadNext, 800);
}

// === IndexedDB persistent cache ===
const DB_NAME = 'mhxx-dex-cache';
const DB_VER = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function dbLoad(file) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readonly');
      const req = tx.objectStore('data').get(file);
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(null); };
    });
  } catch(e) { return null; }
}

async function dbSave(file, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('data', 'readwrite');
    tx.objectStore('data').put(data, file);
    tx.oncomplete = () => db.close();
  } catch(e) { /* ignore */ }
}

// Enhanced loadData with IndexedDB persistence
loadData = async function(file) {
  if (cache[file]) return cache[file];

  // IndexedDB hit (persistent across sessions)
  if (file !== 'counts.json') {
    const dbData = await dbLoad(file);
    if (dbData) { cache[file] = dbData; return dbData; }
  }

  const label = CATEGORIES.find(c=>c.file===file)?.label||file;
  showLoading(true);
  try {
    const res = await fetch(DATA_BASE+file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache[file] = data;
    // Save to IndexedDB for next visit
    if (file !== 'counts.json') dbSave(file, data);
    return data;
  } catch(e) {
    try {
      const data = await loadDataXHR(file);
      cache[file] = data;
      if (file !== 'counts.json') dbSave(file, data);
      return data;
    } catch(e2) {
      console.error('Load failed:', file, e2);
      if (isFileProtocol()) { showFileProtocolError(); }
      else { showError(`加载${label}失败`); }
      return [];
    }
  } finally { showLoading(false); }
};

// Click delegation for list items
document.addEventListener('click', e => {
  const item = e.target.closest('.list-item');
  if (!item) return;
  const list = item.closest('.list');
  if (!list) return;
  const catId = list.dataset.cat;
  const idx = parseInt(item.dataset.index);
  const match = lastFilteredItems[idx];
  if (match) {
    navigate('detail', { category: catId, item: match });
  }
});
