/* ========================================
   look.js：作品ごとのページ（works/）と 404 ページを、選んでいるデザインに合わせる
   ・トップで選んだデザイン（pa-settings.design）を見て、<html data-look="new|classic"> を付ける
   ・見た目の切り替えは CSS 側（css/work-next.css・404.html の中）が data-look で行う
   ・<head> の中で、CSS より先に読み込む（描く前に決めて、ちらつかないように）
   ・新デザインのときだけ、英字の見出し用フォント（Archivo）を読み込む
======================================== */

(() => {
    const DEFAULT = "classic"; // 何も選んでいない人に見せるモード（トップと同じ CLASSIC）
    let design = "";
    try {
        design = (JSON.parse(localStorage.getItem("pa-settings")) || {}).design || "";
    } catch {
        design = "";
    }
    const asked = new URLSearchParams(location.search).get("design");
    if (asked) design = asked === "new" ? "new" : "classic";
    const look = design === "new" || design === "classic" ? design : DEFAULT;
    document.documentElement.dataset.look = look;
    if (look !== "new") return;
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&display=swap";
    document.head.append(font);
})();
