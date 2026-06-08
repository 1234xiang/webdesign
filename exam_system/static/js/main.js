/**
 * Main application script.
 * Contains shared page shell behavior plus data, chart, forum, and resource handlers.
 */

// =====================================================================
// Network patch: bypass the ngrok browser warning in proxied requests.
// =====================================================================
const _originalFetch = window.fetch;
window.fetch = function() {
    let args = Array.prototype.slice.call(arguments);
    if (args[1] === undefined) args[1] = {};
    if (args[1].headers === undefined) args[1].headers = {};
    args[1].headers['ngrok-skip-browser-warning'] = '69420'; 
    return _originalFetch.apply(this, args);
};

// Relative API base and shared constants.
const SHARED = window.examShared || {};
const BASE_URL = SHARED.BASE_URL || "";
const STORAGE_KEYS = SHARED.STORAGE_KEYS || {
    focusMinutes: 'exam_system_focus_minutes',
    user: 'exam_system_current_user'
};
const PAGE_ROUTES = SHARED.PAGE_ROUTES || {
    dashboard: '/',
    mistakes: '/mistakes',
    checkin: '/checkin',
    politics: '/politics',
    idioms: '/idioms',
    forum: '/forum',
    resources: '/resources'
};
const SHARED_ENUMS = SHARED.ENUMS || {};
const MISTAKE_ENUMS = SHARED_ENUMS.mistakes || {};
const DEFAULT_MASTERY = (MISTAKE_ENUMS.masteries && MISTAKE_ENUMS.masteries[0]) || "未掌握";
const RADAR_MODULES = (MISTAKE_ENUMS.radarModules && MISTAKE_ENUMS.radarModules.length)
    ? MISTAKE_ENUMS.radarModules
    : ['言语理解', '数量关系', '资料分析', '判断推理', '综合分析'];

// Shared runtime state.
let lineChart, pieChart, radarChart;
let allMistakesData = []; 
let allResourcesData = []; 
let allForumData = [];     
let currentUser = { username: "热心考友", role: "guest" }; 
let currentImageData = ""; 
let currentEditId = null; 
let currentResourceImageData = ""; 
let totalFocusMinutes = 0;
const fallbackCharts = {
    lineEl: null,
    pieEl: null,
    radarEl: null
};

const mistakeFilters = {
    keyword: '',
    module: '',
    difficulty: '',
    mastery: '',
    tag: ''
};
let resourceCategoryFilter = '';

const examAppState = {
    user: {
        get: () => currentUser,
        set: (value) => { currentUser = value; },
        isGuest: () => currentUser.role === 'guest',
        isAdmin: () => currentUser.role === 'admin'
    },
    data: {
        getMistakes: () => allMistakesData,
        setMistakes: (value) => { allMistakesData = value; },
        getForum: () => allForumData,
        setForum: (value) => { allForumData = value; },
        getResources: () => allResourcesData,
        setResources: (value) => { allResourcesData = value; }
    },
    draft: {
        getMistakeImage: () => currentImageData,
        setMistakeImage: (value) => { currentImageData = value; },
        getEditId: () => currentEditId,
        setEditId: (value) => { currentEditId = value; },
        getResourceImage: () => currentResourceImageData,
        setResourceImage: (value) => { currentResourceImageData = value; }
    },
    filters: {
        getMistakes: () => mistakeFilters,
        setMistake: (key, value) => { mistakeFilters[key] = value; },
        resetMistakes: () => {
            Object.keys(mistakeFilters).forEach(key => { mistakeFilters[key] = ''; });
        },
        getResourceCategory: () => resourceCategoryFilter,
        setResourceCategory: (value) => { resourceCategoryFilter = value; }
    }
};

window.examApp = {
    baseUrl: BASE_URL,
    shared: SHARED,
    mistakesApi: null,
    forumApi: null,
    resourcesApi: null,
    registerMistakesApi(api) { this.mistakesApi = api; },
    registerForumApi(api) { this.forumApi = api; },
    registerResourcesApi(api) { this.resourcesApi = api; },
    state: examAppState,
    readAnalysisField: (analysis, fieldName) => (SHARED.readAnalysisField ? SHARED.readAnalysisField(analysis, fieldName) : ''),
    ui: {
        showToast: (...args) => showToast(...args)
    },
    actions: {
        fetchAllData: () => fetchAllData()
    },
    getCurrentUser: () => examAppState.user.get(),
    setCurrentUser: (value) => examAppState.user.set(value),
    getAllMistakesData: () => examAppState.data.getMistakes(),
    setAllMistakesData: (value) => examAppState.data.setMistakes(value),
    getAllForumData: () => examAppState.data.getForum(),
    setAllForumData: (value) => examAppState.data.setForum(value),
    getAllResourcesData: () => examAppState.data.getResources(),
    setAllResourcesData: (value) => examAppState.data.setResources(value),
    getCurrentImageData: () => examAppState.draft.getMistakeImage(),
    setCurrentImageData: (value) => examAppState.draft.setMistakeImage(value),
    getCurrentEditId: () => examAppState.draft.getEditId(),
    setCurrentEditId: (value) => examAppState.draft.setEditId(value),
    getCurrentResourceImageData: () => examAppState.draft.getResourceImage(),
    setCurrentResourceImageData: (value) => examAppState.draft.setResourceImage(value),
    getMistakeFilters: () => examAppState.filters.getMistakes(),
    setMistakeFilter: (key, value) => examAppState.filters.setMistake(key, value),
    resetMistakeFilters: () => examAppState.filters.resetMistakes(),
    getResourceCategoryFilter: () => examAppState.filters.getResourceCategory(),
    setResourceCategoryFilter: (value) => examAppState.filters.setResourceCategory(value),
    showToast: (...args) => showToast(...args),
    fetchAllData: () => fetchAllData()
};

