/* ========================================
   Play（遊び心の仕掛け）

   1. キャラクター図鑑：顔を出すキャラをクリックすると図鑑に登録。エンディングで光る
   2. 隠しコマンド：↑↑↓↓←→←→BA（スマホはロゴを5回タップ）
   3. つづきから：2回目の訪問で、前回見ていたセクションへ案内
   4. ステージ進行バー：ヘッダーの下に今どこまで進んだかを表示
   5. クリックエフェクト：PCでクリックした場所に ✦ がはじける

   記録（図鑑・前回の位置）は、見ている人のブラウザ（localStorage）にだけ残る
======================================== */

(() => {
    const root = document.documentElement;
    const reduceMotion = () =>
        root.classList.contains("motion-off") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const store = {
        get(key, fallback) {
            try {
                const value = JSON.parse(localStorage.getItem(key));
                return value ?? fallback;
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
                /* private mode etc. */
            }
        },
    };

    // アクセス解析に「隠し要素が見つかった」を送る（analytics.js が受け取る）
    const report = (name) => document.dispatchEvent(new CustomEvent("play:event", { detail: { name } }));

    /* ---------- お知らせ（ヘッダーの下にゲーム風の通知） ---------- */

    const notices = [];
    let noticeBusy = false;
    const noticeBox = document.createElement("div");
    noticeBox.className = "play-notice";
    noticeBox.setAttribute("role", "status");
    noticeBox.setAttribute("aria-live", "polite");
    document.body.append(noticeBox);

    const showNext = () => {
        if (noticeBusy || !notices.length) return;
        noticeBusy = true;
        const { label, text, image, tone } = notices.shift();
        noticeBox.replaceChildren();
        noticeBox.dataset.tone = tone || "";
        if (image) {
            const img = document.createElement("img");
            img.src = image;
            img.alt = "";
            noticeBox.append(img);
        }
        const body = document.createElement("span");
        const b = document.createElement("b");
        b.textContent = label;
        body.append(b, document.createTextNode(text));
        noticeBox.append(body);
        noticeBox.classList.add("is-show");
        setTimeout(() => {
            noticeBox.classList.remove("is-show");
            setTimeout(() => {
                noticeBusy = false;
                showNext();
            }, 350);
        }, 2600);
    };

    const notify = (notice) => {
        notices.push(notice);
        showNext();
    };

    /* ========================================
       1. キャラクター図鑑
    ======================================== */

    const CHARACTER = /images\/character\/([A-Za-z]+)(?:_\d+)?\.png$/;
    const nameOf = (img) => (img.getAttribute("src") || "").match(CHARACTER)?.[1] || "";

    // このページに登場するキャラ（顔を出す・漂う・飛び出すキャラすべて）
    const allCast = () => [...new Set(Array.from(document.querySelectorAll('img[src*="images/character/"]')).map(nameOf).filter(Boolean))].sort();
    const castTotal = allCast().length;
    const found = new Set(store.get("pa-cast", []).filter((name) => typeof name === "string"));

    const bubble = (x, y, text) => {
        if (reduceMotion()) return;
        const node = document.createElement("span");
        node.className = "play-bubble";
        node.textContent = text;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        document.body.append(node);
        setTimeout(() => node.remove(), 1100);
    };

    const renderCredits = () => {
        const cast = document.querySelector("[data-ending-cast]");
        if (!cast) return;
        const names = allCast();
        cast.replaceChildren(...names.flatMap((name, index) => {
            const item = document.createElement("span");
            item.className = found.has(name) ? "cast-name is-found" : "cast-name";
            item.textContent = name;
            return index ? [document.createTextNode(" ／ "), item] : [item];
        }));

        let meter = document.querySelector(".cast-meter");
        if (!meter) {
            meter = document.createElement("p");
            meter.className = "cast-meter";
            cast.closest(".credits-window")?.after(meter);
        }
        const count = [...found].filter((name) => names.includes(name)).length;
        meter.textContent = count >= names.length
            ? `CAST ${count} / ${names.length} コンプリート！`
            : `CAST ${count} / ${names.length} 発見 ── サイトのあちこちで顔を出すキャラクターを、クリックして探してみてください`;
        meter.classList.toggle("is-complete", count >= names.length);
        if (count < names.length && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            meter.textContent = `CAST ${count} / ${names.length} 発見 ── 端末の設定で動きを減らしているため、キャラクターは出てきません`;
        } else if (count < names.length && root.classList.contains("motion-off")) {
            meter.textContent = `CAST ${count} / ${names.length} 発見 ── ヘッダーの MOTION を ON にすると、キャラクターが顔を出します`;
        }

        // 全員見つけた人だけが見られるメッセージ
        let secret = document.querySelector(".ending-secret");
        if (count >= names.length && !secret) {
            secret = document.createElement("div");
            secret.className = "ending-secret";
            const title = document.createElement("b");
            title.textContent = "★ SECRET MESSAGE ★";
            const text = document.createElement("p");
            text.textContent = "全員見つけてくれて、本当にありがとうございます！ 細かいところまで遊んでくれるあなたと、いつか一緒にゲームを作れたらうれしいです。";
            secret.append(title, text);
            meter.after(secret);
        }
    };

    const catchCharacter = (img, event) => {
        const name = nameOf(img);
        if (!name) return;

        img.classList.add("is-caught");
        setTimeout(() => img.classList.remove("is-caught"), 260);

        if (found.has(name)) {
            bubble(event.clientX, event.clientY, `${name}`);
            return;
        }

        found.add(name);
        store.set("pa-cast", [...found]);
        bubble(event.clientX, event.clientY, "見つかった！");
        const count = found.size;
        notify({
            label: count >= castTotal ? "CAST COMPLETE!" : "NEW CAST!",
            text: count >= castTotal ? ` 全${castTotal}キャラ発見！ エンディングを見てね` : ` ${name} を見つけた（${count} / ${castTotal}）`,
            image: img.currentSrc || img.src,
            tone: count >= castTotal ? "gold" : "",
        });
        if (count >= castTotal) report("キャラ図鑑 コンプリート");
        renderCredits();
    };

    // 漂うキャラは文章やカードの後ろにいることが多いので、
    // リンクやボタン以外を押したときは、その場所にキャラが重なっていれば捕まえる
    const INTERACTIVE = "a, button, input, textarea, select, label, summary, [role='tab'], dialog";
    const characterAt = (x, y) => Array.from(document.querySelectorAll(".drifter, .peeker-sprite")).find((sprite) => {
        const box = sprite.getBoundingClientRect();
        return box.width > 0 && x >= box.left - 6 && x <= box.right + 6 && y >= box.top - 6 && y <= box.bottom + 6
            && getComputedStyle(sprite).visibility !== "hidden";
    });

    document.addEventListener("click", (event) => {
        let img = event.target.closest?.(".peeker-sprite, .drifter");
        if (!img && !event.target.closest?.(INTERACTIVE)) img = characterAt(event.clientX, event.clientY);
        if (img) catchCharacter(img, event);
    });

    renderCredits();

    /* ========================================
       2. 隠しコマンド
    ======================================== */

    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let progress = 0;
    let parading = false;

    const parade = () => {
        if (parading) return;
        parading = true;
        report("隠しコマンド");

        const layer = document.createElement("div");
        layer.className = "play-parade";
        layer.setAttribute("aria-hidden", "true");

        const banner = document.createElement("p");
        banner.className = "play-parade-banner";
        banner.innerHTML = "<small>SECRET COMMAND</small>SECRET UNLOCKED!";
        layer.append(banner);

        const files = Array.from(new Set(Array.from(document.querySelectorAll('img[src*="images/character/"]')).map((img) => img.getAttribute("src"))));
        files.forEach((src, index) => {
            const runner = document.createElement("img");
            runner.src = src;
            runner.alt = "";
            runner.className = "play-runner";
            runner.style.setProperty("--row", String(index % 7));
            runner.style.setProperty("--delay", `${(index * 0.17).toFixed(2)}s`);
            runner.style.setProperty("--size", `${48 + (index % 3) * 14}px`);
            layer.append(runner);
        });

        document.body.append(layer);
        requestAnimationFrame(() => layer.classList.add("is-on"));
        setTimeout(() => {
            layer.classList.remove("is-on");
            setTimeout(() => {
                layer.remove();
                parading = false;
            }, 500);
        }, reduceMotion() ? 2200 : 4200);

        setTimeout(() => notify({ label: "HINT", text: " 走っていたキャラは、サイトのどこかに隠れています。クリックで図鑑に登録！", tone: "" }), reduceMotion() ? 2400 : 4400);
    };

    document.addEventListener("keydown", (event) => {
        if (event.target.closest?.("input, textarea, select, [contenteditable]")) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        progress = key === KONAMI[progress] ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
        if (progress === KONAMI.length) {
            progress = 0;
            parade();
        }
    });

    // スマホ：ロゴを2秒以内に5回タップ
    const logo = document.querySelector(".header-logo");
    let taps = [];
    logo?.addEventListener("click", (event) => {
        const now = Date.now();
        taps = taps.filter((time) => now - time < 2000);
        taps.push(now);
        if (taps.length >= 5) {
            taps = [];
            event.preventDefault();
            parade();
        }
    });

    /* ========================================
       3 & 4. ステージ（つづきから・進行バー）
    ======================================== */

    const stageSections = Array.from(document.querySelectorAll("main > section[id]"))
        .filter((section) => section.querySelector(":scope > .section-title h2"));
    const ending = document.getElementById("ending");
    const labelOf = (section) => section.querySelector(":scope > .section-title h2")?.textContent.replace(/\s+/g, " ").trim() || section.id;

    /* ---------- 4. 進行バー ---------- */

    const header = document.querySelector(".header");
    const bar = document.createElement("div");
    bar.className = "stage-bar";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<span class="stage-bar-fill"></span><span class="stage-bar-chip"></span>';
    header?.append(bar);
    const fill = bar.querySelector(".stage-bar-fill");
    const chip = bar.querySelector(".stage-bar-chip");

    let currentStage = -1;
    let chipTimer = 0;

    const currentSection = () => {
        const line = window.innerHeight * 0.35;
        let current = null;
        for (const section of [...stageSections, ending].filter(Boolean)) {
            if (section.getBoundingClientRect().top <= line) current = section;
        }
        return current;
    };

    const updateBar = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        fill.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;

        const section = currentSection();
        const index = section === ending ? stageSections.length : stageSections.indexOf(section);
        if (index === currentStage) return;
        currentStage = index;

        if (index < 0) {
            chip.classList.remove("is-show");
            return;
        }
        chip.textContent = section === ending
            ? "★ ALL STAGES CLEAR"
            : `STAGE ${String(index + 1).padStart(2, "0")} / ${String(stageSections.length).padStart(2, "0")} ▶ ${labelOf(section)}`;
        chip.classList.add("is-show");
        clearTimeout(chipTimer);
        chipTimer = setTimeout(() => chip.classList.remove("is-show"), 1800);
    };

    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            updateBar();
            save();
        });
    }, { passive: true });
    window.addEventListener("resize", updateBar);

    /* ---------- 3. つづきから ---------- */

    const SAVE_KEY = "pa-save";
    const saved = store.get(SAVE_KEY, null);
    let saveTimer = 0;

    const save = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            const section = currentSection();
            if (!section || section === ending) return;
            store.set(SAVE_KEY, { id: section.id, label: labelOf(section), at: Date.now() });
        }, 600);
    };

    let firstView = true;
    try {
        firstView = !sessionStorage.getItem("pa-continue");
        sessionStorage.setItem("pa-continue", "1");
    } catch {
        firstView = true;
    }

    const target = saved && typeof saved.id === "string" ? document.getElementById(saved.id) : null;
    const recent = saved && Date.now() - Number(saved.at || 0) < 30 * 24 * 60 * 60 * 1000;

    if (firstView && target && recent && stageSections.includes(target) && !location.hash && window.scrollY < 200) {
        const card = document.createElement("div");
        card.className = "play-continue";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-label", "前回の続きから見る");

        const text = document.createElement("p");
        const small = document.createElement("small");
        small.textContent = "SAVE DATA FOUND";
        text.append(small, document.createTextNode(`前回は「${labelOf(target)}」まで見ていました`));

        const go = document.createElement("button");
        go.type = "button";
        go.className = "play-continue-go";
        go.textContent = "▶ つづきから";

        const close = document.createElement("button");
        close.type = "button";
        close.className = "play-continue-new";
        close.textContent = "はじめから";

        const dismiss = () => {
            card.classList.remove("is-show");
            setTimeout(() => card.remove(), 400);
        };

        go.addEventListener("click", () => {
            dismiss();
            report("つづきから");
            target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
        });
        close.addEventListener("click", dismiss);

        card.append(text, go, close);
        document.body.append(card);
        setTimeout(() => card.classList.add("is-show"), 900);
        setTimeout(() => {
            if (document.body.contains(card) && !card.matches(":hover, :focus-within")) dismiss();
        }, 12000);
    }

    updateBar();

    /* ========================================
       5. クリックエフェクト（PC のマウスだけ）
    ======================================== */

    const SPARK_COLORS = ["#00a3e0", "#ff5a5f", "#ffb300", "#22c55e", "#8b5cf6"];
    let sparkCount = 0;

    document.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0 || reduceMotion()) return;
        if (sparkCount > 24) return;

        const burst = document.createElement("span");
        burst.className = "play-spark";
        burst.setAttribute("aria-hidden", "true");
        burst.style.left = `${event.clientX}px`;
        burst.style.top = `${event.clientY}px`;
        for (let i = 0; i < 6; i += 1) {
            const bit = document.createElement("i");
            bit.style.setProperty("--a", `${i * 60 + (sparkCount % 3) * 20}deg`);
            bit.style.setProperty("--c", SPARK_COLORS[(i + sparkCount) % SPARK_COLORS.length]);
            burst.append(bit);
        }
        document.body.append(burst);
        sparkCount += 1;
        setTimeout(() => {
            burst.remove();
            sparkCount -= 1;
        }, 550);
    }, { passive: true });
})();
