window.examShared = (function createExamShared() {
    const BASE_URL = '';
    const STORAGE_KEYS = {
        focusMinutes: 'exam_system_focus_minutes',
        user: 'exam_system_current_user'
    };
    const PAGE_ROUTES = {
        dashboard: '/',
        mistakes: '/mistakes',
        checkin: '/checkin',
        politics: '/politics',
        idioms: '/idioms',
        forum: '/forum',
        resources: '/resources'
    };
    const ENUMS = {
        mistakes: {
            modules: [
                '\u8d44\u6599\u5206\u6790',
                '\u6570\u91cf\u5173\u7cfb',
                '\u8a00\u8bed\u7406\u89e3',
                '\u5224\u65ad\u63a8\u7406',
                '\u7efc\u5408\u5206\u6790',
                '\u5f52\u7eb3\u6982\u62ec'
            ],
            radarModules: [
                '\u8a00\u8bed\u7406\u89e3',
                '\u6570\u91cf\u5173\u7cfb',
                '\u8d44\u6599\u5206\u6790',
                '\u5224\u65ad\u63a8\u7406',
                '\u7efc\u5408\u5206\u6790'
            ],
            difficulties: [
                '\u7b80\u5355',
                '\u4e2d\u7b49',
                '\u56f0\u96be'
            ],
            masteries: [
                '\u672a\u638c\u63e1',
                '\u590d\u4e60\u4e2d',
                '\u5df2\u638c\u63e1'
            ]
        },
        resources: {
            categories: [
                '\u5168\u90e8',
                '\u884c\u6d4b',
                '\u7533\u8bba',
                '\u65f6\u653f',
                '\u9762\u8bd5\u8d44\u6599'
            ],
            createCategories: [
                '\u884c\u6d4b',
                '\u7533\u8bba',
                '\u65f6\u653f',
                '\u9762\u8bd5\u8d44\u6599'
            ]
        }
    };
    const TEXT = {
        common: {
            delete: '\u5220\u9664',
            requestFailed: '\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3002'
        },
        mistakes: {
            empty: '\u5f53\u524d\u9519\u9898\u672c\u4e3a\u7a7a\uff0c\u5feb\u53bb\u5f55\u5165\u5427\u3002',
            defaultMastery: '\u672a\u638c\u63e1',
            editOwnOnly: '\u4f60\u53ea\u80fd\u4fee\u6539\u81ea\u5df1\u5f55\u5165\u7684\u9519\u9898\u3002',
            noPermission: '\u6743\u9650\u4e0d\u8db3\u3002',
            adminDeleteConfirm: author => `\u3010\u7ba1\u7406\u5458\u7279\u6743\u3011\u786e\u5b9a\u5f3a\u5236\u5220\u9664 ${author} \u7684\u9519\u9898\u5417\uff1f`,
            userDeleteConfirm: '\u786e\u5b9a\u6c38\u4e45\u4ece\u4e91\u7aef\u6570\u636e\u5e93\u5220\u9664\u8fd9\u9053\u9898\u76ee\u5417\uff1f',
            deleted: '\u9519\u9898\u5df2\u4ece\u6570\u636e\u5e93\u79fb\u9664',
            deleteRejected: '\u5220\u9664\u88ab\u670d\u52a1\u5668\u62d2\u7edd',
            deleteFailed: '\u5220\u9664\u8bf7\u6c42\u5931\u8d25',
            contentRequired: '\u9898\u76ee\u5185\u5bb9\u548c\u56fe\u7247\u4e0d\u80fd\u5168\u4e3a\u7a7a\u3002',
            editSaved: '\u4fee\u6539\u4fdd\u5b58\u6210\u529f',
            created: '\u6210\u529f\u5f55\u5165\u6570\u636e\u5e93'
        },
        forum: {
            empty: '\u5feb\u6765\u62a2\u6c99\u53d1\u5427\uff01',
            commentPlaceholder: '\u5199\u4e0b\u4f60\u7684\u8bc4\u8bba...',
            saySomething: '\u8bf4\u70b9\u4ec0\u4e48\u5427~',
            posted: '\u53d1\u5e03\u6210\u529f',
            postFailed: '\u53d1\u5e16\u5931\u8d25',
            deleteConfirm: '\u786e\u5b9a\u5220\u9664\u8fd9\u6761\u52a8\u6001\u5417\uff1f',
            deleted: '\u52a8\u6001\u5df2\u5220\u9664',
            deleteFailed: '\u5220\u9664\u5931\u8d25',
            likeFailed: '\u70b9\u8d5e\u5931\u8d25',
            commentRequired: '\u8bc4\u8bba\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a',
            commentSuccess: '\u8bc4\u8bba\u6210\u529f',
            commentFailed: '\u8bc4\u8bba\u5931\u8d25',
            noComments: '\u8fd8\u6ca1\u6709\u8bc4\u8bba\uff0c\u6765\u8865\u5145\u4e00\u53e5\u5427\u3002',
            like: '\u70b9\u8d5e',
            comment: '\u8bc4\u8bba'
        },
        resources: {
            category: '\u8d44\u6599\u5206\u7c7b',
            uploadShare: '\u4e0a\u4f20\u5206\u4eab\u8d44\u6599',
            loginFirst: '\u8bf7\u5148\u767b\u5f55\u540e\u518d\u5206\u4eab\u8d44\u6599\u3002',
            contentRequired: '\u8d44\u6599\u5185\u5bb9\u6216\u56fe\u7247\u4e0d\u80fd\u4e3a\u7a7a\u3002',
            shareSuccess: '\u5206\u4eab\u6210\u529f',
            shareFailed: '\u5206\u4eab\u5931\u8d25',
            uploadFailed: '\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3002',
            empty: '\u6682\u65e0\u5206\u4eab\u8d44\u6599\uff0c\u5feb\u6765\u9996\u53d1\u5427\u3002',
            adminDelete: '\u7ba1\u7406\u5458\u5220\u9664',
            deleteConfirm: '\u786e\u5b9a\u5220\u9664\u8fd9\u4efd\u5206\u4eab\u8d44\u6599\u5417\uff1f',
            deleted: '\u8d44\u6599\u5df2\u5220\u9664',
            deleteFailed: '\u5220\u9664\u5931\u8d25'
        }
    };

    function readAnalysisField(analysis, fieldName) {
        const segments = Array.from(String(analysis || '').matchAll(/\[[^:\]]+:\s*([^\]]+)\]/g));
        if (!segments.length) return '';
        if (fieldName === '\u6a21\u5757') return segments[0] ? segments[0][1] : '';
        if (fieldName === '\u96be\u5ea6') return segments[1] ? segments[1][1] : '';
        return '';
    }

    function buildMistakeAnalysis(moduleName, difficultyName) {
        return `[\u6a21\u5757: ${moduleName}] | [\u96be\u5ea6: ${difficultyName}]`;
    }

    return {
        BASE_URL,
        STORAGE_KEYS,
        PAGE_ROUTES,
        ENUMS,
        TEXT,
        readAnalysisField,
        buildMistakeAnalysis
    };
})();
