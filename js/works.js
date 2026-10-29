/* ========================================
   works.js：作品データ（data/works.js）から Other Works の作品カードを作る

   ・main.js より前に読み込む（main.js は、ここで作ったカードに絞り込み・バッジ・ポップアップなどを付ける）
   ・作品の英語（en）は window.I18N_WORKS に集めて、i18n.js が英語表示のときに使う
   ・作品の追加は data/works.js だけを書き換えればよい（README の「作品を追加するとき」）
======================================== */

(() => {
    const list = document.querySelector(".works-list");
    const works = Array.isArray(window.WORKS) ? window.WORKS : [];
    if (!list || !works.length) return;

    const REQUIRED = ["title", "image", "alt", "genre", "tech", "period", "member", "role", "description", "link"];
    const english = (window.I18N_WORKS = window.I18N_WORKS || {});

    // 英語の対応を登録する（日本語 → 英語。英語が書かれていない項目は日本語のまま）
    const addEnglish = (ja, en) => {
        const key = String(ja ?? "").replace(/\s+/g, " ").trim();
        if (key && en) english[key] = String(en);
    };

    // リンクは http(s) か、このサイトの中のページだけにする（javascript: などを防ぐ）
    const safeLink = (url) => {
        const text = String(url || "").trim();
        return /^(https?:\/\/|\.?\/|[\w-]+\/)/i.test(text) && !/^javascript:/i.test(text) ? text : "";
    };

    const el = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = String(text);
        return element;
    };

    const fragment = document.createDocumentFragment();

    works.forEach((work, index) => {
        const missing = REQUIRED.filter((key) => work[key] === undefined || work[key] === "");
        if (missing.length) {
            console.warn(`data/works.js の ${index + 1} 番目の作品（${work.title || "名前なし"}）に、${missing.join("・")} がありません`);
        }

        const card = el("div", "work-card");
        if (work.preview) card.dataset.preview = work.preview;

        const [width, height] = Array.isArray(work.size) && work.size.length === 2 ? work.size : [1280, 720];
        const image = el("img");
        image.src = work.image || "";
        image.width = width;
        image.height = height;
        image.alt = work.alt || "";
        image.loading = "lazy";

        const content = el("div", "work-content");
        const members = Number(work.member) || 1;
        content.append(
            el("h3", "", work.title || ""),
            el("p", "work-genre", work.genre || ""),
            el("p", "work-tech", work.tech || ""),
            el("p", "work-period", work.period || ""),
            el("p", "work-member", `${members}人`),
            el("p", "work-role", work.role || ""),
            el("p", "work-description", work.description || ""),
        );

        const href = safeLink(work.link);
        const link = el("a", "work-link", "詳細を見る");
        if (href) link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        content.append(link);

        card.append(image, content);
        fragment.append(card);

        const en = work.en || {};
        addEnglish(work.title, en.title);
        addEnglish(work.alt, en.alt);
        addEnglish(work.genre, en.genre);
        addEnglish(work.role, en.role);
        addEnglish(work.description, en.description);
        addEnglish(`${members}人`, members === 1 ? "Solo" : `${members} people`);
    });

    list.append(fragment);
})();
