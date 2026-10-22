/* ========================================
   Like button（サイト全体のいいね）

   - 何回でも押せる。押した数はまとめて送信され、累計に加算される
   - 保存先はアクセス解析と同じ Cloudflare Worker（/likes）
======================================== */

(() => {
    const API = "https://portfolio-analytics.haru2401game.workers.dev/likes";

    if (!API || location.protocol === "file:") return;

    const reduceMotion = () =>
        document.documentElement.classList.contains("motion-off") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- 訪問ID（アクセス解析と共通・タブを閉じると消える） ---------- */

    let session = "";
    try {
        session = sessionStorage.getItem("pa-session") || "";
    } catch {
        session = "";
    }
    if (!/^[a-z0-9]{8,32}$/.test(session)) {
        const bytes = new Uint8Array(12);
        crypto.getRandomValues(bytes);
        session = Array.from(bytes, (b) => (b % 36).toString(36)).join("");
        try {
            sessionStorage.setItem("pa-session", session);
        } catch {
            /* keep in memory */
        }
    }

    /* ---------- ボタン ---------- */

    const button = document.createElement("button");
    button.type = "button";
    button.className = "like-button";
    button.hidden = true;
    button.innerHTML = `
        <span class="like-heart" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>
        </span>
        <span class="like-text">
            <span class="like-count">-</span>
            <span class="like-label">LIKE</span>
        </span>
        <span class="like-combo" aria-hidden="true"></span>`;
    document.body.append(button);

    const countEl = button.querySelector(".like-count");
    const comboEl = button.querySelector(".like-combo");

    let total = 0;
    let pending = 0;
    let sending = false;
    let timer = 0;
    let combo = 0;
    let comboTimer = 0;

    const render = () => {
        const shown = total + pending;
        countEl.textContent = shown.toLocaleString();
        button.setAttribute("aria-label", `このポートフォリオにいいねする（いいね ${shown.toLocaleString()}）`);
    };

    /* ---------- 送信（連打はまとめて送る） ---------- */

    const send = async () => {
        clearTimeout(timer);
        timer = 0;
        if (sending || pending <= 0) return;
        sending = true;
        const n = Math.min(pending, 50);
        try {
            const response = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ s: session, n }),
            });
            if (response.ok) {
                const data = await response.json();
                pending -= n;
                total = Number(data.total) || total;
            }
        } catch {
            /* keep pending and retry with the next press */
        }
        sending = false;
        render();
        if (pending > 0) timer = setTimeout(send, 800);
    };

    const flushOnLeave = () => {
        if (pending <= 0 || !navigator.sendBeacon) return;
        const n = Math.min(pending, 50);
        const blob = new Blob([JSON.stringify({ s: session, n })], { type: "text/plain" });
        if (navigator.sendBeacon(API, blob)) pending -= n;
    };
    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushOnLeave();
    });

    /* ---------- 演出 ---------- */

    const pop = () => {
        button.classList.remove("is-pop");
        void button.offsetWidth;
        button.classList.add("is-pop");

        combo += 1;
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => {
            combo = 0;
            comboEl.classList.remove("is-show");
        }, 1200);
        if (combo >= 3) {
            comboEl.textContent = `×${combo} COMBO!`;
            comboEl.classList.remove("is-show");
            void comboEl.offsetWidth;
            comboEl.classList.add("is-show");
        }

        if (reduceMotion()) return;

        const plus = document.createElement("span");
        plus.className = "like-float";
        plus.textContent = "+1";
        plus.style.setProperty("--dx", `${Math.round(Math.random() * 36 - 18)}px`);
        button.append(plus);
        plus.addEventListener("animationend", () => plus.remove());

        for (let i = 0; i < 3; i += 1) {
            const heart = document.createElement("span");
            heart.className = "like-particle";
            heart.textContent = "❤";
            heart.style.setProperty("--dx", `${Math.round(Math.random() * 90 - 45)}px`);
            heart.style.setProperty("--dy", `${Math.round(-40 - Math.random() * 50)}px`);
            heart.style.setProperty("--rot", `${Math.round(Math.random() * 60 - 30)}deg`);
            button.append(heart);
            heart.addEventListener("animationend", () => heart.remove());
        }
    };

    button.addEventListener("click", () => {
        pending += 1;
        render();
        pop();
        clearTimeout(timer);
        timer = setTimeout(send, 700);
    });

    /* ---------- 累計を読み込んで表示 ---------- */

    fetch(API, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
            total = Number(data.total) || 0;
            render();
            button.hidden = false;
            document.documentElement.classList.add("has-like");
        })
        .catch(() => {
            /* API に届かないときはボタンを出さない */
            button.remove();
        });
})();
