window.initResourcesModule = function initResourcesModule() {
    const app = window.examApp;
    if (!app) return;

    const shared = app.shared || window.examShared || {};
    const baseUrl = shared.BASE_URL ?? app.baseUrl ?? '';
    const text = shared.TEXT?.resources || {};
    const commonText = shared.TEXT?.common || {};
    const enums = shared.ENUMS?.resources || {};
    const filterCategories = enums.categories || ['全部', '行测', '申论', '时政', '面试资料'];
    const createCategories = enums.createCategories || ['行测', '申论', '时政', '面试资料'];
    const state = app.state;
    const ui = app.ui;
    const actions = app.actions;

    function ensureResourceEnhancements() {
        const grid = document.getElementById('resourceGrid');
        if (grid && !document.getElementById('resourceCategoryFilterPanel')) {
            const panel = document.createElement('div');
            panel.id = 'resourceCategoryFilterPanel';
            panel.className = 'stat-card bg-white/90 p-4 border border-slate-100';
            panel.innerHTML = `
                <div class="flex flex-wrap items-center gap-3">
                    <span class="text-sm font-bold text-slate-700">${text.category || '资料分类'}</span>
                    ${filterCategories.map(name => `
                        <button type="button" class="resource-filter-btn rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50" data-category="${name === filterCategories[0] ? '' : name}">${name}</button>
                    `).join('')}
                </div>
            `;
            grid.insertAdjacentElement('beforebegin', panel);
            panel.querySelectorAll('.resource-filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    state.filters.setResourceCategory(btn.dataset.category || '');
                    panel.querySelectorAll('.resource-filter-btn').forEach(item => item.classList.remove('active-resource-filter'));
                    btn.classList.add('active-resource-filter');
                    renderResourcesDom(state.data.getResources());
                });
            });
            panel.querySelector('.resource-filter-btn')?.classList.add('active-resource-filter');
        }

        const content = document.getElementById('rContent');
        if (content && !document.getElementById('rCategory')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'mb-4';
            wrapper.innerHTML = `
                <label class="mb-2 block text-sm font-medium text-slate-500">${text.category || '资料分类'}</label>
                <select id="rCategory" class="form-select text-sm">
                    ${createCategories.map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
            `;
            content.insertAdjacentElement('beforebegin', wrapper);
        }
    }

    function initResources() {
        const form = document.getElementById('resourceForm');
        const modal = document.getElementById('resourceModal');
        ensureResourceEnhancements();

        const openBtn = document.getElementById('openResourceModalBtn') ||
            Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes(text.uploadShare || '上传分享资料'));

        if (openBtn) {
            openBtn.onclick = () => {
                if (state.user.get().role === 'guest') {
                    ui.showToast(text.loginFirst || '请先登录后再分享资料。', 'bg-[#f59e0b]');
                    return;
                }
                if (form) form.reset();
                document.getElementById('clearRImageBtn')?.click();
                if (modal) {
                    modal.classList.remove('hidden');
                    setTimeout(() => modal.classList.add('show'), 10);
                }
            };
        }

        const closeBtn = document.getElementById('closeResourceBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                if (modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                }
            };
        }

        if (!form) return;

        const rImageInput = document.getElementById('rImage');
        const rPreviewImg = document.getElementById('rImagePreview');
        if (rImageInput) {
            rImageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        state.draft.setResourceImage(event.target.result);
                        if (rPreviewImg) rPreviewImg.src = state.draft.getResourceImage();
                        document.getElementById('rImagePreviewContainer')?.classList.remove('hidden');
                        document.getElementById('rImagePreviewContainer')?.classList.add('flex');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const clearBtn = document.getElementById('clearRImageBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (rImageInput) rImageInput.value = '';
                state.draft.setResourceImage('');
                document.getElementById('rImagePreviewContainer')?.classList.remove('flex');
                document.getElementById('rImagePreviewContainer')?.classList.add('hidden');
            });
        }

        form.onsubmit = async e => {
            e.preventDefault();
            const rContent = document.getElementById('rContent')?.value || '';

            if (!rContent && !state.draft.getResourceImage()) {
                return ui.showToast(text.contentRequired || '资料内容或图片不能为空。', 'bg-red-500');
            }

            const payload = {
                author: state.user.get().username,
                content: rContent,
                image_data: state.draft.getResourceImage(),
                category: document.getElementById('rCategory')?.value || createCategories[0] || '行测'
            };

            try {
                const res = await fetch(`${baseUrl}/api/resources`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.code === 200) {
                    ui.showToast(text.shareSuccess || '分享成功');
                    closeBtn?.click();
                    fetchResources();
                    actions.fetchAllData();
                } else {
                    ui.showToast(result.msg || text.shareFailed || '分享失败', 'bg-red-500');
                }
            } catch (e) {
                ui.showToast(text.uploadFailed || commonText.requestFailed || '请求失败，请检查网络。', 'bg-red-500');
            }
        };
    }

    async function fetchResources() {
        try {
            const res = await fetch(`${baseUrl}/api/resources`);
            const result = await res.json();
            if (result.code === 200) {
                state.data.setResources(result.data);
                ensureResourceEnhancements();
                renderResourcesDom(result.data);
                if (window.updatePieChartData) {
                    window.updatePieChartData();
                }
            }
        } catch (e) {}
    }

    function renderResourcesDom(list) {
        const grid = document.getElementById('resourceGrid');
        if (!grid) return;

        const categoryFilter = state.filters.getResourceCategory();
        list = categoryFilter ? (list || []).filter(r => (r.category || createCategories[0] || '行测') === categoryFilter) : list;

        if (!list || !list.length) {
            grid.innerHTML = `<div class="col-span-full stat-card p-10 text-center text-slate-400">${text.empty || '暂无分享资料，快来首发吧。'}</div>`;
            return;
        }

        grid.innerHTML = list.map(r => {
            const currentUser = state.user.get();
            const canDelete = currentUser.role === 'admin' || (currentUser.role !== 'guest' && r.author === currentUser.username);
            const deleteLabel = currentUser.role === 'admin' ? (text.adminDelete || '管理员删除') : (commonText.delete || '删除');

            return `
            <div class="stat-card p-6 flex flex-col justify-between group bg-white border border-slate-100">
                <div>
                    <div class="flex justify-between items-center mb-4"><span class="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">${r.category || createCategories[0] || '行测'}</span><span class="text-xs text-slate-400">${r.time.substring(0,16)}</span></div>
                    <div class="mb-3 text-xs font-bold text-slate-400">分享人：${r.author}</div>
                    <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${r.content}</p>
                    ${r.image_data ? `<img src="${r.image_data}" onclick="viewLargeImage('${r.image_data}')" class="mt-4 rounded-lg shadow-sm border border-slate-100 max-h-40 w-full object-cover cursor-zoom-in hover:opacity-85 transition-opacity" title="点击查看大图">` : ''}
                </div>
                ${canDelete ? `<div class="mt-5 pt-3 border-t border-red-50 text-right"><button type="button" class="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded transition-colors" onclick="deleteResourceFromServer(${r.id})">${deleteLabel}</button></div>` : ''}
            </div>`;
        }).join('');
    }

    window.deleteResourceFromServer = async function(id) {
        if (!confirm(text.deleteConfirm || '确定删除这份分享资料吗？')) return;

        try {
            const currentUser = state.user.get();
            const res = await fetch(`${baseUrl}/api/resources/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_user: currentUser.username, role: currentUser.role })
            });
            const data = await res.json();
            if (data.code !== 200) return ui.showToast(data.msg || text.deleteFailed || '删除失败', 'bg-red-500');
            ui.showToast(text.deleted || '资料已删除');
            fetchResources();
            actions.fetchAllData();
        } catch (e) {
            ui.showToast(text.deleteFailed || '删除失败', 'bg-red-500');
        }
    };

    app.registerResourcesApi({
        ensureResourceEnhancements,
        initResources,
        fetchResources,
        renderResourcesDom,
        deleteResourceFromServer: window.deleteResourceFromServer
    });
};
