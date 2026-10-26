/* ========================================
   settings-boot.js：設定（OPTIONS）をページを描く前に反映する
   ・アニメーションの強さ（default / lite / none）→ <html> のクラス
   ・言語（ja / en）→ <html lang>。英語のときは訳し終わるまで本文を隠す
   ※ <head> で読み込むので、ここでは小さな処理だけにする（本体は main.js と i18n.js）
======================================== */

(() => {
    const root = document.documentElement;
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem("pa-settings")) || {};
    } catch {
        saved = {};
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let motion = saved.motion;
    if (!["default", "lite", "none"].includes(motion)) {
        // 以前の MOTION スイッチで OFF にしていた人と、端末で動きを減らしている人は「なし」から
        let oldMotion = null;
        try {
            oldMotion = localStorage.getItem("portfolio-motion");
        } catch {
            oldMotion = null;
        }
        motion = oldMotion === "off" || reduced ? "none" : "default";
    }

    root.classList.toggle("motion-off", motion === "none");
    root.classList.toggle("motion-lite", motion === "lite");

    if (saved.lang === "en") {
        root.lang = "en";
        root.classList.add("i18n-wait");
        // 万一訳せなくても、本文が見えないままにならないように
        setTimeout(() => root.classList.remove("i18n-wait"), 2500);
    }
})();
