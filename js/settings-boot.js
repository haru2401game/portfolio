/* ========================================
   settings-boot.js：設定（OPTIONS）をページを描く前に反映する
   ・アニメーションの強さ（default / lite / none）→ <html> のクラス
   ・言語（ja / en）→ <html lang>。英語のときは訳し終わるまで本文を隠す
   ※ <head> で読み込むので、ここでは小さな処理だけにする（本体は main.js と i18n.js）
======================================== */

(() => {
    const root = document.documentElement;

    // Google Fonts：届くのを待たずに画面を描けるよう、スクリプトから読み込む
    // （届くまでは端末の文字で表示し、届いたら切り替わる。display=swap と同じ動き）
    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=Noto+Sans+JP:wght@400..900&display=swap";
    document.head.append(fonts);

    // 画面に近づいたときに画像を読み込む（作品カードなど、プログラムで作る画像用）
    // ブラウザの loading="lazy" だけだと、閉じている作品一覧の画像までページを開いた瞬間に読み込むブラウザがあったため、
    // 自分で「画面の近くに来たか」を見て、そのときに src を入れる
    const pending = "IntersectionObserver" in window
        ? new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                pending.unobserve(img);
                if (img.dataset.src) img.src = img.dataset.src;
            });
        }, { rootMargin: "800px 0px" })
        : null;
    window.lazyImage = (img, url) => {
        img.loading = "lazy";
        if (!url) return img;
        if (!pending) {
            img.src = url;
            return img;
        }
        img.dataset.src = url;
        pending.observe(img);
        return img;
    };
    // まだ読み込んでいない画像の住所（src か data-src）
    window.imageUrlOf = (img) => (img ? img.getAttribute("src") || img.dataset.src || "" : "");
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
