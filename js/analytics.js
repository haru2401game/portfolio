/* ========================================
   Access Analytics（自作・Cloudflare Workers）

   - Cookie は使わず、IPアドレスなど個人を特定できる情報も送らない
   - 訪問の区別には、タブを閉じると消えるランダムID（sessionStorage）だけを使う
   - 自分の閲覧を除外するには、URLの末尾に ?notrack を付けて一度開く
     （元に戻すときは ?track を付けて開く）
======================================== */

(() => {
    // デプロイ後に表示される Worker のURL + /collect を入れる（空のあいだは何も送らない）
    const ENDPOINT = "https://portfolio-analytics.haru2401game.workers.dev/collect";

    if (!ENDPOINT) return;

    try {
        const params = new URLSearchParams(location.search);
        if (params.has("notrack")) localStorage.setItem("pa-notrack", "1");
        if (params.has("track")) localStorage.removeItem("pa-notrack");
        if (localStorage.getItem("pa-notrack") === "1") return;
    } catch {
        /* storage unavailable: keep tracking anonymously */
    }

    if (location.protocol === "file:" || /^(localhost|127\.|192\.168\.)/.test(location.hostname)) return;
    if (navigator.webdriver) return;

    /* ---------- 訪問ID（タブを閉じると消える） ---------- */

    const makeId = () => {
        const bytes = new Uint8Array(12);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
    };

    let session = "";
    try {
        session = sessionStorage.getItem("pa-session") || "";
        if (!/^[a-z0-9]{8,32}$/.test(session)) {
            session = makeId();
            sessionStorage.setItem("pa-session", session);
        }
    } catch {
        session = makeId();
    }

    const seen = new Set();
    const remember = (key) => {
        if (seen.has(key)) return false;
        seen.add(key);
        try {
            const stored = JSON.parse(sessionStorage.getItem("pa-seen") || "[]");
            if (stored.includes(key)) return false;
            stored.push(key);
            sessionStorage.setItem("pa-seen", JSON.stringify(stored));
        } catch {
            /* fall back to in-memory only */
        }
        return true;
    };

    /* ---------- 送信（まとめて送る） ---------- */

    const queue = [];
    let timer = 0;

    const flush = () => {
        clearTimeout(timer);
        timer = 0;
        if (!queue.length) return;
        const body = JSON.stringify({ s: session, w: window.innerWidth, events: queue.splice(0, 20) });
        const blob = new Blob([body], { type: "text/plain" });
        if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob))) {
            fetch(ENDPOINT, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
        }
        if (queue.length) flush();
    };

    const track = (t, n = "", extra = {}) => {
        queue.push({ t, n: String(n).trim().slice(0, 80), ...extra });
        if (!timer) timer = setTimeout(flush, 1500);
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
    });

    /* ---------- ページを開いた ---------- */

    let referrer = "";
    try {
        if (document.referrer && new URL(document.referrer).hostname !== location.hostname) {
            referrer = document.referrer;
        }
    } catch {
        referrer = "";
    }
    track("pageview", location.pathname, { r: referrer });

    /* ---------- 読まれたセクション（画面の4割以上を占めたら1回） ---------- */

    const sections = [
        [document.querySelector(".hero"), "hero"],
        ...["about", "achievements", "featured-works", "other-works", "play-games", "what-i-can-do", "timeline", "blog", "contact"]
            .map((id) => [document.getElementById(id), id]),
    ].filter(([element]) => element);

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                // 画面の4割以上を占める、または短いセクションなら6割以上が見えたら「読まれた」
                const visible = entry.intersectionRect.height;
                const enough = Math.min(window.innerHeight * 0.4, entry.boundingClientRect.height * 0.6);
                if (visible < enough) return;
                const name = entry.target.dataset.paSection;
                observer.unobserve(entry.target);
                if (remember(`section:${name}`)) track("section_view", name);
            });
        }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

        sections.forEach(([element, name]) => {
            element.dataset.paSection = name;
            observer.observe(element);
        });
    }

    /* ---------- クリック ---------- */

    const textOf = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");

    document.addEventListener("click", (event) => {
        const target = event.target.closest("a, button");
        if (!target) return;

        const workCard = target.closest(".work-card");
        if (workCard && target.matches("a")) {
            track("work_click", textOf(workCard.querySelector("h3")));
            return;
        }

        const playCard = target.closest(".play-card");
        if (playCard) {
            track("play_click", textOf(playCard.querySelector("h3")) || playCard.hostname);
            return;
        }

        if (target.matches(".tech-photo, .timeline-photo")) {
            const caption = target.dataset.caption || target.querySelector("img")?.alt || "";
            track("photo_open", caption.split("：")[0]);
            return;
        }

        const controls = target.getAttribute("aria-controls");
        if ((controls === "works-drawer" || controls === "quest-drawer") && target.getAttribute("aria-expanded") === "false") {
            track("ui_open", controls === "works-drawer" ? "Other Works" : "Timeline");
            return;
        }

        if (target.matches(".mail-copy")) {
            track("contact_click", "メールアドレスをコピー");
            return;
        }

        if (target.matches("a[href^='mailto:']")) {
            track("contact_click", "メール");
            return;
        }

        if (target.matches("a[href]") && target.hostname && target.hostname !== location.hostname) {
            track("outbound_click", target.hostname.replace(/^www\./, ""));
        }
    }, true);
})();
