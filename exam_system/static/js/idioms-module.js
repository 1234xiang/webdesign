window.initIdiomsModule = function initIdiomsModule() {
    const idiomsDB = [
        { word: "踔厉奋发", pinyin: "chuo li fen fa", meaning: "形容精神振作、斗志昂扬，常用于描述积极进取的状态。", synonyms: "奋发图强、昂扬向上" },
        { word: "高屋建瓴", pinyin: "gao wu jian ling", meaning: "比喻居高临下、势不可挡，也指看问题有全局视野。", synonyms: "居高临下、统揽全局" },
        { word: "防微杜渐", pinyin: "fang wei du jian", meaning: "在问题刚出现苗头时就及时制止，避免事态扩大。", synonyms: "防患未然、未雨绸缪" },
        { word: "源远流长", pinyin: "yuan yuan liu chang", meaning: "比喻历史悠久、根基深厚。", synonyms: "积厚流光、根深叶茂" },
        { word: "按部就班", pinyin: "an bu jiu ban", meaning: "按照一定的步骤和顺序做事。", synonyms: "循序渐进、有条不紊" },
        { word: "有的放矢", pinyin: "you di fang shi", meaning: "比喻说话做事有明确针对性。", synonyms: "对症下药、切中要害" }
    ];

    const container = document.getElementById('idiomListContainer');
    if (!container) return;

    let currentIdx = Math.floor(Math.random() * idiomsDB.length);

    function closeIdiomModal() {
        const modal = document.getElementById('idiomDetailModal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.children[0]?.classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    }

    function openIdiomModal(item) {
        const modalHtml = `
            <div id="idiomDetailModal" class="fixed inset-0 bg-slate-900/70 z-[9999] flex items-center justify-center backdrop-blur-sm opacity-0 transition-opacity duration-300">
                <div class="bg-white w-10/12 max-w-sm rounded-2xl p-8 relative transform scale-95 transition-transform duration-300 shadow-2xl">
                    <button id="closeIdiomBtn" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full font-bold transition-colors bg-slate-50 hover:bg-red-50" type="button">x</button>
                    <div class="text-center mb-6 border-b border-slate-100 pb-6 relative">
                        <h2 class="text-3xl font-extrabold text-indigo-800 tracking-widest mb-2">${item.word}</h2>
                        <p class="text-sm text-slate-500 font-mono tracking-widest bg-slate-50 inline-block px-3 py-1 rounded-full">${item.pinyin}</p>
                    </div>
                    <div class="space-y-5">
                        <div>
                            <span class="inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded mb-2 shadow-sm">释义</span>
                            <p class="text-slate-700 leading-relaxed text-justify text-sm">${item.meaning}</p>
                        </div>
                        <div>
                            <span class="inline-block text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded mb-2 shadow-sm">近义词</span>
                            <p class="text-slate-600 font-medium text-sm">${item.synonyms}</p>
                        </div>
                    </div>
                    <div class="mt-8 text-center">
                        <button id="btnIdiomGotIt" class="bg-indigo-600 text-white px-8 py-2.5 rounded-full font-bold shadow-md hover:bg-indigo-700 transition-colors w-full" type="button">记住了</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        setTimeout(() => {
            const modal = document.getElementById('idiomDetailModal');
            if (!modal) return;
            modal.classList.remove('opacity-0');
            modal.children[0]?.classList.remove('scale-95');
        }, 10);

        document.getElementById('closeIdiomBtn')?.addEventListener('click', closeIdiomModal);
        document.getElementById('btnIdiomGotIt')?.addEventListener('click', closeIdiomModal);
        document.getElementById('idiomDetailModal')?.addEventListener('click', (event) => {
            if (event.target.id === 'idiomDetailModal') closeIdiomModal();
        });
    }

    function renderIdiom() {
        const item = idiomsDB[currentIdx];
        container.innerHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="flex-1 flex flex-col items-center justify-center py-10 w-full">
                    <div id="click-idiom-btn" class="cursor-pointer group flex flex-col items-center" title="点击查看解析">
                        <h3 class="text-4xl md:text-5xl font-extrabold text-slate-900 group-hover:text-slate-700 transition-colors tracking-widest drop-shadow-sm mb-3 select-none">
                            ${item.word}
                        </h3>
                        <div class="mt-2 text-xs text-indigo-400 font-medium tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">
                            <span>查看解析</span>
                        </div>
                    </div>
                </div>
                <div class="mt-auto pt-5 w-full border-t border-slate-100">
                    <button id="next-idiom-btn" class="memory-card-action" type="button">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        换一个
                    </button>
                </div>
            </div>
        `;

        document.getElementById('click-idiom-btn')?.addEventListener('click', () => openIdiomModal(item));
        document.getElementById('next-idiom-btn')?.addEventListener('click', () => {
            currentIdx = (currentIdx + 1) % idiomsDB.length;
            renderIdiom();
        });
    }

    renderIdiom();
};
