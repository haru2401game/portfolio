/* ========================================
   Play（遊び心の仕掛け）

   1. キャラクター図鑑：顔を出すキャラをクリックすると図鑑に登録。エンディングで光る
   2. 隠しコマンド：↑↑↓↓←→←→BA（スマホはロゴを5回タップ）
   3. つづきから：2回目の訪問で、前回見ていたセクションへ案内
   4. ステージ進行バー：ヘッダーの下に今どこまで進んだかを表示
   5. クリックエフェクト：PCでクリックした場所に ✦ がはじける

   記録（図鑑・前回の位置）は、見ている人のブラウザ（localStorage）にだけ残る
======================================== */

// 共通の道具（make・decor・root・reduceMotion・liteMotion・localData・sessionData・emitPlayEvent）は main.js にある
(() => {
    /* ---------- お知らせ（ヘッダーの下にゲーム風の通知） ---------- */

    const notices = [];
    let noticeBusy = false;
    const noticeBox = make("div", "play-notice");
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
            const img = make("img");
            img.src = image;
            img.alt = "";
            noticeBox.append(img);
        }
        const body = make("span");
        const b = make("b", "", label);
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
    const found = new Set(localData.get("pa-cast", []).filter((name) => typeof name === "string"));

    const bubble = (x, y, text) => {
        if (reduceMotion()) return;
        const node = make("span", "play-bubble", text);
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
            const item = make("span", found.has(name) ? "cast-name is-found" : "cast-name", name);
            return index ? [document.createTextNode(" ／ "), item] : [item];
        }));

        let meter = document.querySelector(".cast-meter");
        if (!meter) {
            meter = make("p", "cast-meter");
            cast.closest(".credits-window")?.after(meter);
        }
        const count = [...found].filter((name) => names.includes(name)).length;
        meter.textContent = count >= names.length
            ? `CAST ${count} / ${names.length} コンプリート！`
            : `CAST ${count} / ${names.length} 発見 ── サイトのあちこちで顔を出すキャラクターを、クリックして探してみてください`;
        meter.classList.toggle("is-complete", count >= names.length);
        if (count < names.length && root.classList.contains("motion-off")) {
            meter.textContent = `CAST ${count} / ${names.length} 発見 ── ⚙ OPTIONS のアニメーションを「なし」以外にすると、キャラクターが顔を出します`;
        }

        // 全員見つけた人だけが見られるメッセージ
        let secret = document.querySelector(".ending-secret");
        if (count >= names.length && !secret) {
            secret = make("div", "ending-secret");
            const title = make("b", "", "★ SECRET MESSAGE ★");
            const text = make("p", "", "全員見つけてくれて、本当にありがとうございます！ 細かいところまで遊んでくれるあなたと、いつか一緒にゲームを作れたらうれしいです。");
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
        localData.set("pa-cast", [...found]);
        document.dispatchEvent(new CustomEvent("play:cast", { detail: { count: found.size, total: castTotal } }));
        bubble(event.clientX, event.clientY, "見つかった！");
        const count = found.size;
        notify({
            label: count >= castTotal ? "CAST COMPLETE!" : "NEW CAST!",
            text: count >= castTotal ? ` 全${castTotal}キャラ発見！ エンディングを見てね` : ` ${name} を見つけた（${count} / ${castTotal}）`,
            image: img.currentSrc || img.src,
            tone: count >= castTotal ? "gold" : "",
        });
        if (count >= castTotal) emitPlayEvent("キャラ図鑑 コンプリート");
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
        emitPlayEvent("隠しコマンド");

        const layer = decor(make("div", "play-parade"));

        const banner = make("p", "play-parade-banner");
        banner.innerHTML = "<small>SECRET COMMAND</small>SECRET UNLOCKED!";
        layer.append(banner);

        const files = Array.from(new Set(Array.from(document.querySelectorAll('img[src*="images/character/"]')).map((img) => img.getAttribute("src"))));
        files.forEach((src, index) => {
            const runner = make("img");
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
    const bar = decor(make("div", "stage-bar"));
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
    const saved = localData.get(SAVE_KEY, null);
    let saveTimer = 0;

    const save = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            const section = currentSection();
            if (!section || section === ending) return;
            localData.set(SAVE_KEY, { id: section.id, label: labelOf(section), at: Date.now() });
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
        const card = make("div", "play-continue");
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-label", "前回の続きから見る");

        const text = make("p");
        const small = make("small", "", "SAVE DATA FOUND");
        text.append(small, document.createTextNode(`前回は「${labelOf(target)}」まで見ていました`));

        const go = make("button");
        go.type = "button";
        go.className = "play-continue-go";
        go.textContent = "▶ つづきから";

        const close = make("button");
        close.type = "button";
        close.className = "play-continue-new";
        close.textContent = "はじめから";

        const dismiss = () => {
            card.classList.remove("is-show");
            setTimeout(() => card.remove(), 400);
        };

        go.addEventListener("click", () => {
            dismiss();
            emitPlayEvent("つづきから");
            target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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
        if (event.pointerType !== "mouse" || event.button !== 0 || liteMotion()) return;
        if (sparkCount > 24) return;

        const burst = decor(make("span", "play-spark"));
        burst.style.left = `${event.clientX}px`;
        burst.style.top = `${event.clientY}px`;
        for (let i = 0; i < 6; i += 1) {
            const bit = make("i");
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

/* ========================================
   Play 2（トロフィー・季節イベント・プレイタイムとランク）
======================================== */

(() => {
    /* ========================================
       トロフィー
    ======================================== */

    const TROPHIES = [
        { id: "start", icon: "▶", title: "PRESS START", text: "ポートフォリオに遊びに来た", hint: "" },
        { id: "achievements", icon: "★", title: "実績チェック", text: "制作実績をチェックした", hint: "Achievements を見てみよう" },
        { id: "works5", icon: "🎮", title: "作品ハンター", text: "作品の詳細を5作品見た", hint: "Other Works のカードを押してみよう" },
        { id: "photo", icon: "📷", title: "思い出アルバム", text: "写真を拡大して見た", hint: "写真を押してみよう" },
        { id: "play", icon: "🕹", title: "プレイヤー", text: "遊べる作品のサイトを開いた", hint: "実際に遊べる場所があるよ" },
        { id: "cast5", icon: "👀", title: "キャラ探し", text: "キャラクターを5体見つけた", hint: "顔を出すキャラを押してみよう" },
        { id: "castAll", icon: "📖", title: "図鑑コンプリート", text: "全キャラクターを見つけた", hint: "キャラクターを全員見つけよう" },
        { id: "konami", icon: "🔑", title: "隠しコマンド", text: "隠しコマンドを見つけた", hint: "ゲーム好きなら知っているあのコマンド" },
        { id: "like100", icon: "❤", title: "いいね連打", text: "いいねを100回押した", hint: "右下のハートを押しまくろう" },
        { id: "allStages", icon: "🗺", title: "全ステージ踏破", text: "全ステージ（9セクション）を見た", hint: "すべてのセクションを見てみよう" },
        { id: "ending", icon: "🏁", title: "ALL CLEAR", text: "エンディングにたどり着いた", hint: "最後まで進んでみよう" },
        { id: "continue", icon: "💾", title: "セーブデータ", text: "「つづきから」で再開した", hint: "また遊びに来てね" },
    ];

    let unlocked = localData.get("pa-trophy", {});
    if (!unlocked || typeof unlocked !== "object" || Array.isArray(unlocked)) unlocked = {};
    const count = () => TROPHIES.filter((t) => unlocked[t.id]).length;

    /* 解除の通知（右下の金色のトースト・続けて解除しても順番に出す） */
    const queue = [];
    let showing = false;
    const showNext = () => {
        if (showing || !queue.length) return;
        showing = true;
        const { trophy, n } = queue.shift();
        const toast = make("div", "achievement-toast");
        toast.setAttribute("role", "status");
        const icon = make("span", "toast-icon", trophy.icon);
        const text = make("span", "toast-text");
        const label = make("small", "", `TROPHY UNLOCKED  ${n} / ${TROPHIES.length}`);
        const message = make("strong", "", trophy.text);
        text.append(label, message);
        toast.append(icon, text);
        document.body.append(toast);
        // 効果音（sfx.js）に知らせる
        document.dispatchEvent(new CustomEvent("play:trophy", { detail: { id: trophy.id, count: n } }));
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("is-visible")));
        setTimeout(() => {
            toast.classList.remove("is-visible");
            setTimeout(() => {
                toast.remove();
                showing = false;
                showNext();
            }, 500);
        }, 3200);
    };

    let room = null;
    let opener = null;

    const unlock = (id) => {
        const trophy = TROPHIES.find((t) => t.id === id);
        if (!trophy || unlocked[id]) return;
        unlocked[id] = Date.now();
        localData.set("pa-trophy", unlocked);
        queue.push({ trophy, n: count() });
        showNext();
        renderOpener();
        if (room?.open) renderRoom();
        if (count() === TROPHIES.length) emitPlayEvent("トロフィー コンプリート");
    };
    window.PlayTrophy = { unlock };

    /* 一覧（フッターとエンディングから開く） */
    const renderRoom = () => {
        const list = room.querySelector(".trophy-list");
        list.replaceChildren(...TROPHIES.map((trophy) => {
            const item = make("li");
            const got = Boolean(unlocked[trophy.id]);
            item.className = got ? "trophy is-got" : "trophy";
            const icon = make("span", "trophy-icon", got ? trophy.icon : "?");
            const body = make("span");
            const title = make("b", "", got ? trophy.title : "？？？");
            const text = make("small", "", got ? trophy.text : `ヒント：${trophy.hint}`);
            body.append(title, text);
            item.append(icon, body);
            return item;
        }));
        const n = count();
        room.querySelector(".trophy-count").textContent = `${n} / ${TROPHIES.length}`;
        room.querySelector(".trophy-gauge span").style.transform = `scaleX(${n / TROPHIES.length})`;
    };

    const openRoom = () => {
        if (!room) {
            room = make("dialog", "trophy-room");
            room.setAttribute("aria-labelledby", "trophy-title");
            const head = make("div", "trophy-head");
            const h = make("h2");
            h.id = "trophy-title";
            h.textContent = "🏆 TROPHY";
            const n = make("span", "trophy-count");
            const close = make("button");
            close.type = "button";
            close.className = "trophy-close";
            close.setAttribute("aria-label", "閉じる");
            close.textContent = "×";
            close.addEventListener("click", () => room.close());
            head.append(h, n, close);
            const gauge = make("div", "trophy-gauge");
            gauge.append(make("span"));
            const list = make("ul", "trophy-list");
            const note = make("p", "trophy-note", "トロフィーの記録は、このブラウザにだけ保存されます。");
            room.append(head, gauge, list, note);
            room.addEventListener("click", (event) => { if (event.target === room) room.close(); });
            document.body.append(room);
        }
        renderRoom();
        if (typeof room.showModal === "function") room.showModal();
        emitPlayEvent("トロフィー一覧");
    };

    const renderOpener = () => {
        document.querySelectorAll("[data-trophy-count]").forEach((node) => {
            node.textContent = `${count()} / ${TROPHIES.length}`;
        });
    };

    const footer = document.querySelector(".footer-inner");
    if (footer) {
        opener = make("button");
        opener.type = "button";
        opener.className = "footer-trophy";
        opener.innerHTML = '<span aria-hidden="true">🏆</span> TROPHY <b data-trophy-count></b>';
        opener.addEventListener("click", openRoom);
        footer.querySelector(".footer-motto")?.after(opener);
    }
    const endingActions = document.querySelector(".ending-actions");
    if (endingActions) {
        const button = make("button");
        button.type = "button";
        button.className = "ending-button ending-trophy";
        button.innerHTML = '🏆 トロフィー <b data-trophy-count></b>';
        button.addEventListener("click", openRoom);
        endingActions.append(button);
    }
    renderOpener();

    /* ---------- 解除の条件 ---------- */

    unlock("start");

    // 作品の詳細（ポップアップ）を5作品
    const seenWorks = new Set(sessionData.get("pa-works", []));
    document.addEventListener("work-viewer:open", (event) => {
        if (event.detail?.title) seenWorks.add(event.detail.title);
        sessionData.set("pa-works", [...seenWorks]);
        if (seenWorks.size >= 5) unlock("works5");
    });

    let photos = sessionData.get("pa-photos", 0);
    let likes = localData.get("pa-likes", 0);
    document.addEventListener("click", (event) => {
        if (event.target.closest?.(".tech-photo, .timeline-photo")) {
            photos += 1;
            sessionData.set("pa-photos", photos);
            unlock("photo");
        }
        if (event.target.closest?.(".play-card")) unlock("play");
        if (event.target.closest?.(".like-button")) {
            likes += 1;
            localData.set("pa-likes", likes);
            if (likes >= 100) unlock("like100");
        }
    }, true);

    document.addEventListener("play:cast", (event) => {
        if (event.detail.count >= 5) unlock("cast5");
        if (event.detail.count >= event.detail.total) unlock("castAll");
    });
    document.addEventListener("play:event", (event) => {
        const name = event.detail?.name;
        if (name === "隠しコマンド") unlock("konami");
        if (name === "つづきから") unlock("continue");
    });
    // 以前に見つけていた分も反映
    const castFound = localData.get("pa-cast", []).length;
    const castTotal = document.querySelectorAll(".cast-name").length;
    if (castFound >= 5) unlock("cast5");
    if (castTotal && castFound >= castTotal) unlock("castAll");

    /* 読んだステージ（この訪問で） */
    const stages = Array.from(document.querySelectorAll("main > section[id]"))
        .filter((section) => section.querySelector(":scope > .section-title h2"));
    const reached = new Set(sessionData.get("pa-reached", []));
    const ending = document.getElementById("ending");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                if (entry.target === ending) {
                    unlock("ending");
                    startRankClock();
                    return;
                }
                reached.add(entry.target.id);
                sessionData.set("pa-reached", [...reached]);
                if (stages.every((stage) => reached.has(stage.id))) unlock("allStages");
            });
        }, { threshold: 0.25 });
        stages.forEach((stage) => observer.observe(stage));
        if (ending) observer.observe(ending);
    }

    /* ========================================
       プレイタイムとランク（エンディング）
    ======================================== */

    let playTime = Number(sessionData.get("pa-playtime", 0)) || 0;
    setInterval(() => {
        if (document.visibilityState !== "visible") return;
        playTime += 1;
        if (playTime % 5 === 0) sessionData.set("pa-playtime", playTime);
    }, 1000);

    const RANKS = [
        { rank: "S", min: 105, text: "パーフェクト！ 隅々まで見てくれてありがとうございます" },
        { rank: "A", min: 75, text: "じっくり見てくれてありがとうございます" },
        { rank: "B", min: 45, text: "まだ見ていないステージや作品があります" },
        { rank: "C", min: 0, text: "もう一度はじめから、ゆっくりどうぞ！" },
    ];

    const score = () => {
        const sections = stages.filter((stage) => reached.has(stage.id)).length;
        const cast = localData.get("pa-cast", []).length;
        const points =
            sections * 8 +                       // 最大 72
            Math.min(seenWorks.size, 5) * 4 +    // 最大 20
            Math.min(photos, 3) * 2 +            // 最大 6
            Math.min(cast, 14) +                 // 最大 14
            Math.min(playTime / 300, 1) * 20;    // 5分で最大 20
        return { points, sections, cast };
    };

    let rankBox = null;
    const renderRank = () => {
        if (!ending) return;
        if (!rankBox) {
            rankBox = make("div", "ending-rank");
            ending.querySelector("[data-ending-stats]")?.after(rankBox);
        }
        const { points, sections, cast } = score();
        const result = RANKS.find((r) => points >= r.min);
        const mm = String(Math.floor(playTime / 60)).padStart(2, "0");
        const ss = String(playTime % 60).padStart(2, "0");
        rankBox.dataset.rank = result.rank;
        rankBox.replaceChildren();
        const badge = make("span", "ending-rank-badge");
        badge.innerHTML = `<small>RANK</small>${result.rank}`;
        const body = make("span", "ending-rank-body");
        const time = make("b", "", `PLAY TIME ${mm}:${ss}`);
        const detail = make("small", "", `読んだステージ ${sections} / ${stages.length} ／ 見た作品 ${seenWorks.size} ／ 発見キャラ ${cast}`);
        const comment = make("span", "", result.text);
        body.append(time, detail, comment);
        rankBox.append(badge, body);
    };

    let rankTimer = 0;
    function startRankClock() {
        renderRank();
        if (rankTimer) return;
        // 一度エンディングに来たら、画面に見えているあいだだけ毎秒更新する
        rankTimer = setInterval(() => {
            const box = ending.getBoundingClientRect();
            if (box.bottom > 0 && box.top < window.innerHeight) renderRank();
        }, 1000);
    }

    /* ========================================
       季節イベント（日本時間の日付で自動で切り替わる）
       確認したいときは URL の末尾に ?season=halloween などを付ける
    ======================================== */

    const SEASONS = {
        newyear: { badge: "🎍 HAPPY NEW YEAR", glyphs: ["🎍", "✨", "🌅", "🎌"], fall: ["✨"] },
        spring: { badge: "🌸 SPRING STAGE", glyphs: ["🌸", "🌱", "✿", "🌸"], fall: ["🌸"] },
        halloween: { badge: "🎃 HAPPY HALLOWEEN", glyphs: ["🎃", "🦇", "👻", "🍬"], fall: ["🦇", "🍬"] },
        christmas: { badge: "🎄 MERRY CHRISTMAS", glyphs: ["🎄", "⭐", "🎁", "❄"], fall: ["❄"] },
        winter: { badge: "❄ WINTER STAGE", glyphs: ["❄", "⛄", "✦", "❄"], fall: ["❄"] },
    };

    const seasonOf = (date) => {
        const jst = new Date(date.getTime() + 9 * 3600 * 1000);
        const m = jst.getUTCMonth() + 1;
        const d = jst.getUTCDate();
        const md = m * 100 + d;
        if (md >= 101 && md <= 107) return "newyear";
        if (md >= 325 && md <= 415) return "spring";
        if (md >= 1015 && md <= 1031) return "halloween";
        if (md >= 1201 && md <= 1225) return "christmas";
        if (md >= 1226 || md <= 228) return "winter";
        return "";
    };

    let season = seasonOf(new Date());
    try {
        const forced = new URLSearchParams(location.search).get("season");
        if (forced !== null) season = SEASONS[forced] ? forced : "";
    } catch { /* ignore */ }

    if (season) {
        const config = SEASONS[season];
        root.classList.add(`season-${season}`);

        // 背景の飾り（✦●▲）を季節のものに
        document.querySelectorAll(".ambient i").forEach((shape, index) => {
            shape.textContent = config.glyphs[index % config.glyphs.length];
            shape.classList.add("is-season");
        });

        // トップにバッジ
        const eyebrow = document.querySelector(".hero-eyebrow");
        if (eyebrow) {
            const badge = make("p", "season-badge", config.badge);
            eyebrow.before(badge);
        }

        // トップに舞い落ちるもの
        const hero = document.querySelector(".hero");
        if (hero && !liteMotion()) {
            const layer = decor(make("div", "season-fall"));
            for (let i = 0; i < 14; i += 1) {
                const bit = make("i", "", config.fall[i % config.fall.length]);
                bit.style.setProperty("--x", `${(i * 37) % 100}%`);
                bit.style.setProperty("--d", `${9 + (i % 5) * 2.2}s`);
                bit.style.setProperty("--delay", `${-(i * 1.3).toFixed(1)}s`);
                bit.style.setProperty("--s", `${14 + (i % 4) * 5}px`);
                bit.style.setProperty("--sway", `${i % 2 ? 30 : -30}px`);
                layer.append(bit);
            }
            hero.append(layer);
        }
    }
})();