function saveClientState() {
    localStorage.setItem(STORAGE_KEYS.focusMinutes, String(totalFocusMinutes));
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
}

function loadClientState() {
    const savedMinutes = Number(localStorage.getItem(STORAGE_KEYS.focusMinutes));
    totalFocusMinutes = Number.isFinite(savedMinutes) && savedMinutes > 0 ? savedMinutes : 0;

    try {
        const savedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
        if (savedUser && savedUser.username && savedUser.role) {
            currentUser = savedUser;
        }
    } catch (e) {}
}

function updateUserUI() {
    const badge = document.getElementById('currentUserBadge');
    const heroState = document.getElementById('heroUserState');
    const adminBtnText = document.getElementById('adminBtnText');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const isGuest = currentUser.role === 'guest';
    const displayText = isGuest ? '访客模式' : `${currentUser.username} · ${currentUser.role === 'admin' ? '管理员' : '学员'}`;

    if (badge) badge.innerText = displayText;
    if (heroState) heroState.innerText = isGuest ? '游客模式' : displayText;
    if (adminBtnText) adminBtnText.innerText = isGuest ? '登录知序' : `已登录（${currentUser.username}）`;

    if (adminLoginBtn) {
        adminLoginBtn.classList.toggle('text-indigo-400', currentUser.role === 'admin');
        adminLoginBtn.classList.toggle('bg-indigo-900/20', currentUser.role === 'admin');
    }

    const focusTimeEl = document.getElementById('today-focus-time');
    if (focusTimeEl) focusTimeEl.innerText = totalFocusMinutes;
    updateGuestOverlays();
}

function updateGuestOverlays() {
    const isGuest = currentUser.role === 'guest';
    document.querySelectorAll('[data-guest-lock]').forEach(panel => {
        panel.classList.toggle('hidden', !isGuest);
    });
}

function initGuestOverlays() {
    if (getCurrentPageId() === 'dashboard') {
        return;
    }
    const targets = [
        { selector: '#mistakes .stat-card.overflow-hidden', text: '登录后解锁个人错题本、筛选器与错题管理。' },
        { selector: '#resources #resourceGrid', text: '登录后可查看并筛选个人资料，也可以上传分享资料。' },
        { selector: '#dashboard .grid', text: '登录后首页图表会按你的个人学习数据刷新。' }
    ];

    targets.forEach(item => {
        const target = document.querySelector(item.selector);
        if (!target || target.parentElement?.querySelector('[data-guest-lock]')) return;
        const overlay = document.createElement('div');
        overlay.setAttribute('data-guest-lock', '1');
        overlay.className = 'guest-lock-panel hidden';
        overlay.innerHTML = `
            <div class="guest-lock-card">
                <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Guest Mode</p>
                <h3 class="mt-2 text-xl font-bold text-slate-900">登录后解锁个人数据</h3>
                <p class="mt-2 text-sm text-slate-500">${item.text}</p>
                <button type="button" class="primary-btn mt-5" onclick="document.getElementById('adminLoginBtn')?.click()">立即登录</button>
            </div>
        `;
        target.insertAdjacentElement('beforebegin', overlay);
    });
    updateGuestOverlays();
}

function updateSyncBadge(text, className) {
    const syncBadge = document.getElementById('syncBadge');
    if (!syncBadge) return;
    syncBadge.innerText = text;
    syncBadge.className = `status-pill ${className}`;
}

function getSectionLabel(sectionId) {
    return document.querySelector(`.nav-btn[data-target="${sectionId}"] span`)?.innerText || '学习中心';
}

function getCurrentPageId() {
    const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!path || path === 'dashboard') return 'dashboard';
    return PAGE_ROUTES[path] ? path : 'dashboard';
}

function closeSidebar() {
    document.getElementById('appSidebar')?.classList.remove('sidebar-open');
    document.getElementById('sidebarBackdrop')?.classList.add('hidden');
}

