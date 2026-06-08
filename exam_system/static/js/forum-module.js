window.initForumModule = function initForumModule() {
    const app = window.examApp;
    if (!app) return;

    const shared = app.shared || window.examShared || {};
    const baseUrl = shared.BASE_URL ?? app.baseUrl ?? '';
    const text = shared.TEXT?.forum || {};
    const commonText = shared.TEXT?.common || {};
    const state = app.state;
    const ui = app.ui;
    const actions = app.actions;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function triggerLikeFeedback(btn, likes) {
        const span = btn?.querySelector('span');
        if (span) span.innerText = likes;
        if (!btn) return;
        btn.classList.remove('like-burst');
        void btn.offsetWidth;
        btn.classList.add('is-liked', 'like-burst');
    }

    function flashCommentSuccess(input) {
        const form = input?.closest('.forum-comment-form');
        if (!form || !input) return;
        form.classList.add('is-success');
        input.classList.add('is-success');
        window.setTimeout(() => {
            form.classList.remove('is-success');
            input.classList.remove('is-success');
        }, 900);
    }

    function renderForumListDom(list) {
        const container = document.getElementById('forumList');
        if (!container) return;

        if (!list || !list.length) {
            container.innerHTML = `<div class="p-10 text-center text-slate-400">${text.empty || '快来抢沙发吧！'}</div>`;
            return;
        }

        container.innerHTML = list.map(post => {
            const comments = Array.isArray(post.comments) ? post.comments : [];
            const currentUser = state.user.get();
            const canDelete = currentUser.role === 'admin' || (currentUser.role !== 'guest' && post.author === currentUser.username);
            const authorInitial = (post.author || '友').charAt(0).toUpperCase();

            return `
                <div class="stat-card bg-white p-6 border border-slate-100 relative">
                    ${canDelete ? `<button type="button" class="absolute top-4 right-4 text-slate-300 hover:text-red-500" onclick="deleteForumPostFromServer(${post.id})">${commonText.delete || '删除'}</button>` : ''}
                    <div class="flex gap-4 items-start">
                        <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold shrink-0 border">${escapeHtml(authorInitial)}</div>
                        <div class="min-w-0 flex-1 pr-8">
                            <div class="flex justify-between items-center gap-4 mb-1">
                                <span class="font-bold text-slate-800">${escapeHtml(post.author)}</span>
                                <span class="text-xs text-slate-400">${escapeHtml(post.time)}</span>
                            </div>
                            <p class="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">${escapeHtml(post.content)}</p>
                            <div class="flex gap-6 text-slate-400 text-sm font-medium">
                                <button type="button" class="forum-like-btn flex items-center gap-1.5 hover:text-red-500" onclick="likePost(${post.id}, this)">${text.like || '点赞'} <span>${post.likes || 0}</span></button>
                                <span class="flex items-center gap-1.5">${text.comment || '评论'} <span>${comments.length}</span></span>
                            </div>

                            <div class="mt-5 rounded-2xl bg-slate-50/80 p-4">
                                <div class="space-y-3">
                                    ${comments.length ? comments.map(comment => {
                                        const canDeleteComment = currentUser.role === 'admin' || (currentUser.role !== 'guest' && comment.author === currentUser.username);
                                        return `
                                        <div class="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
                                            <div class="flex items-center justify-between gap-3">
                                                <span class="text-xs font-bold text-slate-700">${escapeHtml(comment.author)}</span>
                                                <div class="flex items-center gap-3">
                                                    <span class="text-[11px] text-slate-400">${escapeHtml(comment.time)}</span>
                                                    ${canDeleteComment ? `<button type="button" class="text-[11px] font-bold text-slate-300 transition hover:text-red-500" onclick="deleteForumComment(${comment.id})">${commonText.delete || '删除'}</button>` : ''}
                                                </div>
                                            </div>
                                            <p class="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-wrap">${escapeHtml(comment.content)}</p>
                                            <button type="button" class="forum-like-btn mt-2 text-xs font-bold text-slate-400 hover:text-red-500" onclick="likeForumComment(${comment.id}, this)">${text.like || '点赞'} <span>${comment.likes || 0}</span></button>
                                        </div>
                                    `;
                                    }).join('') : `<p class="text-xs text-slate-400">${text.noComments || '还没有评论，来补充一句吧。'}</p>`}
                                </div>
                                <div class="forum-comment-form mt-4 flex gap-3">
                                    <input id="forumCommentInput-${post.id}" class="forum-comment-input form-input flex-1 py-3 text-sm" placeholder="${text.commentPlaceholder || '写下你的评论...'}">
                                    <button type="button" class="forum-comment-submit secondary-btn shrink-0" onclick="submitForumComment(${post.id})">${text.comment || '评论'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function initForum() {
        const btn = document.getElementById('postForumBtn');
        if (!btn) return;

        btn.onclick = async function() {
            const content = document.getElementById('forumContent').value.trim();
            if (!content) return ui.showToast(text.saySomething || '说点什么吧~', 'bg-[#f59e0b]');

            try {
                const res = await fetch(`${baseUrl}/api/forum`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, author: state.user.get().username })
                });
                if ((await res.json()).code === 200) {
                    ui.showToast(text.posted || '发布成功');
                    document.getElementById('forumContent').value = '';
                    fetchForumPosts();
                    actions.fetchAllData();
                }
            } catch (e) {
                ui.showToast(text.postFailed || '发帖失败', 'bg-red-500');
            }
        };
    }

    async function fetchForumPosts() {
        try {
            const res = await fetch(`${baseUrl}/api/forum`);
            const result = await res.json();
            if (result.code === 200) {
                state.data.setForum(result.data);
                renderForumListDom(result.data);
                if (window.updatePieChartData) {
                    window.updatePieChartData();
                }
            }
        } catch (e) {}
    }

    window.deleteForumPostFromServer = async function(id) {
        if (!confirm(text.deleteConfirm || '确定删除这条动态吗？')) return;

        try {
            const currentUser = state.user.get();
            const res = await fetch(`${baseUrl}/api/forum/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_user: currentUser.username, role: currentUser.role })
            });
            const data = await res.json();
            if (data.code !== 200) return ui.showToast(data.msg || text.deleteFailed || '删除失败', 'bg-red-500');
            ui.showToast(text.deleted || '动态已删除');
            fetchForumPosts();
            actions.fetchAllData();
        } catch (e) {
            ui.showToast(text.deleteFailed || '删除失败', 'bg-red-500');
        }
    };

    window.likePost = async function(postId, btn) {
        try {
            const res = await fetch(`${baseUrl}/api/forum/${postId}/like`, { method: 'POST' });
            const data = await res.json();
            if (data.code !== 200) return ui.showToast(data.msg || text.likeFailed || '点赞失败', 'bg-red-500');
            triggerLikeFeedback(btn, data.likes);
        } catch (e) {
            ui.showToast(text.likeFailed || '点赞失败', 'bg-red-500');
        }
    };

    window.likeForumComment = async function(commentId, btn) {
        try {
            const res = await fetch(`${baseUrl}/api/forum/comments/${commentId}/like`, { method: 'POST' });
            const data = await res.json();
            if (data.code !== 200) return ui.showToast(data.msg || text.likeFailed || '点赞失败', 'bg-red-500');
            triggerLikeFeedback(btn, data.likes);
        } catch (e) {
            ui.showToast(text.likeFailed || '点赞失败', 'bg-red-500');
        }
    };

    window.submitForumComment = async function(postId) {
        const input = document.getElementById(`forumCommentInput-${postId}`);
        const content = input?.value.trim();
        if (!content) return ui.showToast(text.commentRequired || '评论内容不能为空', 'bg-[#f59e0b]');

        try {
            const res = await fetch(`${baseUrl}/api/forum/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, author: state.user.get().username })
            });
            const data = await res.json();
            if (data.code !== 200) return ui.showToast(data.msg || text.commentFailed || '评论失败', 'bg-red-500');
            if (input) input.value = '';
            flashCommentSuccess(input);
            ui.showToast(text.commentSuccess || '评论成功');
            fetchForumPosts();
        } catch (e) {
            ui.showToast(text.commentFailed || '评论失败', 'bg-red-500');
        }
    };

    window.deleteForumComment = async function(commentId) {
        if (!confirm('确定删除这条评论吗？')) return;

        try {
            const currentUser = state.user.get();
            const res = await fetch(`${baseUrl}/api/forum/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_user: currentUser.username, role: currentUser.role })
            });
            const data = await res.json();
            if (data.code !== 200) {
                return ui.showToast(data.msg || '删除评论失败', 'bg-red-500');
            }
            ui.showToast('评论已删除');
            fetchForumPosts();
            actions.fetchAllData();
        } catch (e) {
            ui.showToast('删除评论失败', 'bg-red-500');
        }
    };

    app.registerForumApi({
        initForum,
        fetchForumPosts
    });
};
