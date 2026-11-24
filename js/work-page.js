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

/* 紹介動画（YouTube）：押されてから読み込む（ページを開くだけでは YouTube の通信をしない）。youtube-nocookie で、見るまで cookie を使わない */
(() => {
    document.querySelectorAll(".wp-yt[data-youtube]").forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.dataset.youtube;
            if (!/^[\w-]{11}$/.test(id)) return;
            const frame = document.createElement("iframe");
            frame.className = "wp-yt-frame";
            frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
            frame.title = `${button.dataset.title || ""}の紹介動画（YouTube）`;
            frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
            frame.allowFullscreen = true;
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            button.replaceWith(frame);
        });
    });
})();