function openSidebar() {
    document.getElementById('appSidebar')?.classList.add('sidebar-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('hidden');
}

function setActiveSection(targetId) {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.tab-content');

    sections.forEach(sec => {
        sec.classList.toggle('active', sec.id === targetId);
    });

    navButtons.forEach(btn => {
        btn.classList.toggle('active-nav', btn.getAttribute('data-target') === targetId);
    });

    const label = document.getElementById('currentSectionLabel');
    if (label) label.innerText = getSectionLabel(targetId);

    if (targetId === 'dashboard') {
        setTimeout(() => {
            if(lineChart) lineChart.resize();
            if(pieChart) pieChart.resize();
            if(radarChart) radarChart.resize();
        }, 200);
    }
}

function updateWeaknessInsight(moduleName) {
    const weakModuleEl = document.getElementById('weak-module');
    const heroWeakness = document.getElementById('heroWeakness');
    const displayName = moduleName || '等待分析中';
    if (weakModuleEl) weakModuleEl.innerText = displayName;
    if (heroWeakness) heroWeakness.innerText = displayName;
}

function renderLineChartFallback(values, labels) {
    const host = fallbackCharts.lineEl;
    if (!host) return;
    const width = 720;
    const height = 320;
    const padding = 34;
    const maxValue = Math.max(...values, 1);
    const stepX = (width - padding * 2) / Math.max(values.length - 1, 1);
    const points = values.map((value, index) => {
        const x = padding + stepX * index;
        const y = height - padding - ((height - padding * 2) * value / maxValue);
        return { x, y, value, label: labels[index] };
    });
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    host.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="h-full w-full" aria-label="近7天刷题趋势">
            <defs>
                <linearGradient id="lineAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(37,99,235,0.28)"></stop>
                    <stop offset="100%" stop-color="rgba(37,99,235,0.03)"></stop>
                </linearGradient>
            </defs>
            ${[0, 1, 2, 3].map(i => {
                const y = padding + ((height - padding * 2) / 3) * i;
                return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(148,163,184,0.18)" stroke-dasharray="5 5"></line>`;
            }).join('')}
            <path d="${areaPath}" fill="url(#lineAreaFill)"></path>
            <path d="${path}" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            ${points.map(point => `
                <g>
                    <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#2563eb"></circle>
                    <circle cx="${point.x}" cy="${point.y}" r="11" fill="rgba(37,99,235,0.12)"></circle>
                    <text x="${point.x}" y="${point.y - 14}" text-anchor="middle" fill="#1e293b" font-size="12" font-weight="700">${point.value}</text>
                    <text x="${point.x}" y="${height - 10}" text-anchor="middle" fill="#64748b" font-size="12">${point.label}</text>
                </g>
            `).join('')}
        </svg>
    `;
}

function renderPieChartFallback(items) {
    const host = fallbackCharts.pieEl;
    if (!host) return;
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    let current = 0;
    const segments = items.map(item => {
        const start = current;
        current += (item.value / total) * 360;
        return `${item.color} ${start}deg ${current}deg`;
    }).join(', ');

    host.innerHTML = `
        <div class="flex h-full flex-col items-center justify-center gap-6">
            <div class="relative h-56 w-56 rounded-full" style="background: conic-gradient(${segments});">
                <div class="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
                    <span class="text-sm font-semibold text-slate-500">学习生态</span>
                    <span class="mt-1 text-3xl font-extrabold text-slate-900">${total}</span>
                </div>
            </div>
            <div class="grid w-full gap-3">
                ${items.map(item => `
                    <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <div class="flex items-center gap-3">
                            <span class="h-3 w-3 rounded-full" style="background:${item.color}"></span>
                            <span class="font-semibold text-slate-600">${item.name}</span>
                        </div>
                        <span class="font-bold text-slate-900">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderRadarChartFallback(modules, scores) {
    const host = fallbackCharts.radarEl;
    if (!host) return;
    const size = 320;
    const center = size / 2;
    const radius = 110;
    const angleStep = (Math.PI * 2) / modules.length;
    const polygonPoints = scores.map((score, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const scaled = radius * (score / 100);
        const x = center + Math.cos(angle) * scaled;
        const y = center + Math.sin(angle) * scaled;
        return `${x},${y}`;
    }).join(' ');

    const labelNodes = modules.map((name, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const labelRadius = radius + 28;
        const x = center + Math.cos(angle) * labelRadius;
        const y = center + Math.sin(angle) * labelRadius;
        return `<text x="${x}" y="${y}" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${name}</text>`;
    }).join('');

    const rings = [1, 0.75, 0.5, 0.25].map(scale => {
        const points = modules.map((_, index) => {
            const angle = -Math.PI / 2 + angleStep * index;
            const x = center + Math.cos(angle) * radius * scale;
            const y = center + Math.sin(angle) * radius * scale;
            return `${x},${y}`;
        }).join(' ');
        return `<polygon points="${points}" fill="none" stroke="rgba(148,163,184,0.2)"></polygon>`;
    }).join('');

    const axes = modules.map((_, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(148,163,184,0.2)"></line>`;
    }).join('');

    host.innerHTML = `
        <div class="flex h-full items-center justify-center">
            <svg viewBox="0 0 ${size} ${size}" class="h-full w-full max-w-[360px]" aria-label="模块掌握度雷达">
                ${rings}
                ${axes}
                <polygon points="${polygonPoints}" fill="rgba(37,99,235,0.22)" stroke="#2563eb" stroke-width="3"></polygon>
                ${scores.map((score, index) => {
                    const angle = -Math.PI / 2 + angleStep * index;
                    const scaled = radius * (score / 100);
                    const x = center + Math.cos(angle) * scaled;
                    const y = center + Math.sin(angle) * scaled;
                    return `<circle cx="${x}" cy="${y}" r="4.5" fill="#2563eb"></circle>`;
                }).join('')}
                ${labelNodes}
            </svg>
        </div>
    `;
}

function computeWeakModule(list) {
    if (!Array.isArray(list) || list.length === 0) return '暂无数据';
    const counts = {};

    list.forEach(item => {
        const match = (item.analysis || '').match(/\[(?:模块|妯″潡):\s*([^\]]+)\]/);
        const moduleName = match ? match[1] : item.subject || '未分类';
        counts[moduleName] = (counts[moduleName] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无数据';
}

function initAppShell() {
    document.getElementById('mobileMenuBtn')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebarBtn')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarBackdrop')?.addEventListener('click', closeSidebar);

    document.querySelectorAll('[data-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-jump');
            navigateWithTransition(PAGE_ROUTES[target] || '/');
        });
    });
}

