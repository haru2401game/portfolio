/* ========================================
   design-switch.js：デザインの切り替え（NEW ⇄ CLASSIC）
   ・新デザインと、今までのデザイン（クラシック）の両方で <head> から読み込む
   ・どちらのページかは <html data-design="new|classic">、もう片方の住所は <meta name="pa-design-○○" content="住所">
       BETA のあいだ：クラシック＝トップ（./）、新デザイン＝next/
       本番に切り替えたあと（npm run launch）：新デザイン＝トップ、クラシック＝classic.html
   ・選んだデザインは pa-settings.design に覚えて、次に開いたときもそのデザインへ（ページを描く前に移動）
   ・切り替えるときは「CHANGE DESIGN」の読み込み演出 → 移動 → 着いた側で幕が開く → そのデザインらしい最初の動き
     （新デザイン：赤い帯がサッと入り、文字と写真がまっすぐ並ぶ／クラシック：画面が光って、文字が弾んで出てくる）
     アニメーション「なし」のときは、演出なしで移動する
   ・見た目は css/design-switch.css（両方のデザインで共通）
======================================== */

(() => {
    const root = document.documentElement;
    const current = root.dataset.design === "new" ? "new" : "classic";
    const other = current === "new" ? "classic" : "new";
    const LABEL = { new: "NEW MODE", classic: "CLASSIC MODE" };
    const NAME = { new: "新デザイン", classic: "クラシック" };
    const ARRIVE_KEY = "pa-design-arrive";

    const urlOf = (design) => {
        if (design === current) return null;
        const meta = document.querySelector(`meta[name="pa-design-${design}"]`);
        if (!meta) return null;
        const url = new URL(meta.getAttribute("content") || "./", location.href);
        url.hash = location.hash.startsWith("#work=") ? location.hash : "";
        return url.href;
    };

    const readSettings = () => {
        try {
            return JSON.parse(localStorage.getItem("pa-settings")) || {};
        } catch {
            return {};
        }
    };
    const saveDesign = (design) => {
        try {
            const settings = readSettings();
            settings.design = design;
            localStorage.setItem("pa-settings", JSON.stringify(settings));
        } catch {
            /* 覚えられなくても、切り替えはできる */
        }
    };

    /* ---------- 1. 前に選んだデザインがあれば、ページを描く前にそちらへ ---------- */

    const saved = readSettings().design;
    const params = new URLSearchParams(location.search);
    if (params.has("design")) {
        // ?design=new / classic で開いたときは、それを選んだことにする（リンクで共有するとき用）
        const asked = params.get("design") === "new" ? "new" : "classic";
        saveDesign(asked);
        if (asked !== current && urlOf(asked)) {
            location.replace(urlOf(asked));
            return;
        }
    } else if ((saved === "new" || saved === "classic") && saved !== current && urlOf(saved)) {
        location.replace(urlOf(saved));
        return;
    }

    /* ---------- 2. 着いたとき：幕が開く ---------- */

    // 幕が開いたあとの「最初の動き」（見た目は css/design-switch.css の html.ds-enter）
    // delay：動き始めるまでの秒数。アニメーション「なし」「軽量」のときは出さない
    const enter = (delay) => {
        if (root.classList.contains("motion-off") || root.classList.contains("motion-lite")) return;
        root.style.setProperty("--ds-d", `${delay}s`);
        root.classList.add("ds-enter");
        setTimeout(() => {
            root.classList.remove("ds-enter");
            root.style.removeProperty("--ds-d");
        }, (delay + 2.6) * 1000);
    };

    let arriving = false;
    try {
        arriving = sessionStorage.getItem(ARRIVE_KEY) === current;
        sessionStorage.removeItem(ARRIVE_KEY);
    } catch {
        arriving = false;
    }
    if (arriving && !root.classList.contains("motion-off")) {
        root.classList.add("ds-arrive");
        root.dataset.dsLabel = LABEL[current];
        // 起動演出（新デザイン）は、切り替えで来たときは出さない
        root.classList.remove("is-booting");
        try {
            sessionStorage.setItem("next-booted", "1");
        } catch {
            /* ignore */
        }
        setTimeout(() => root.classList.remove("ds-arrive"), 1400);
        enter(0.8); // 赤い幕が上へ抜けるのに合わせて動き出す
    } else if (current === "new" && !location.hash) {
        enter(0.05); // 新デザインは、普通に開いたときも最初の動きを出す
    }

    /* ---------- 3. 切り替える ---------- */

    let switching = false;
    const go = (design) => {
        const url = urlOf(design);
        if (!url || switching) return;
        switching = true;
        saveDesign(design);
        document.dispatchEvent(new CustomEvent("play:event", { detail: { name: `デザイン切り替え: ${design}` } }));
        try {
            sessionStorage.setItem(ARRIVE_KEY, design);
        } catch {
            /* ignore */
        }
        if (root.classList.contains("motion-off")) {
            location.href = url;
            return;
        }
        document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
        window.PlaySfx?.("open");

        const layer = document.createElement("div");
        layer.className = "ds-switch";
        layer.setAttribute("role", "status");
        layer.innerHTML = `
            <div class="ds-panel is-a"></div>
            <div class="ds-panel is-b"></div>
            <div class="ds-body">
                <p class="ds-small">CHANGE DESIGN</p>
                <p class="ds-modes"><span class="ds-from"></span><span class="ds-arrow" aria-hidden="true">▶</span><span class="ds-to"></span></p>
                <div class="ds-bar"><span></span></div>
                <p class="ds-num"><b>0</b>% NOW LOADING</p>
            </div>`;
        layer.querySelector(".ds-from").textContent = LABEL[current];
        layer.querySelector(".ds-to").textContent = LABEL[design];
        document.body.append(layer);
        const bar = layer.querySelector(".ds-bar span");
        const num = layer.querySelector(".ds-num b");

        // 移動先を先に読み込んでおく（演出のあいだに準備して、着いたらすぐ表示）
        const prefetch = document.createElement("link");
        prefetch.rel = "prefetch";
        prefetch.href = url;
        document.head.append(prefetch);

        requestAnimationFrame(() => layer.classList.add("is-in"));
        const start = performance.now() + 350;
        const LENGTH = 900;
        const tick = (now) => {
            const t = Math.min(1, Math.max(0, (now - start) / LENGTH));
            const eased = 1 - Math.pow(1 - t, 3);
            bar.style.width = `${eased * 100}%`;
            num.textContent = String(Math.round(eased * 100));
            if (t < 1) requestAnimationFrame(tick);
            else setTimeout(() => (location.href = url), 180);
        };
        requestAnimationFrame(tick);
        // 画面が裏にあって動かないときでも、必ず移動する
        setTimeout(() => (location.href = url), 2600);
    };

    /* ---------- 4. 切り替えのボタン（どちらのデザインにも置く） ---------- */

    const ready = () => {
        // 新デザイン：OPTIONS の中の [data-design-switch]（index.html に書いてある）
        // クラシック：OPTIONS（main.js が作る）の中に、同じ形の行を足す
        const classicPanel = document.querySelector(".settings-panel .settings-body");
        if (classicPanel && !classicPanel.querySelector("[data-design-switch]")) {
            const row = document.createElement("div");
            row.className = "settings-row";
            row.innerHTML = `
                <h3 class="settings-label" id="settings-design">デザイン</h3>
                <div class="settings-choices" role="radiogroup" aria-labelledby="settings-design" data-design-switch>
                    <button type="button" role="radio" data-value="new">NEW</button>
                    <button type="button" role="radio" data-value="classic">CLASSIC</button>
                </div>
                <p class="settings-note">新しいデザインに切り替えます（いつでも戻せます）</p>`;
            classicPanel.prepend(row);
        }

        document.querySelectorAll("[data-design-switch]").forEach((group) => {
            const options = Array.from(group.querySelectorAll("[role=radio]"));
            options.forEach((option) => {
                const on = option.dataset.value === current;
                option.setAttribute("aria-checked", String(on));
                option.tabIndex = on ? 0 : -1;
                option.addEventListener("click", () => go(option.dataset.value));
            });
            group.addEventListener("keydown", (event) => {
                const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                if (!step) return;
                event.preventDefault();
                const index = options.findIndex((option) => option.dataset.value === current);
                go(options[(index + step + options.length) % options.length].dataset.value);
            });
        });

        // フッターなどの「○○で見る」リンク（data-design-link）
        document.querySelectorAll("[data-design-link]").forEach((link) => {
            const url = urlOf(other);
            if (!url) {
                link.hidden = true;
                return;
            }
            link.href = url;
            link.addEventListener("click", (event) => {
                event.preventDefault();
                go(other);
            });
        });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
    else ready();

    window.DesignSwitch = { go, current, name: NAME };
})();
