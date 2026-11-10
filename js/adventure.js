/* ========================================
   adventure.js：サイト全体を「1本のゲーム」として遊べるようにする（クラシックだけ）

   1. レベルと経験値：ふつうに見て回るだけで経験値がたまり、レベルが上がる
        ・ステージ（セクション）を読み終える／作品を開く／動画を見る／写真を見る／遊べる作品を開く
          キャラを見つける／トロフィーを取る／メールの窓口を開く …… で経験値（同じことは1回だけ数える）
        ・ヘッダーの「Lv」に今のレベルとゲージ。押すと冒険の記録（トロフィー一覧）
        ・記録は見ている人のブラウザ（localStorage の pa-exp）にだけ残る
   2. STAGE CLEAR：セクションを最後まで読むと「STAGE CLEAR!」
   3. 案内役：各ステージに入ると、キャラクターが RPG の会話ウィンドウで一言しゃべる（× で閉じる・「ガイドを出さない」で止められる）
   4. 手ざわり：ボタンやカードは押すと沈む／経験値は押した場所に「+10 EXP」／作品を開くと「ITEM GET!」

   アニメーション「なし」でも遊べる（動きだけ止まる）。共通の道具（make・localData など）は main.js
======================================== */

(() => {
    const header = document.querySelector(".header");
    if (!header) return;

    const sound = (name) => window.PlaySfx?.(name);
    const still = () => typeof motionOff === "function" && motionOff();

    /* ========================================
       1. レベルと経験値
    ======================================== */

    // レベルに必要な経験値（合計）と、レベルごとの称号
    const NEED = [0, 30, 80, 150, 240, 350, 480, 630, 800, 1000, 1250, 1550, 1900];
    const TITLES = [
        [1, "見習いプレイヤー"],
        [3, "ゲーム好き"],
        [5, "作品ハンター"],
        [7, "熟練プレイヤー"],
        [9, "ゲームマスター"],
        [12, "伝説のプレイヤー"],
    ];
    const levelOf = (exp) => {
        let level = 1;
        while (level < NEED.length && exp >= NEED[level]) level += 1;
        return level;
    };
    const titleOf = (level) => TITLES.filter(([from]) => level >= from).pop()[1];

    const saved = localData.get("pa-exp", null);
    const data = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    const done = new Set(Array.isArray(data.done) ? data.done.filter((key) => typeof key === "string") : []);
    let exp = Math.max(0, Number(data.exp) || 0);
    const persist = () => localData.set("pa-exp", { exp, done: [...done].slice(-600) });

    const state = () => {
        const level = levelOf(exp);
        const max = level >= NEED.length;
        return {
            level,
            title: titleOf(level),
            exp,
            next: max ? null : NEED[level] - exp,
            rate: max ? 1 : (exp - NEED[level - 1]) / (NEED[level] - NEED[level - 1]),
        };
    };
    window.PlayLevel = { state };

    // ヘッダーの Lv 表示（押すと冒険の記録）
    const hud = make("button", "lv-hud");
    hud.type = "button";
    const hudLevel = make("b", "lv-hud-level");
    const hudBar = make("span", "lv-hud-bar");
    const hudFill = make("span");
    hudBar.append(hudFill);
    const hudText = make("small", "lv-hud-text");
    hud.append(hudLevel, hudBar, hudText);
    hud.addEventListener("click", () => {
        window.PlayTrophy?.open();
        emitPlayEvent("冒険の記録を開いた");
    });
    // ヘッダーの下に、タグのようにぶら下げる（ヘッダーの中はメニューでいっぱいなので）
    header.append(hud);

    const renderHud = () => {
        const now = state();
        hudLevel.textContent = `Lv.${now.level}`;
        hudFill.style.transform = `scaleX(${now.rate})`;
        hudText.textContent = now.next === null ? "MAX" : `${now.exp} EXP`;
        hud.setAttribute("aria-label", `レベル ${now.level}「${now.title}」。${now.next === null ? "最大レベルです" : `次のレベルまで ${now.next} EXP`}。押すと冒険の記録を開きます`);
    };
    renderHud();

    // 「+10 EXP」の文字（押した場所、なければ Lv 表示の下）
    const floatText = (text, x, y, tone = "") => {
        if (still()) return;
        const pop = decor(make("span", `exp-pop${tone ? ` is-${tone}` : ""}`, text));
        if (x === undefined) {
            const rect = hud.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.bottom + 8;
        }
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        document.body.append(pop);
        setTimeout(() => pop.remove(), 1100);
    };

    // レベルアップの演出（画面の真ん中に大きく）
    const levelUp = (level) => {
        sound("powerup");
        emitPlayEvent(`レベルアップ: Lv.${level}`);
        const banner = make("div", "lv-up");
        banner.setAttribute("role", "status");
        banner.append(make("small", "", "LEVEL UP!"), make("b", "", `Lv.${level}`), make("span", "", titleOf(level)));
        document.body.append(banner);
        setTimeout(() => banner.remove(), still() ? 1800 : 2200);
        hud.classList.remove("is-up");
        void hud.offsetWidth;
        hud.classList.add("is-up");
    };

    // 経験値をもらう（同じ key は1回だけ）
    let lastPoint = null;
    document.addEventListener("pointerdown", (event) => {
        lastPoint = { x: event.clientX, y: event.clientY, at: performance.now() };
    }, true);
    const gain = (key, amount) => {
        if (!key || done.has(key)) return false;
        done.add(key);
        const before = levelOf(exp);
        exp += amount;
        persist();
        renderHud();
        const near = lastPoint && performance.now() - lastPoint.at < 1500 ? lastPoint : null;
        floatText(`+${amount} EXP`, near?.x, near ? near.y - 18 : undefined);
        const after = levelOf(exp);
        if (after > before) setTimeout(() => levelUp(after), 350);
        return true;
    };
    window.PlayLevel.gain = gain;

    /* ========================================
       2. ステージ（セクション）と STAGE CLEAR
    ======================================== */

    const stages = Array.from(document.querySelectorAll("main > section[id]"));
    // ステージの名前：見出し（英字の大きな見出し）。なければ最初の見出し
    const nameOf = (section) => (section.querySelector(":scope > .section-title h2") || section.querySelector("h2"))?.textContent.replace(/\s+/g, " ").trim() || section.id;

    const clearBanner = (section, index) => {
        const banner = make("div", "stage-clear");
        banner.setAttribute("role", "status");
        banner.append(make("small", "", `STAGE ${String(index + 1).padStart(2, "0")}`), make("b", "", "CLEAR!"), make("span", "", nameOf(section)));
        document.body.append(banner);
        setTimeout(() => banner.remove(), 2000);
        sound("stage");
    };

    // セクションの最後が画面の上の方まで来たら「読み終えた」
    const checkClear = () => {
        stages.forEach((section, index) => {
            if (section.id === "ending") return;
            const key = `stage:${section.id}`;
            if (done.has(key)) return;
            const rect = section.getBoundingClientRect();
            if (rect.height && rect.bottom < window.innerHeight * 0.55 && rect.bottom > -window.innerHeight) {
                if (gain(key, 20)) clearBanner(section, index);
            }
        });
    };
    let clearTick = false;
    window.addEventListener("scroll", () => {
        if (clearTick) return;
        clearTick = true;
        setTimeout(() => {
            clearTick = false;
            checkClear();
        }, 250);
    }, { passive: true });

    /* ---------- 経験値がもらえること ---------- */

    document.addEventListener("work-viewer:open", (event) => {
        if (gain(`work:${event.detail?.title}`, 10)) itemGet(event.detail?.title);
    });
    // 動画を見た（トップの自動で流れる動画は数えない）
    document.addEventListener("play", (event) => {
        const video = event.target;
        if (!(video instanceof HTMLVideoElement) || video.classList.contains("hero-video") || video.muted && video.loop) return;
        gain(`video:${video.currentSrc || video.src}`, 15);
    }, true);
    document.addEventListener("click", (event) => {
        const photo = event.target.closest?.(".tech-photo, .timeline-photo");
        if (photo) gain(`photo:${photo.querySelector("img")?.getAttribute("src") || photo.textContent.trim().slice(0, 20)}`, 5);
        const target = event.target.closest?.("a, button");
        if (!target) return;
        if (target.closest(".play-card, .work-viewer-play, .featured-play")) gain(`play:${target.closest("a")?.href || ""}`, 10);
        if (target.closest("[data-mail], a[href^='mailto:']")) gain(`mail:${target.dataset.mail || "mail"}`, 20);
        if (target.closest(".settings-button")) gain("options", 5);
        if (target.closest("[role='tab']")) gain(`tab:${target.id || target.textContent.trim().slice(0, 12)}`, 5);
    });
    document.addEventListener("play:cast", (event) => gain(`cast:${event.detail?.count}`, 15));
    document.addEventListener("play:trophy", (event) => gain(`trophy:${event.detail?.id}`, 30));
    document.addEventListener("play:event", (event) => {
        const name = event.detail?.name || "";
        if (name === "隠しコマンド") gain("konami", 30);
        if (name === "ゲームパッド") gain("gamepad", 20);
    });

    /* ========================================
       4. 手ざわり（押すと沈む・ITEM GET）
    ======================================== */

    const PRESSABLE = "button, .hero-button, .hero-text-link, .play-card, .work-card, .sns-card, .article-card, .mode-card, [data-mail], .blog-button";
    document.addEventListener("pointerdown", (event) => {
        if (still()) return;
        const target = event.target.closest?.(PRESSABLE);
        if (!target || target.closest("dialog, .lv-hud")) return;
        target.classList.add("is-pressed");
        const release = () => {
            setTimeout(() => target.classList.remove("is-pressed"), 90);
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
    });

    function itemGet(title) {
        const viewer = document.querySelector(".work-viewer[open], .work-viewer.is-open, .work-viewer");
        const host = viewer?.querySelector(".work-viewer-panel") || viewer;
        if (!host || still()) return;
        host.querySelector(".item-get")?.remove();
        const label = decor(make("span", "item-get"));
        label.append(make("b", "", "ITEM GET!"), make("small", "", title || ""));
        host.append(label);
        sound("coin");
        setTimeout(() => label.remove(), 1700);
    }

    /* ========================================
       3. 案内役のキャラ（RPG の会話ウィンドウ）
    ======================================== */

    const GUIDE_OFF = "pa-guide-off";
    const LINES = {
        top: ["Player", "PLAYER", "ようこそ、はるのポートフォリオへ！ スクロールして冒険をはじめよう。"],
        summary: ["Penko", "PENKO", "まずはここで、はるのことを30秒でつかんでね！"],
        about: ["Penny", "PENNY", "ここはプロフィールのステージ。どんな人か見ていこう！"],
        achievements: ["Penzou", "PENZOU", "これまでの実績だよ。数字はぜんぶ作品データから数えているんだ。"],
        "featured-works": ["Koutei", "KOUTEI", "代表作のステージ！ 動画を再生すると、経験値ももらえるよ。"],
        "other-works": ["Fish", "FISH", "作品がたくさん！ カードを開くと「アイテムGET」だ。"],
        "play-games": ["Machopen", "MACHOPEN", "ここでは実際に遊べるよ。気になったらプレイしてみて！"],
        "what-i-can-do": ["Ojisand", "OJISAND", "はるのステータス画面だよ。できることを確かめていこう。"],
        timeline: ["Chrono_0", "CHRONO", "これまでの冒険の記録だよ。ワールドマップもあるよ。"],
        blog: ["Openji", "OPENJI", "ゲーム制作の学びを、note で発信し続けているんだ。"],
        contact: ["Pensand", "PENSAND", "いよいよ最後のステージ！ 一緒にゲームを作る仲間を募集中だよ。"],
        ending: ["Boss", "BOSS", "ここまで来たきみは、もう立派なプレイヤーだ！"],
    };
    const guideOff = () => localData.get(GUIDE_OFF, false) === true;
    const talked = new Set(sessionData.get("pa-talked", []));

    const box = make("div", "rpg-talk");
    box.setAttribute("role", "status");
    box.hidden = true;
    const face = make("img", "rpg-face");
    face.alt = "";
    face.width = 56;
    face.height = 56;
    const body = make("div", "rpg-body");
    const who = make("b", "rpg-name");
    who.dataset.noTranslate = "";
    const source = make("p", "rpg-source"); // 訳し終えた文を読むための、見えない置き場
    const line = make("p", "rpg-line");
    line.dataset.noTranslate = "";
    const more = decor(make("span", "rpg-more", "▼"));
    body.append(who, source, line, more);
    const close = make("button", "rpg-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "閉じる");
    const off = make("button", "rpg-off", "ガイドを出さない");
    off.type = "button";
    box.append(face, body, close, off);
    document.body.append(box);

    let typing = 0;
    let hideTimer = 0;
    const hide = () => {
        clearInterval(typing);
        clearTimeout(hideTimer);
        box.classList.remove("is-show");
        setTimeout(() => {
            if (!box.classList.contains("is-show")) box.hidden = true;
        }, 300);
    };
    close.addEventListener("click", hide);
    off.addEventListener("click", () => {
        localData.set(GUIDE_OFF, true);
        hide();
        emitPlayEvent("ガイドをOFF");
    });
    // 文字が出ている途中で押すと、最後まで一気に出す
    body.addEventListener("click", () => {
        if (!typing) return hide();
        clearInterval(typing);
        typing = 0;
        line.textContent = source.textContent;
    });

    const say = (key) => {
        const entry = LINES[key];
        if (!entry || guideOff() || talked.has(key) || document.querySelector("dialog[open]")) return;
        talked.add(key);
        sessionData.set("pa-talked", [...talked]);
        const [file, name, text] = entry;
        face.src = `images/character/${file}.png`;
        who.textContent = name;
        source.textContent = text;
        line.textContent = "";
        clearInterval(typing);
        clearTimeout(hideTimer);
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add("is-show"));
        // 英語表示のときは、i18n.js が source を訳し終えるのを少し待ってから、1文字ずつ出す
        setTimeout(() => {
            const full = source.textContent;
            if (still()) {
                line.textContent = full;
                typing = 0;
            } else {
                let i = 0;
                typing = setInterval(() => {
                    i += 1;
                    line.textContent = Array.from(full).slice(0, i).join("");
                    if (i % 3 === 0) sound("cursor");
                    if (i >= Array.from(full).length) {
                        clearInterval(typing);
                        typing = 0;
                    }
                }, 38);
            }
            hideTimer = setTimeout(hide, 3500 + Array.from(full).length * 60);
        }, 60);
    };

    // ステージに入ったら話しかける（入ってから少し読んだところで）
    if ("IntersectionObserver" in window) {
        const watcher = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                setTimeout(() => {
                    const rect = entry.target.getBoundingClientRect();
                    if (rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.3) say(entry.target.id);
                }, 700);
            });
        }, { rootMargin: "-35% 0px -45% 0px" });
        stages.forEach((section) => watcher.observe(section));
    }
    // 最初のあいさつ（トップを見ているとき。登場演出のあと）
    if (!location.hash && window.scrollY < 200) setTimeout(() => window.scrollY < 400 && say("top"), 2600);

    checkClear();
})();
