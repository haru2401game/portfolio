/* ========================================
   work-page.js：作品ごとのページ（works/○○/）の小さな動き
   ・プレイ映像（8秒・音なし）のある作品は、画像の上で映像を流す
   ・「動きを減らす」設定の端末・データセーバーのとき・本体の OPTIONS で動きを「なし」にしているときは流さない
======================================== */

(() => {
    const video = document.querySelector(".wp-media video[data-src]");
    if (!video) return;

    let motionOff = false;
    try {
        motionOff = JSON.parse(localStorage.getItem("pa-settings") || "{}").motion === "none";
    } catch {
        motionOff = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    if (motionOff || reduce || saveData) return;

    video.addEventListener("error", () => {
        video.hidden = true;
    });
    video.addEventListener("playing", () => {
        video.hidden = false;
    }, { once: true });
    video.src = video.dataset.src;
    video.play().catch(() => {
        video.hidden = true;
    });
})();
