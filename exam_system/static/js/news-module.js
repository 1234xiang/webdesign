window.initNewsModule = async function initNewsModule(baseUrl = '') {
    const newsGrid = document.getElementById('news-container');
    if (!newsGrid) return;

    const fallbackNewsList = [
        {
            title: "申论热点梳理：基层治理如何做到精准回应",
            source: "备考简报",
            time: "今天 08:30",
            image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
            content: "基层治理考查往往要求把政策导向、现实问题与执行路径串联起来。备考时既要积累规范表达，也要注意从群众视角理解政策落点。"
        },
        {
            title: "行测复盘建议：数据分析题先看结构再看计算",
            source: "知序整理",
            time: "昨天 14:10",
            image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
            content: "资料分析的稳定提分点在于结构识别。先判断题型、再锁定数据区间，最后选择计算路径，会比一上来就列公式更高效。"
        },
        {
            title: "乡村振兴常考表达：从政策语言走向答题语言",
            source: "时政素材库",
            time: "昨天 09:00",
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
            content: "遇到乡村振兴、基层建设、公共服务等主题时，建议把政策表述转成更适合答题的分析语言，这样更容易形成完整论证。"
        }
    ];

    let liveNewsList = fallbackNewsList;
    try {
        const response = await fetch(`${baseUrl}/api/news`);
        const result = await response.json();
        if (result.code === 200 && Array.isArray(result.data) && result.data.length >= 3) {
            liveNewsList = result.data;
        }
    } catch (error) {
        console.warn('实时新闻加载失败，已使用本地备用数据', error);
    }

    function closeModal() {
        const modal = document.getElementById('dynamicNewsModal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.children[0]?.classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    }

    function openNewsModal(news) {
        const modalHtml = `
            <div id="dynamicNewsModal" class="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm opacity-0 transition-opacity duration-300">
                <div class="bg-white w-11/12 max-w-2xl max-h-[88vh] rounded-2xl overflow-hidden shadow-2xl transform scale-95 transition-transform duration-300 relative flex flex-col">
                    <button id="closeDynamicNewsBtn" class="absolute top-4 right-4 bg-black/40 text-white w-8 h-8 rounded-full hover:bg-red-500 transition-colors z-10 flex items-center justify-center font-bold text-lg" type="button">x</button>
                    <div class="relative h-44 md:h-56 w-full shrink-0">
                        <img src="${news.image}" class="w-full h-full object-cover" alt="${news.title}">
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 md:p-8">
                            <h2 class="text-xl md:text-2xl font-bold text-white leading-snug">${news.title}</h2>
                        </div>
                    </div>
                    <div class="custom-scrollbar min-h-0 overflow-y-auto p-6 md:p-8 bg-slate-50">
                        <div class="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                            <span class="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded shadow-sm">${news.source}</span>
                            <span class="text-sm text-slate-500 font-medium">${news.time}</span>
                        </div>
                        <p class="text-slate-700 text-sm md:text-base leading-8 md:leading-9 indent-8 tracking-wide whitespace-pre-line">${news.content}</p>
                        ${news.url ? `<div class="mt-8 text-center"><a href="${news.url}" target="_blank" rel="noopener noreferrer" class="primary-btn inline-flex items-center justify-center">查看原文</a></div>` : ''}
                        <div class="mt-10 text-center">
                            <button id="btnReadDone" class="bg-indigo-600 text-white px-10 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-1" type="button">阅读完成</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        setTimeout(() => {
            const modal = document.getElementById('dynamicNewsModal');
            if (!modal) return;
            modal.classList.remove('opacity-0');
            modal.children[0]?.classList.remove('scale-95');
        }, 10);

        document.getElementById('closeDynamicNewsBtn')?.addEventListener('click', closeModal);
        document.getElementById('btnReadDone')?.addEventListener('click', closeModal);
        document.getElementById('dynamicNewsModal')?.addEventListener('click', (event) => {
            if (event.target.id === 'dynamicNewsModal') closeModal();
        });
    }

    const visibleNews = liveNewsList.slice(0, Math.max(3, Math.min(liveNewsList.length, 6)));
    const carouselNews = visibleNews.length > 3 ? [...visibleNews, ...visibleNews] : visibleNews;
    newsGrid.classList.add('news-carousel-viewport');
    newsGrid.innerHTML = `
        <div class="news-carousel-track ${visibleNews.length > 3 ? 'is-sliding' : ''}">
            ${carouselNews.map((news, index) => `
                <div class="news-carousel-item p-1">
                    <button type="button" class="news-card-btn cursor-pointer group block relative w-full overflow-hidden rounded-xl text-left" data-news-index="${index % visibleNews.length}">
                        <img src="${news.image}" class="w-full h-48 md:h-56 object-cover transform group-hover:scale-105 transition-transform duration-500" alt="${news.title}">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                            <h3 class="text-white text-lg font-bold mb-2 leading-snug drop-shadow-md transition-colors">${news.title}</h3>
                            <div class="flex gap-4 text-xs font-medium text-slate-200">
                                <span class="bg-blue-600/80 px-2 py-0.5 rounded backdrop-blur-sm shadow-sm">${news.source}</span>
                                <span class="opacity-80">${news.time}</span>
                            </div>
                        </div>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    newsGrid.querySelectorAll('.news-card-btn').forEach((card) => {
        card.addEventListener('click', () => {
            openNewsModal(visibleNews[Number(card.dataset.newsIndex)]);
        });
    });
};
