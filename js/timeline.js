/* ========================================
   timeline.js：経歴データ（data/timeline.js）から Timeline を作る

   ・main.js より前に読み込む（main.js / play.js が、ここで作った経歴にワールドマップ・クエストなどを付ける）
   ・経歴の英語（en）は window.I18N_WORKS に集めて、i18n.js が英語表示のときに使う
   ・経歴の追加は data/timeline.js だけを書き換えればよい（README の「経歴を追加するとき」）
======================================== */

(() => {
    const container = document.querySelector(".timeline-container");
    const items = Array.isArray(window.TIMELINE) ? window.TIMELINE : [];
    if (!container || !items.length) return;

    const english = (window.I18N_WORKS = window.I18N_WORKS || {});
    const addEnglish = (ja, en) => {
        const key = String(ja ?? "").replace(/\s+/g, " ").trim();
        if (key && en) english[key] = String(en);
    };

    const el = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = String(text);
        return element;
    };

    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
        const missing = ["date", "title", "text"].filter((key) => !item[key] || (Array.isArray(item[key]) && !item[key].length));
        if (missing.length) {
            console.warn(`data/timeline.js の ${index + 1} 番目の経歴（${item.title || "名前なし"}）に、${missing.join("・")} がありません`);
        }

        const row = el("div", "timeline-item");
        if (item.quest) row.dataset.quest = item.quest;
        row.append(el("div", "timeline-date", item.date || ""));

        const content = el("div", item.photo ? "timeline-content has-photo" : "timeline-content");
        content.append(el("h3", "", item.title || ""));

        // 本文：1行ずつ <br> でつなぐ
        const lines = Array.isArray(item.text) ? item.text : [String(item.text || "")];
        const text = el("p");
        lines.forEach((line, lineIndex) => {
            if (lineIndex) text.append(document.createElement("br"));
            text.append(document.createTextNode(String(line)));
        });
        content.append(text);

        if (item.photo) {
            const photo = item.photo;
            const button = el("button", "timeline-photo");
            button.type = "button";
            if (photo.caption) button.dataset.caption = photo.caption;
            const [width, height] = Array.isArray(photo.size) && photo.size.length === 2 ? photo.size : [1280, 720];
            const image = el("img");
            image.loading = "lazy"; // src より先に付ける（後だと、すぐ読み込みが始まってしまう）
            image.decoding = "async";
            image.src = photo.image || "";
            image.alt = photo.alt || "";
            image.width = width;
            image.height = height;
            if (photo.position) image.style.objectPosition = photo.position;
            button.append(image);
            content.append(button);
        }

        if (item.challenge) {
            const total = Number(item.challenge.total) || 10;
            const box = el("div", "challenge-progress");
            box.dataset.challengeTotal = String(total);

            const head = el("div", "challenge-head");
            const count = el("span", "challenge-count");
            const done = el("b", "", "-");
            done.setAttribute("data-challenge-count", "");
            count.append(done, document.createTextNode(` / ${total}本 クリア`));
            head.append(el("span", "challenge-label", item.challenge.name || "CHALLENGE"), count);

            const bar = el("div", "challenge-bar");
            bar.setAttribute("role", "progressbar");
            bar.setAttribute("aria-label", item.challenge.label || item.title || "");
            bar.setAttribute("aria-valuemin", "0");
            bar.setAttribute("aria-valuemax", String(total));
            bar.setAttribute("aria-valuenow", "0");

            const next = el("p", "challenge-next");
            next.setAttribute("data-challenge-next", "");
            box.append(head, bar, next);
            content.append(box);
        }

        row.append(content);
        fragment.append(row);

        const en = item.en || {};
        addEnglish(item.title, en.title);
        if (Array.isArray(en.text)) lines.forEach((line, lineIndex) => addEnglish(line, en.text[lineIndex]));
        if (item.photo) {
            addEnglish(item.photo.caption, en.caption);
            addEnglish(item.photo.alt, en.alt);
        }
    });

    container.append(fragment);
})();