function navigateWithTransition(targetUrl) {
    if (!targetUrl) return;
    document.body.classList.add('page-leaving');
    window.setTimeout(() => {
        window.location.href = targetUrl;
    }, 170);
}
// =====================================================================
// Global image viewer helper.
// =====================================================================
window.viewLargeImage = function(src) {
    const modalHtml = `
        <div id="imageViewerModal" class="fixed inset-0 bg-slate-900/95 z-[99999] flex items-center justify-center backdrop-blur-md opacity-0 transition-opacity duration-300 cursor-zoom-out">
            <button class="absolute top-6 right-6 text-white hover:text-red-500 w-12 h-12 flex items-center justify-center rounded-full font-bold text-2xl transition-colors bg-white/10 hover:bg-white/20 z-10">×</button>
            <img src="${src}" class="max-w-[90%] max-h-[90vh] object-contain rounded-lg shadow-2xl transform scale-95 transition-transform duration-300" id="largeImgTarget">
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    setTimeout(() => {
        const modal = document.getElementById('imageViewerModal');
        if(modal) {
            modal.classList.remove('opacity-0');
            document.getElementById('largeImgTarget')?.classList.remove('scale-95');
        }
    }, 10);
    
    document.getElementById('imageViewerModal').onclick = function() {
        this.classList.add('opacity-0');
        document.getElementById('largeImgTarget')?.classList.add('scale-95');
        setTimeout(() => this.remove(), 300);
    };
};

// =====================================================================
// 1. App bootstrap
// =====================================================================
function initializeApp() {
    console.log("Initializing app shell...");
    const runStep = (label, fn) => {
        try {
            fn();
        } catch (error) {
            console.error(`Initialization step failed: ${label}`, error);
        }
    };

    try {
        loadClientState();
        runStep('initAppShell', initAppShell);
        runStep('initNavigation', initNavigation);
        runStep('setActiveSection', () => setActiveSection(getCurrentPageId()));
        runStep('initGuestOverlays', initGuestOverlays);
        runStep('initCharts', initCharts);
        runStep('initIdiomsModule', () => {
            if (typeof window.initIdiomsModule === 'function') window.initIdiomsModule();
        });
        runStep('initNewsModule', () => {
            if (typeof window.initNewsModule === 'function') window.initNewsModule(BASE_URL);
        });
        runStep('initMistakesModule', () => {
            if (typeof window.initMistakesModule === 'function') window.initMistakesModule();
        });
        runStep('initForumModule', () => {
            if (typeof window.initForumModule === 'function') window.initForumModule();
        });
        runStep('initResourcesModule', () => {
            if (typeof window.initResourcesModule === 'function') window.initResourcesModule();
        });
        runStep('initModalEvents', initModalEvents);
        runStep('initLoginEvents', initLoginEvents);
        runStep('updateUserUI', updateUserUI);
        runStep('fetchAllData', fetchAllData);
        runStep('fetchForumPosts', () => window.examApp?.forumApi?.fetchForumPosts?.());
        runStep('fetchResources', () => window.examApp?.resourcesApi?.fetchResources?.());
        runStep('fetchExternalAPIs', fetchExternalAPIs);
        runStep('initFuzzySearch', initFuzzySearch);
        runStep('initMistakeFilters', () => window.examApp?.mistakesApi?.initMistakeFilters?.());
        runStep('initPomodoroTimer', initPomodoroTimer);
        runStep('initForum', () => window.examApp?.forumApi?.initForum?.());
        runStep('initResources', () => window.examApp?.resourcesApi?.initResources?.());
        runStep('updateCountdown', updateCountdown);

        document.querySelectorAll('.fixed.inset-0').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    setTimeout(() => this.classList.add('hidden'), 300);
                }
            });
        });
        document.body.classList.add('page-ready');
        console.log("App initialized.");
    } catch (error) {
        console.error("App initialization failed:", error);
        document.body.classList.add('page-ready');
    }
};

window.addEventListener('load', initializeApp);

// =====================================================================
// 2. Navigation
// =====================================================================
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn'); 

    navButtons.forEach(btn => {
        btn.onclick = function(event) {
            if (event) event.preventDefault();
            try {
                const targetId = this.getAttribute('data-target');
                if (targetId === 'mistakes' && currentUser.role === 'guest') {
                    const loginModal = document.getElementById('loginModal');
                    if(loginModal) {
                        loginModal.classList.remove('hidden');
                        setTimeout(() => loginModal.classList.add('show'), 10);
                    }
                    showToast("请先登录再访问核心数据。", "bg-[#f59e0b]");
                    return; 
                }

                const targetUrl = PAGE_ROUTES[targetId] || '/';
                if (targetId === getCurrentPageId()) {
                    setActiveSection(targetId);
                } else {
                    navigateWithTransition(targetUrl);
                }
                closeSidebar();

                if(targetId !== 'mistakes') {
                    const searchInput = document.getElementById('searchInput');
                    if(searchInput) searchInput.value = "";
                }
            } catch(err) {}
        };
    });
}

// =====================================================================
// 3. Core data communication
// =====================================================================
async function fetchAllData() {
    const statusText = document.getElementById('connection-status');
    if(statusText) statusText.innerText = "同步 DB 数据中...";
    updateSyncBadge("同步中", "bg-amber-100 text-amber-700");

    try {
        const resM = await fetch(`${BASE_URL}/api/mistakes`);
        const dataM = await resM.json();
        if (dataM.code === 200) {
            allMistakesData = dataM.data.map(item => ({
                id: item.id,
                author: item.author,
                subject: item.subject,
                module: item.module || "",
                difficulty: item.difficulty || "",
                question: item.content,  
                analysis: item.analysis, 
                tags: item.tags || "",
                mastery: item.mastery || DEFAULT_MASTERY,
                time: item.time,
                image_data: item.image_data || item.image || "" 
            }));

            let visibleMistakes = allMistakesData;
            if (currentUser.role === 'user') {
                visibleMistakes = allMistakesData.filter(m => m.author === currentUser.username);
            } else if (currentUser.role === 'guest') {
                visibleMistakes = [];
            }

            if (window.examApp?.mistakesApi?.renderMistakeTableDom) {
                window.examApp.mistakesApi.renderMistakeTableDom(visibleMistakes);
            }
            if (document.getElementById('mistakeFilterPanel') && window.examApp?.mistakesApi?.applyMistakeFilters) {
                window.examApp.mistakesApi.applyMistakeFilters();
            }
            updateRadarChart(visibleMistakes);
            updateWeaknessInsight(computeWeakModule(visibleMistakes));
        }

        const resS = await fetch(`${BASE_URL}/api/statistics`);
        const dataS = await resS.json();
        if (dataS.code === 200) {
            const displayCount = currentUser.role === 'admin' ? allMistakesData.length : allMistakesData.filter(m => m.author === currentUser.username).length;
            renderDashboardDom(dataS.data, displayCount);
        }

        if(statusText) { 
            statusText.innerText = "DB 实时同步中，前端视图已刷新。"; 
            statusText.className = "mt-3 text-xs leading-6 text-emerald-300"; 
        }
        updateSyncBadge("已联通", "bg-emerald-100 text-emerald-700");
    } catch (e) {
        if(statusText) { 
            statusText.innerText = "未连接后端 DB，当前展示部分本地内容。"; 
            statusText.className = "mt-3 text-xs leading-6 text-rose-300"; 
        }
        updateSyncBadge("离线中", "bg-rose-100 text-rose-700");
    }
}

// =====================================================================
// 4. Chart and dashboard orchestration
// =====================================================================

// Shared pie chart updater based on current visible data scope.
window.updatePieChartData = function() {
    // Count only the data visible to the current user role.
    const scopedMistakes = currentUser.role === 'admin' ? allMistakesData : allMistakesData.filter(m => currentUser.role !== 'guest' && m.author === currentUser.username);
    const scopedResources = currentUser.role === 'admin' ? allResourcesData : allResourcesData.filter(r => currentUser.role !== 'guest' && r.author === currentUser.username);
    const scopedForum = currentUser.role === 'admin' ? allForumData : allForumData.filter(p => currentUser.role !== 'guest' && p.author === currentUser.username);
    const displayMistakeCount = scopedMistakes.length;
    const resCount = scopedResources.length;
    const forumCount = scopedForum.length;
    const pieItems = [
        { name: '错题数', value: displayMistakeCount, color: '#2563eb' },
        { name: '资源数', value: resCount, color: '#10b981' },
        { name: '动态数', value: forumCount, color: '#f59e0b' }
    ];

    if (!pieChart) {
        renderPieChartFallback(pieItems);
        return;
    }

    pieChart.setOption({
        backgroundColor: 'transparent',
        color: ['#2563eb', '#10b981', '#f59e0b'],
        tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 0, textStyle: { color: '#fff' } },
        graphic: [{
            type: 'text',
            left: 'center',
            top: '43%',
            style: {
                text: '学习生态',
                textAlign: 'center',
                fill: '#0f172a',
                fontSize: 16,
                fontWeight: 700
            }
        }, {
            type: 'text',
            left: 'center',
            top: '51%',
            style: {
                text: `${displayMistakeCount + resCount + forumCount}`,
                textAlign: 'center',
                fill: '#2563eb',
                fontSize: 28,
                fontWeight: 800
            }
        }],
        series: [{
            type: 'pie',
            radius: ['56%', '78%'],
            itemStyle: { borderRadius: 16, borderColor: '#fff', borderWidth: 4 },
            data: pieItems,
            label: { show: true, formatter: '{b}\n{c}', color: '#475569', fontWeight: 700 },
            labelLine: { lineStyle: { color: 'rgba(100,116,139,0.35)' } }
        }]
    });
};

function renderDashboardDom(stats, displayMistakeCount) {
    const elCount = document.getElementById('stat-count-big');
    if(elCount) elCount.innerText = displayMistakeCount;
    const greeting = document.getElementById('dashboardGreeting');
    const subcopy = document.getElementById('dashboardSubcopy');
    if (greeting) {
        greeting.innerText = currentUser.role === 'guest'
            ? '知序——“知识有序、备考有章”'
            : `${currentUser.username}，今天继续把节奏拉满。`;
    }
    if (subcopy) {
        subcopy.innerText = currentUser.role === 'guest'
            ? '登录后可获得个人错题、资料分享与更完整的学习闭环。'
            : '你的错题、论坛和资料数据正在同一张主视图中联动刷新，方便快速复盘。';
    }

    if(lineChart) {
        lineChart.setOption({ 
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 0, textStyle: { color: '#fff' } }, 
            grid: { left:'3%', right:'4%', bottom:'3%', top:'10%', containLabel: true }, 
            xAxis: { type: 'category', data: ['周一','周二','周三','周四','周五','周六','今日'], axisLine: {show:false}, axisTick: {show:false}, axisLabel: { color: '#64748b' } }, 
            yAxis: { type: 'value', axisLine: {show:false}, axisLabel: { color: '#94a3b8' }, splitLine:{lineStyle:{type:'dashed', color:'rgba(148,163,184,0.2)'}} }, 
            series: [{ data: [12, 18, 15, 25, 30, 22, displayMistakeCount], type: 'line', smooth: true, color: '#2563eb', symbolSize: 10, label: { show: true, position: 'top', color: '#1e293b', fontWeight: 700 }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:'rgba(37,99,235,0.28)'},{offset:1, color:'rgba(37,99,235,0.02)'}]) }, lineStyle: { width: 3 } }] 
        });
    } else {
        renderLineChartFallback([12, 18, 15, 25, 30, 22, displayMistakeCount], ['周一','周二','周三','周四','周五','周六','今日']);
    }

    // Keep the pie chart in sync with the latest aggregated values.
    if (window.updatePieChartData) {
        window.updatePieChartData();
    }
}

function updateRadarChart(list) {
    const modules = RADAR_MODULES;
    const counts = Object.fromEntries(modules.map(name => [name, 0]));

    list.forEach(item => {
        const moduleName = window.examApp?.readAnalysisField(item.analysis, '模块') || item.module || '';
        if (counts[moduleName] !== undefined) counts[moduleName] += 1;
    });

    const maxCount = Math.max(...Object.values(counts), 1);
    const scores = modules.map(name => Math.max(35, 100 - Math.round(((counts[name] || 0) / maxCount) * 55)));

    if (!radarChart) {
        renderRadarChartFallback(modules, scores);
        return;
    }

    radarChart.setOption({
        tooltip: { backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 0, textStyle: { color: '#fff' } },
        radar: {
            indicator: modules.map(name => ({ name, max: 100 })),
            splitArea: { areaStyle: { color: ['rgba(37,99,235,0.03)', 'rgba(37,99,235,0.06)'] } },
            axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
            splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
            name: { textStyle: { color: '#475569', fontSize: 12, fontWeight: 700 } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: scores,
                name: '掌握度评估',
                areaStyle: { color: 'rgba(37, 99, 235, 0.22)' },
                lineStyle: { color: '#2563eb', width: 2.5 },
                itemStyle: { color: '#2563eb' }
            }]
        }]
    });
}

function initCharts() {
    if (typeof window.echarts === 'undefined') {
        console.warn('ECharts is unavailable; skipping chart initialization.');
        fallbackCharts.lineEl = document.getElementById('lineChart');
        fallbackCharts.pieEl = document.getElementById('pieChart');
        fallbackCharts.radarEl = document.getElementById('radarChart');
        return;
    }

    const l = document.getElementById('lineChart');
    const p = document.getElementById('pieChart');
    const r = document.getElementById('radarChart');

    if (l) lineChart = echarts.init(l);
    if (p) pieChart = echarts.init(p);
    if (r) radarChart = echarts.init(r);

    // Run once after chart init so the empty state still renders correctly.
    if (window.updatePieChartData) {
        window.updatePieChartData();
    }
}

// =====================================================================
// 8. Login, utility helpers, and image handling.
// =====================================================================
function initLoginEvents() {
    const loginModal = document.getElementById('loginModal');
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    adminLoginBtn.onclick = () => {
        if(currentUser.role !== 'guest') {
            if(confirm(`确定退出 ${currentUser.username} 吗？`)) {
                currentUser = { username: "热心考友", role: "guest" };
                updateUserUI();
                saveClientState();
                showToast("已安全退出");
                fetchAllData();
                window.examApp?.forumApi?.fetchForumPosts?.();
                window.examApp?.resourcesApi?.fetchResources?.();
            }
            return; 
        }
        loginModal.classList.remove('hidden'); setTimeout(() => loginModal.classList.add('show'), 10);
    };

    document.getElementById('closeLoginBtn').onclick = () => {
        loginModal.classList.remove('show'); setTimeout(() => loginModal.classList.add('hidden'), 300);
    };

    document.getElementById('loginForm').onsubmit = (e) => {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value.trim();
        const p = document.getElementById('loginPassword').value.trim();
        
        if (u === 'admin' && p === '123456') {
            currentUser = { username: "系统管理员", role: "admin" };
            showToast("管理员登录成功，已解锁全站管理权限");
        } else if (u !== '') {
            currentUser = { username: u, role: "user" }; 
            showToast(`欢迎回来，${u}`);
        } else {
            return showToast("请输入账号", "bg-red-500");
        }
        updateUserUI();
        saveClientState();
        document.getElementById('closeLoginBtn').click();
        
        fetchAllData();
        window.examApp?.forumApi?.fetchForumPosts?.();
        window.examApp?.resourcesApi?.fetchResources?.();
    };
}

function initModalEvents() {
    window.examApp?.mistakesApi?.ensureMistakeMetaFields?.();
    document.getElementById('openModalBtn')?.addEventListener('click', () => {
        currentEditId = null; 
        window.examApp?.mistakesApi?.ensureMistakeMetaFields?.();
        document.querySelector('#mistakeModal h3').innerText = "录入新错题";
        document.getElementById('mistakeForm').reset();
        if (document.getElementById('mMastery')) document.getElementById('mMastery').value = DEFAULT_MASTERY;
        document.getElementById('clearImageBtn')?.click();
        const modal = document.getElementById('mistakeModal');
        modal.classList.remove('hidden'); setTimeout(() => modal.classList.add('show'), 10);
    });

    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('mistakeModal');
        modal.classList.remove('show'); setTimeout(() => modal.classList.add('hidden'), 300);
    });

    const mImageInput = document.getElementById('mImage');
    const mImagePreview = document.getElementById('mImagePreview');
    const mPreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (mImageInput) {
        mImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentImageData = event.target.result; 
                    if (mImagePreview) {
                        mImagePreview.src = currentImageData;
                        mImagePreview.style.display = 'block'; 
                    }
                    mPreviewContainer?.classList.remove('hidden');
                    mPreviewContainer?.classList.add('flex');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const clearBtn = document.getElementById('clearImageBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (mImageInput) mImageInput.value = "";
            currentImageData = "";
            if (mImagePreview) {
                mImagePreview.src = "";
                mImagePreview.style.display = 'none';
            }
            mPreviewContainer?.classList.remove('flex');
            mPreviewContainer?.classList.add('hidden');
        });
    }
}

function initPomodoroTimer() {
    const display = document.getElementById('timer-display'); 
    const progressRing = document.getElementById('timer-progress');
    const startBtn = document.getElementById('startTimerBtn'); 
    const resetBtn = document.getElementById('resetTimerBtn');
    if(!startBtn) return;
    
    let timerInterval, totalSeconds = 0, secondsLeft = 0, isRunning = false;
    let currentFocusMinutes = 0;

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const setProgress = (percent) => { progressRing.style.strokeDasharray = `${100 - percent}, 100`; };
    
    startBtn.onclick = function() {
        if (isRunning) return; 
        
        // Read the currently selected focus duration.
        const minutes = parseInt(document.getElementById('timerDuration').value);
        currentFocusMinutes = minutes;
        
        totalSeconds = minutes * 60; 
        secondsLeft = totalSeconds; 
        isRunning = true;
        
        startBtn.innerText = "专注中..."; 
        startBtn.className = "focus-btn bg-slate-300 text-white shadow-none cursor-not-allowed";
        resetBtn.classList.remove('hidden');
        
        timerInterval = setInterval(() => {
            secondsLeft--; 
            display.innerText = fmt(secondsLeft); 
            setProgress((secondsLeft / totalSeconds) * 100);
            
            // When the timer ends, persist the completed focus duration.
            if (secondsLeft <= 0) { 
                clearInterval(timerInterval); 
                
                // 1. Accumulate the completed focus time.
                totalFocusMinutes += currentFocusMinutes;
                saveClientState();
                
                // 2. Reflect the new total in the dashboard metric.
                const focusTimeEl = document.getElementById('today-focus-time');
                if(focusTimeEl) focusTimeEl.innerText = totalFocusMinutes;
                
                // 3. Notify the user and reset the timer state.
                showToast(`专注完成，累计增加 ${currentFocusMinutes} 分钟`); 
                resetBtn.click(); 
            }
        }, 1000);
    };
    
    resetBtn.onclick = function() {
        clearInterval(timerInterval); 
        isRunning = false;
        display.innerText = fmt(totalSeconds); 
        setProgress(100);
        startBtn.innerText = "开始专注";
        startBtn.className = "focus-btn";
        resetBtn.classList.add('hidden');
    };
}

function initFuzzySearch() {
    const input = document.getElementById('searchInput');
    if(!input) return;
    if (input.dataset.enhancedFilter === '1') return;
    input.dataset.enhancedFilter = '1';
    input.addEventListener('input', function(e) {
        const keyword = e.target.value.trim().toLowerCase();
        if (!keyword) {
            return window.examApp?.mistakesApi?.renderMistakeTableDom?.(
                allMistakesData.filter(m => currentUser.role === 'admin' ? true : m.author === currentUser.username)
            );
        }
        
        const filteredData = allMistakesData.filter(m => {
            const isVisible = currentUser.role === 'admin' ? true : m.author === currentUser.username;
            const matchesSearch = (m.question && m.question.toLowerCase().includes(keyword)) || 
                                  (m.analysis && m.analysis.toLowerCase().includes(keyword)) ||
                                  (m.subject && m.subject.toLowerCase().includes(keyword));
            return isVisible && matchesSearch;
        });
        window.examApp?.mistakesApi?.renderMistakeTableDom?.(filteredData);
    });
}

function showToast(msg, bg = "bg-[#10b981]") {
    const t = document.getElementById('toast'); if(!t) return;
    const bgMap = {
        'bg-[#10b981]': '#10b981',
        'bg-[#f59e0b]': '#f59e0b',
        'bg-red-500': '#ef4444'
    };
    t.innerText = msg;
    t.style.background = bgMap[bg] || '#10b981';
    t.className = `text-white px-8 py-3 rounded-full z-[1001] shadow-xl show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}
