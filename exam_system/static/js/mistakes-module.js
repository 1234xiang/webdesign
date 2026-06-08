window.initMistakesModule = function initMistakesModule() {
    const app = window.examApp;
    if (!app) return;

    const shared = app.shared || window.examShared || {};
    const baseUrl = shared.BASE_URL ?? app.baseUrl ?? '';
    const text = shared.TEXT?.mistakes || {};
    const commonText = shared.TEXT?.common || {};
    const enums = shared.ENUMS?.mistakes || {};
    const moduleOptions = enums.modules || ['资料分析', '数量关系', '言语理解', '判断推理', '综合分析', '归纳概括'];
    const difficultyOptions = enums.difficulties || ['简单', '中等', '困难'];
    const masteryOptions = enums.masteries || [text.defaultMastery || '未掌握', '复习中', '已掌握'];
    const state = app.state;
    const ui = app.ui;
    const actions = app.actions;

    function renderMistakeTableDom(list) {
        const tbody = document.getElementById('mistakeListBody');
        if (!tbody) return;

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-400">${text.empty || '当前错题本为空，快去录入吧。'}</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(m => {
            const mAuthor = m.author || '热心考友';
            const currentUser = state.user.get();
            const canEdit = currentUser.role === 'admin' || (currentUser.role !== 'guest' && mAuthor === currentUser.username);
            const tagsHtml = (m.tags || '')
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
                .map(tag => `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">#${tag}</span>`)
                .join('');

            return `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition-all text-sm">
                <td class="p-5">
                    <div class="font-bold text-indigo-600">${m.subject || '未分类'}</div>
                    <div class="text-[10px] text-slate-400 mt-1">录入人：${mAuthor}</div>
                </td>
                <td class="p-5 text-slate-700">
                    <div class="mb-1 font-medium">${m.question || '无题目内容'}</div>
                    ${m.image_data ? `
                        <div class="mt-3 mb-2">
                            <img src="${m.image_data}" onclick="viewLargeImage('${m.image_data}')" class="max-h-24 rounded shadow-sm border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity" title="点击查看大图">
                        </div>
                    ` : ''}
                    <div class="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                        <strong>智能解析：</strong> ${m.analysis || '暂无解析'}
                    </div>
                    <div class="mt-3 flex flex-wrap gap-1.5">${tagsHtml || '<span class="text-xs text-slate-300">暂无标签</span>'}</div>
                </td>
                <td class="p-5 text-center">
                    <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">${m.mastery || text.defaultMastery || '未掌握'}</span>
                </td>
                <td class="p-5 text-center w-32">
                    ${canEdit ? `
                        <button type="button" class="text-blue-500 font-bold hover:underline mr-3" onclick="editItemFromServer(${m.id})">修改</button>
                        <button type="button" class="text-red-500 font-bold hover:underline" onclick="deleteItemFromServer(${m.id})">${commonText.delete || '删除'}</button>
                    ` : '<span class="text-slate-300 text-xs">无权限</span>'}
                </td>
            </tr>`;
        }).join('');
    }

    function getVisibleMistakeBaseList() {
        const currentUser = state.user.get();
        const allMistakesData = state.data.getMistakes();
        if (currentUser.role === 'admin') return allMistakesData;
        if (currentUser.role === 'user') return allMistakesData.filter(m => m.author === currentUser.username);
        return [];
    }

    function applyMistakeFilters() {
        let list = getVisibleMistakeBaseList();
        const filters = state.filters.getMistakes();
        const keyword = filters.keyword.toLowerCase();
        const tagKeyword = filters.tag.toLowerCase();

        if (filters.module) {
            list = list.filter(m => (m.module || '').includes(filters.module) || shared.readAnalysisField?.(m.analysis, '模块') === filters.module);
        }
        if (filters.difficulty) {
            list = list.filter(m => (m.difficulty || '').includes(filters.difficulty) || shared.readAnalysisField?.(m.analysis, '难度') === filters.difficulty);
        }
        if (filters.mastery) {
            list = list.filter(m => (m.mastery || text.defaultMastery || '未掌握') === filters.mastery);
        }
        if (tagKeyword) {
            list = list.filter(m => (m.tags || '').toLowerCase().includes(tagKeyword));
        }
        if (keyword) {
            list = list.filter(m =>
                (m.question || '').toLowerCase().includes(keyword) ||
                (m.analysis || '').toLowerCase().includes(keyword) ||
                (m.subject || '').toLowerCase().includes(keyword) ||
                (m.module || '').toLowerCase().includes(keyword) ||
                (m.tags || '').toLowerCase().includes(keyword) ||
                (m.mastery || '').toLowerCase().includes(keyword)
            );
        }

        renderMistakeTableDom(list);
    }

    function initMistakeFilters() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput || document.getElementById('mistakeFilterPanel')) return;
        searchInput.dataset.enhancedFilter = '1';

        const panel = document.createElement('div');
        panel.id = 'mistakeFilterPanel';
        panel.className = 'stat-card p-4 bg-white/90 border border-slate-100';
        panel.innerHTML = `
            <div class="grid gap-3 md:grid-cols-5">
                <select id="filterModule" class="form-select py-3 text-sm">
                    <option value="">全部模块</option>
                    ${moduleOptions.map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
                <select id="filterDifficulty" class="form-select py-3 text-sm">
                    <option value="">全部难度</option>
                    ${difficultyOptions.map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
                <select id="filterMastery" class="form-select py-3 text-sm">
                    <option value="">全部掌握状态</option>
                    ${masteryOptions.map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
                <input id="filterTag" class="form-input py-3 text-sm" placeholder="按标签筛选">
                <button id="resetMistakeFilters" type="button" class="secondary-btn">重置筛选</button>
            </div>
        `;

        const section = document.getElementById('mistakes');
        section?.querySelector('.section-banner')?.insertAdjacentElement('afterend', panel);

        const bind = (id, key) => {
            document.getElementById(id)?.addEventListener('input', event => {
                state.filters.setMistake(key, event.target.value.trim());
                applyMistakeFilters();
            });
        };

        bind('filterModule', 'module');
        bind('filterDifficulty', 'difficulty');
        bind('filterMastery', 'mastery');
        bind('filterTag', 'tag');

        searchInput.addEventListener('input', event => {
            state.filters.setMistake('keyword', event.target.value.trim());
            applyMistakeFilters();
        });

        document.getElementById('resetMistakeFilters')?.addEventListener('click', () => {
            state.filters.resetMistakes();
            ['filterModule', 'filterDifficulty', 'filterMastery'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const tagInput = document.getElementById('filterTag');
            if (tagInput) tagInput.value = '';
            searchInput.value = '';
            applyMistakeFilters();
        });
    }

    function ensureMistakeMetaFields() {
        const contentField = document.getElementById('mContent');
        if (!contentField || document.getElementById('mTags')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'mb-5 grid grid-cols-1 gap-4 md:grid-cols-2';
        wrapper.innerHTML = `
            <div>
                <label class="mb-2 block text-sm font-medium text-slate-500">错题标签</label>
                <input id="mTags" class="form-input" placeholder="例如：资料分析、增长率">
            </div>
            <div>
                <label class="mb-2 block text-sm font-medium text-slate-500">掌握状态</label>
                <select id="mMastery" class="form-select">
                    ${masteryOptions.map(name => `<option value="${name}">${name}</option>`).join('')}
                </select>
            </div>
        `;
        contentField.parentNode.insertBefore(wrapper, contentField);
    }

    window.editItemFromServer = function(id) {
        const item = state.data.getMistakes().find(m => m.id === id);
        if (!item) return;

        const mAuthor = item.author || '热心考友';
        const currentUser = state.user.get();
        const canEdit = currentUser.role === 'admin' || (currentUser.role !== 'guest' && mAuthor === currentUser.username);
        if (!canEdit) return ui.showToast(text.editOwnOnly || '你只能修改自己录入的错题。', 'bg-[#f59e0b]');

        state.draft.setEditId(id);
        ensureMistakeMetaFields();
        document.querySelector('#mistakeModal h3').innerText = '修改错题';
        document.getElementById('mSubject').value = item.subject;
        if (document.getElementById('mModule') && item.module) document.getElementById('mModule').value = item.module;
        if (item.difficulty) {
            const diffRadio = document.querySelector(`input[name="mDifficulty"][value="${item.difficulty}"]`);
            if (diffRadio) diffRadio.checked = true;
        }
        document.getElementById('mContent').value = item.question;
        const tagsInput = document.getElementById('mTags');
        const masterySelect = document.getElementById('mMastery');
        if (tagsInput) tagsInput.value = item.tags || '';
        if (masterySelect) masterySelect.value = item.mastery || text.defaultMastery || '未掌握';

        state.draft.setMistakeImage(item.image_data || '');
        const mImagePreview = document.getElementById('mImagePreview');
        const mPreviewContainer = document.getElementById('imagePreviewContainer');
        if (state.draft.getMistakeImage() && mImagePreview) {
            mImagePreview.src = state.draft.getMistakeImage();
            mImagePreview.style.display = 'block';
            mPreviewContainer?.classList.remove('hidden');
            mPreviewContainer?.classList.add('flex');
        } else {
            document.getElementById('clearImageBtn')?.click();
        }

        const modal = document.getElementById('mistakeModal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    };

    window.deleteItemFromServer = async function(id) {
        const item = state.data.getMistakes().find(m => m.id === id);
        if (!item) return;

        const mAuthor = item.author || '热心考友';
        const currentUser = state.user.get();
        const canEdit = currentUser.role === 'admin' || (currentUser.role !== 'guest' && mAuthor === currentUser.username);
        if (!canEdit) return ui.showToast(text.noPermission || '权限不足。', 'bg-[#f59e0b]');

        const confirmMsg = currentUser.role === 'admin'
            ? (text.adminDeleteConfirm ? text.adminDeleteConfirm(mAuthor) : `【管理员特权】确定强制删除 ${mAuthor} 的错题吗？`)
            : (text.userDeleteConfirm || '确定永久从云端数据库删除这道题目吗？');

        if (!confirm(confirmMsg)) return;

        try {
            const url = `${baseUrl}/api/mistakes/${id}?author=${encodeURIComponent(currentUser.username)}&role=${currentUser.role}`;
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_user: currentUser.username, role: currentUser.role })
            });

            const data = await res.json();
            if (data.code === 200) {
                ui.showToast(text.deleted || '错题已从数据库移除');
                actions.fetchAllData();
            } else {
                ui.showToast(data.msg || text.deleteRejected || '删除被服务器拒绝', 'bg-red-500');
            }
        } catch (e) {
            ui.showToast(text.deleteFailed || commonText.requestFailed || '请求失败，请检查网络。', 'bg-red-500');
        }
    };

    const mistakeForm = document.getElementById('mistakeForm');
    if (mistakeForm) {
        mistakeForm.onsubmit = async e => {
            e.preventDefault();
            ensureMistakeMetaFields();

            const diffNode = document.querySelector('input[name="mDifficulty"]:checked');
            const difficultyStr = diffNode ? diffNode.value : (difficultyOptions[1] || '中等');
            const moduleStr = document.getElementById('mModule').value;

            const payload = {
                subject: document.getElementById('mSubject').value,
                content: document.getElementById('mContent').value,
                analysis: shared.buildMistakeAnalysis ? shared.buildMistakeAnalysis(moduleStr, difficultyStr) : `[模块: ${moduleStr}] | [难度: ${difficultyStr}]`,
                author: state.user.get().username,
                current_user: state.user.get().username,
                role: state.user.get().role,
                tags: document.getElementById('mTags')?.value.trim() || '',
                mastery: document.getElementById('mMastery')?.value || text.defaultMastery || '未掌握',
                image_data: state.draft.getMistakeImage()
            };

            if (!payload.content && !payload.image_data) {
                return ui.showToast(text.contentRequired || '题目内容和图片不能全为空。', 'bg-red-500');
            }

            const method = state.draft.getEditId() ? 'PUT' : 'POST';
            const url = state.draft.getEditId() ? `${baseUrl}/api/mistakes/${state.draft.getEditId()}` : `${baseUrl}/api/mistakes`;

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.code === 200) {
                    ui.showToast(state.draft.getEditId() ? (text.editSaved || '修改保存成功') : (text.created || '成功录入数据库'));
                    document.getElementById('closeModalBtn').click();
                    actions.fetchAllData();
                } else {
                    ui.showToast(result.msg, 'bg-red-500');
                }
            } catch (e) {
                ui.showToast(commonText.requestFailed || '请求失败，请检查网络。', 'bg-red-500');
            }
        };
    }

    app.registerMistakesApi({
        renderMistakeTableDom,
        applyMistakeFilters,
        initMistakeFilters,
        ensureMistakeMetaFields
    });
};
