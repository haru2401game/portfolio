/* ========================================
   notice.js：トップの期間限定のお知らせ（data/notice.js）を出す
   ・クラシック（index.html）と NEW モード（next/index.html）の両方で使う
   ・どちらも「.hero-actions」（ボタンの並び）のすぐ下に入れる
   ・期限（until）を過ぎていたら何もしない
   ・押されたら分析で「お知らせ: <id>」として数える
======================================== */

(() => {
    const notice = window.NOTICE;
    if (!notice || !notice.title || !notice.link?.url) return;
    const until = Date.parse(notice.until || "");
    if (Number.isFinite(until) && Date.now() > until) return;
    if (!/^https:\/\//.test(notice.link.url)) return;

    const actions = document.querySelector(".hero .hero-actions");
    if (!actions) return;

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    };

    const box = el("a", "hero-notice");
    box.href = notice.link.url;
    box.target = "_blank";
    box.rel = "noopener noreferrer";
    const head = el("span", "hero-notice-head");
    head.append(el("b", "hero-notice-label", notice.label || "INFO"), el("span", "hero-notice-title", notice.title));
    box.append(head);
    if (notice.text) box.append(el("span", "hero-notice-text", notice.text));
    box.append(el("span", "hero-notice-cta", notice.link.text || "詳しく見る"));
    box.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("play:event", { detail: { name: `お知らせ: ${notice.id || notice.title}` } }));
    });
    actions.after(box);
})();