function updateCountdown() {
    const ele = document.getElementById("countdown"); if(!ele) return;
    const render = () => {
        ele.innerText = `国考倒计时 ${Math.max(0, Math.floor((new Date('2026-11-29').getTime() - new Date().getTime())/86400000))} 天`;
    };
    render();
    setInterval(render, 3600000);
}
window.onresize = () => {
    if (lineChart) lineChart.resize();
    if (pieChart) pieChart.resize();
    if (radarChart) radarChart.resize();
};

// =====================================================================
// 9. Quote loader
// =====================================================================

async function fetchExternalAPIs() {
    const loadQuote = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/quotes`); 
            const data = await res.json();
            const qContent = document.getElementById('quote-content');
            const qAuthor = document.getElementById('quote-author');
            
            if(data.code === 200 && data.data) {
                if(qContent) qContent.innerText = data.data.content;
                if(qAuthor) qAuthor.innerText = `—— ${data.data.author || '佚名'}`;
            } else {
                if(qContent) qContent.innerText = "欲穷千里目，更上一层楼。";
                if(qAuthor) qAuthor.innerText = "—— 王之涣";
            }
        } catch (e) {
            const qContent = document.getElementById('quote-content');
            const qAuthor = document.getElementById('quote-author');
            if(qContent) qContent.innerText = "千淘万漉虽辛苦，吹尽狂沙始到金。";
            if(qAuthor) qAuthor.innerText = "—— 刘禹锡";
        }
    };

    // Load the current quote immediately on page init.
    loadQuote();

    // Reuse the existing quote button instead of introducing another hook.
    const quoteBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('换一句'));
    if (quoteBtns.length > 0) {
        quoteBtns[0].onclick = () => {
            const qContent = document.getElementById('quote-content');
            if (qContent) qContent.innerText = "加载中...";
            loadQuote();
        };
    }
}

// =====================================================================
// 10. Legacy slot intentionally left blank after module extraction.
// =====================================================================