/* ========================================
   Timeline：ワールドマップ（ステージ選択風）
   - 経歴（.timeline-item）から自動で作る。経歴を足せばマップも増える
   - 年ごとに WORLD 1, 2 … と区切り、ステージ番号は 1-1, 1-2 …
   - ステージを押すと、その経歴のカードへ移動して光らせる
======================================== */

(() => {
    const container = document.querySelector(".timeline-container");
    const items = Array.from(document.querySelectorAll(".timeline-item"));
    if (!container || items.length < 2) return;

    const clean = (text) => (text || "").replace(/\s+/g, " ").trim();
    const stages = items.map((item) => {
        const date = clean(item.querySelector(".timeline-date")?.textContent);
        const title = clean(item.querySelector("h3")?.textContent).replace(/^\[|\]$/g, "");
        return { item, date, year: date.slice(0, 4), title, type: item.dataset.quest || "clear" };
    });

    const years = [...new Set(stages.map((stage) => stage.year))];
    const counter = {};
    stages.forEach((stage) => {
        stage.world = years.indexOf(stage.year) + 1;
        counter[stage.world] = (counter[stage.world] || 0) + 1;
        stage.code = `${stage.world}-${counter[stage.world]}`;
    });

    const STEP = 112;
    const LEFT = 64;
    const TOP_Y = 62;
    const LOW_Y = 132;
    const width = LEFT * 2 + STEP * (stages.length - 1);
    const height = 210;
    const pointOf = (index) => ({ x: LEFT + index * STEP, y: index % 2 ? LOW_Y : TOP_Y });

    const map = make("div", "world-map");

    const head = make("div", "world-map-head");
    const label = make("span", "world-map-label", "WORLD MAP");
    const hint = make("span", "world-map-hint", "◀ 横にスクロール ／ ステージを押すと経歴へ");
    head.append(label, hint);

    const scroller = make("div", "world-map-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "group");
    scroller.setAttribute("aria-label", "経歴のワールドマップ（横にスクロールできます）");

    const field = make("div", "world-map-field");
    field.style.width = `${width}px`;
    field.style.height = `${height}px`;

    // 年ごとの背景（WORLD 1 / WORLD 2 …）
    years.forEach((year, index) => {
        const inWorld = stages.map((stage, i) => (stage.year === year ? i : -1)).filter((i) => i >= 0);
        const start = pointOf(inWorld[0]).x - STEP / 2;
        const end = pointOf(inWorld[inWorld.length - 1]).x + STEP / 2;
        const zone = make("div", `world-zone is-world-${(index % 3) + 1}`);
        zone.style.left = `${Math.max(start, 0)}px`;
        zone.style.width = `${Math.min(end, width) - Math.max(start, 0)}px`;
        const name = make("span", "", `WORLD ${index + 1} · ${year}`);
        zone.append(name);
        field.append(zone);
    });

    // ステージをつなぐ道
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "world-path");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("aria-hidden", "true");
    const d = stages.map((_, i) => {
        const p = pointOf(i);
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = pointOf(i - 1);
        const mid = (prev.x + p.x) / 2;
        return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
    }).join(" ");
    const road = document.createElementNS(ns, "path");
    road.setAttribute("d", d);
    road.setAttribute("class", "world-road");
    const dash = document.createElementNS(ns, "path");
    dash.setAttribute("d", d);
    dash.setAttribute("class", "world-road-dash");
    svg.append(road, dash);
    field.append(svg);

    const ICON = { award: "★", now: "▶", clear: "✓" };

    const highlight = (item) => {
        item.classList.remove("is-map-target");
        void item.offsetWidth;
        item.classList.add("is-map-target");
        setTimeout(() => item.classList.remove("is-map-target"), 1800);
    };

    const goTo = (stage) => {
        const drawer = document.getElementById("quest-drawer");
        const toggle = document.querySelector('[aria-controls="quest-drawer"]');
        const hidden = drawer && drawer.contains(stage.item) && !drawer.classList.contains("is-open");
        if (hidden && toggle) toggle.click();
        setTimeout(() => {
            stage.item.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
            highlight(stage.item);
        }, hidden ? 450 : 0);
    };

    stages.forEach((stage, index) => {
        const p = pointOf(index);
        const node = make("button");
        node.type = "button";
        node.className = `world-node is-${stage.type}`;
        node.style.left = `${p.x}px`;
        node.style.top = `${p.y}px`;
        node.setAttribute("aria-label", `ステージ ${stage.code}：${stage.date} ${stage.title}（経歴へ移動）`);

        const dot = decor(make("span", "world-node-dot"));
        dot.textContent = ICON[stage.type] || ICON.clear;

        const code = decor(make("span", "world-node-code"));
        code.textContent = stage.code;

        const name = decor(make("span", `world-node-name ${index % 2 ? "is-below" : "is-above"}`));
        name.textContent = stage.title;

        node.append(dot, code, name);
        node.addEventListener("click", () => goTo(stage));
        field.append(node);

        // いま挑戦中のステージには主人公が立っている
        if (stage.type === "now") {
            const hero = make("img", "world-hero");
            hero.src = "images/character/Player.png";
            hero.alt = "";
            hero.setAttribute("aria-hidden", "true");
            hero.style.left = `${p.x - 40}px`;
            hero.style.top = `${p.y}px`;
            field.append(hero);
        }
    });

    scroller.append(field);
    map.append(head, scroller);
    // 「これまでのクエストを見る」ボタンより上に置く
    const questToggle = document.querySelector('[aria-controls="quest-drawer"]');
    (questToggle && !container.contains(questToggle) ? questToggle : container).before(map);

    // 最初は「いまのステージ」が見える位置に
    const showCurrent = () => {
        const nowIndex = stages.findIndex((stage) => stage.type === "now");
        const index = nowIndex >= 0 ? nowIndex : stages.length - 1;
        scroller.scrollLeft = Math.max(0, pointOf(index).x - scroller.clientWidth * 0.7);
    };
    requestAnimationFrame(showCurrent);
    window.addEventListener("resize", showCurrent, { once: true });
})();

