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
    // シェアの文（訳されない）で使う英語の称号
    const TITLES_EN = { "見習いプレイヤー": "Rookie Player", "ゲーム好き": "Game Lover", "作品ハンター": "Work Hunter", "熟練プレイヤー": "Skilled Player", "ゲームマスター": "Game Master", "伝説のプレイヤー": "Legendary Player" };

    const saved = localData.get("pa-exp", null);
    const data = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    const done = new Set(Array.isArray(data.done) ? data.done.filter((key) => typeof key === "string") : []);
    let exp = Math.max(0, Number(data.exp) || 0);
    // 訪問の回数（タブを開いたときに1回）と、前回のレベル（「おかえり」のあいさつに使う）
    const lastLevel = Math.max(1, Number(data.level) || 1);
    let visits = Math.max(0, Number(data.visits) || 0);
    try {
        if (!sessionStorage.getItem("pa-visit")) {
            sessionStorage.setItem("pa-visit", "1");
            visits += 1;
        }
    } catch {
        /* 保存が使えなくても動く */
    }
    const persist = () => localData.set("pa-exp", { exp, done: [...done].slice(-600), visits, level: levelOf(exp) });

    const state = () => {
        const level = levelOf(exp);
        const max = level >= NEED.length;
        return {
            level,
            title: titleOf(level),
            titleEn: TITLES_EN[titleOf(level)],
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
    const pops = [];
    const floatText = (text, x, y, tone = "") => {
        if (still()) return;
        const pop = decor(make("span", `exp-pop${tone ? ` is-${tone}` : ""}`, text));
        // 場所の指定がないときは、Lv の札の右どなり（ヘッダーの下のお知らせと重ならないように）
        if (x === undefined) {
            const rect = hud.getBoundingClientRect();
            x = rect.right + 48;
            y = rect.top + rect.height / 2 - 10;
        }
        // まだ消えていない「+EXP」の近くに出るときは、横にずらす（画面の外に出るときは左へ）
        const now = performance.now();
        const near = pops.filter((p) => now - p.at < 1100 && Math.abs(p.x - x) < 90 && Math.abs(p.y - y) < 60);
        if (near.length) {
            const right = Math.max(...near.map((p) => p.x)) + 96;
            x = right < window.innerWidth - 50 ? right : Math.min(...near.map((p) => p.x)) - 96;
        }
        pops.push({ x, y, at: now });
        while (pops.length > 8) pops.shift();
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        document.body.append(pop);
        setTimeout(() => pop.remove(), 1100);
    };

    // 画面の真ん中に大きく出すもの（LEVEL UP!・GAME CLEAR!）は、1つずつ順番に
    const centerQueue = [];
    let centerBusy = false;
    const showCenter = (banner, ms, sfx) => {
        centerQueue.push({ banner, ms, sfx });
        const next = () => {
            if (centerBusy || !centerQueue.length) return;
            centerBusy = true;
            const item = centerQueue.shift();
            document.body.append(item.banner);
            if (item.sfx) sound(item.sfx);
            setTimeout(() => {
                item.banner.remove();
                centerBusy = false;
                setTimeout(next, 200);
            }, item.ms);
        };
        next();
    };

    // レベルアップの演出（画面の真ん中に大きく）
    const levelUp = (level) => {
        emitPlayEvent(`レベルアップ: Lv.${level}`);
        const banner = make("div", "lv-up");
        banner.setAttribute("role", "status");
        banner.append(make("small", "", "LEVEL UP!"), make("b", "", `Lv.${level}`), make("span", "", titleOf(level)));
        showCenter(banner, still() ? 1800 : 2200, "powerup");
        hud.classList.remove("is-up");
        void hud.offsetWidth;
        hud.classList.add("is-up");
    };

    // 経験値をもらう（同じ key は1回だけ）
    let lastPoint = null;
    document.addEventListener("pointerdown", (event) => {
        lastPoint = { x: event.clientX, y: event.clientY, at: performance.now() };
    }, true);
    let pendingExp = 0;
    let pendingTimer = 0;
    const gain = (key, amount) => {
        if (!key || done.has(key)) return false;
        done.add(key);
        const before = levelOf(exp);
        exp += amount;
        persist();
        renderHud();
        // 同じ瞬間にいくつももらったときは、まとめて1つの「+○○ EXP」にする（文字が重ならないように）
        pendingExp += amount;
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
            const near = lastPoint && performance.now() - lastPoint.at < 1500 ? lastPoint : null;
            floatText(`+${pendingExp} EXP`, near?.x, near ? near.y - 18 : undefined);
            pendingExp = 0;
        }, 400);
        const after = levelOf(exp);
        if (after > before) setTimeout(() => levelUp(after), 350);
        checkQuests();
        return true;
    };
    window.PlayLevel.gain = gain;

    /* ========================================
       2. ステージ（セクション）と STAGE CLEAR
    ======================================== */

    const stages = Array.from(document.querySelectorAll("main > section[id]"));
    // ステージの名前：見出し（英字の大きな見出し）。なければ最初の見出し
    const nameOf = (section) => (section.querySelector(":scope > .section-title h2") || section.querySelector("h2"))?.textContent.replace(/\s+/g, " ").trim() || section.id;

    // お知らせは、ヘッダーの下の1か所（play.js のお知らせ）に順番に出す（ほかの通知と重ならないように）
    const notice = (label, text, tone, sfx) => document.dispatchEvent(new CustomEvent("play:notify", { detail: { label, text, tone, sound: sfx } }));
    const clearBanner = (section, index) => notice(`STAGE ${String(index + 1).padStart(2, "0")} CLEAR! `, nameOf(section), "stage", "stage");

    // そのセクションを画面で見ていた時間（メニューで一気に飛んだときに、通り過ぎただけのステージまでクリアにしないため）
    const seenMs = {};
    let seenAt = performance.now();
    setInterval(() => {
        const now = performance.now();
        const step = Math.min(1000, now - seenAt);
        seenAt = now;
        if (document.hidden) return;
        stages.forEach((section) => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.8 && rect.bottom > window.innerHeight * 0.2) seenMs[section.id] = (seenMs[section.id] || 0) + step;
        });
    }, 300);
    const SEEN_ENOUGH = 1500;

    // セクションの最後が画面の上の方まで来たら「読み終えた」（少しでも見ていたステージだけ）
    const checkClear = () => {
        stages.forEach((section, index) => {
            if (section.id === "ending") return;
            const key = `stage:${section.id}`;
            if (done.has(key)) return;
            const rect = section.getBoundingClientRect();
            if (rect.height && rect.bottom < window.innerHeight * 0.55 && (seenMs[section.id] || 0) >= SEEN_ENOUGH) {
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
        top: ["Player", "PLAYER", "ようこそ、はるのポートフォリオへ！ 左上の Lv を押すと、クエストを確認できるよ。"],
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
    // レベル5からは、キャラのセリフが変わる
    const LINES_HIGH = {
        summary: ["Penko", "PENKO", "もうベテランだね！ ここは30秒でおさらいできるよ。"],
        about: ["Penny", "PENNY", "何度も来てくれてありがとう！ はるのことは、もうくわしいね。"],
        "featured-works": ["Koutei", "KOUTEI", "作品ハンターのきみなら、技術の見どころも読んでいけるはず！"],
        "other-works": ["Fish", "FISH", "まだ開いていない作品もあるかも？ 図鑑のように集めてみて！"],
        "play-games": ["Machopen", "MACHOPEN", "そろそろ遊ぶ側から、作る側にどう？ なんてね！"],
        timeline: ["Chrono_0", "CHRONO", "冒険の記録は、これからもどんどん増えていくよ。"],
        contact: ["Pensand", "PENSAND", "ここまで育ったきみなら、はるの最高の仲間になれるよ！"],
        ending: ["Boss", "BOSS", "見事だ……！ きみこそ、真のプレイヤーだ！"],
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
    // トロフィーの通知（右下）を、会話ウィンドウの高さの分だけ上に逃がす（文字が増えて高くなっても合わせる。css/adventure.css）
    if ("ResizeObserver" in window) {
        new ResizeObserver(() => document.documentElement.style.setProperty("--talk-h", `${box.offsetHeight}px`)).observe(box);
    }

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

    const say = (key, override) => {
        const entry = override || (state().level >= 5 && LINES_HIGH[key]) || LINES[key];
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
        sound("open");
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
            hideTimer = setTimeout(hide, 5000 + Array.from(full).length * 70);
        }, 60);
    };

    // ステージに入ったら話しかける（入ってから少し読んだところで）
    if ("IntersectionObserver" in window) {
        const watcher = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                setTimeout(() => {
                    const rect = entry.target.getBoundingClientRect();
                    if (rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.3) {
                        if (entry.target.id === "contact") gain("reach:contact", 10);
                        say(entry.target.id);
                    }
                }, 700);
            });
        }, { rootMargin: "-35% 0px -45% 0px" });
        stages.forEach((section) => watcher.observe(section));
    }
    // 最初のあいさつ（トップを見ているとき。登場演出のあと）
    /* ---------- 最初の数秒の流れ（通知が一度に重ならないよう、1本の流れにする）
       READY?（クラシックの登場演出）→ つづきから（2回目の人）→ 案内役のあいさつ → 設定の案内 → 最初のクエスト ---------- */

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitUntil = async (check, limit) => {
        const end = performance.now() + limit;
        while (!check() && performance.now() < end) await wait(250);
    };
    const talking = () => !box.hidden;
    const opening = async () => {
        // 登場演出（READY? と、トップが弾んで出る動き）が終わるまで
        await wait(root().classList.contains("cl-intro") ? 2800 : 1400);
        // 「つづきから」のカードが出ているあいだは待つ
        await waitUntil(() => !document.querySelector(".play-continue"), 14000);
        if (window.scrollY < 400) {
            // 2回目からは「おかえり」
            if (visits >= 2 && exp > 0) say("top", ["Player", "PLAYER", `おかえり！ 前回は Lv.${lastLevel} まで進んだね。続きを楽しんでいってね。`]);
            else say("top");
            await wait(400);
            await waitUntil(() => !talking(), 15000);
        }
        await wait(500);
        window.ShowSettingsHint?.();
        // 初めての人には、受けたクエストをひとつ知らせる（設定の案内が消えるころに）
        if (visits <= 1 && !countOf("quest:")) {
            await wait(3500);
            const first = activeQuests()[0];
            if (first) notice("NEW QUEST ", first.text, "quest");
        }
    };
    const root = () => document.documentElement;
    if (!location.hash && window.scrollY < 200) setTimeout(() => opening(), 0);

    /* ========================================
       5. クエスト（今やること3つ）
          冒険の記録（Lv を押す）で見られる。達成するとボーナス経験値と「QUEST CLEAR!」、次のクエストが出る
    ======================================== */

    const countOf = (prefix) => [...done].filter((key) => key.startsWith(prefix)).length;
    const QUESTS = [
        { id: "video", text: "Main Works の動画を見よう", goal: 1, now: () => countOf("video:") },
        { id: "works3", text: "作品を3つ開こう", goal: 3, now: () => countOf("work:") },
        { id: "map", text: "経歴のワールドマップを見よう", goal: 1, now: () => (done.has("map") ? 1 : 0) },
        { id: "photo", text: "写真を拡大して見よう", goal: 1, now: () => countOf("photo:") },
        { id: "play", text: "遊べる作品を開いてみよう", goal: 1, now: () => countOf("play:") },
        { id: "skill", text: "スキルを3つ習得しよう", goal: 3, now: () => countOf("skill:") },
        { id: "stage5", text: "ステージを5つクリアしよう", goal: 5, now: () => countOf("stage:") },
        { id: "cast3", text: "隠れているキャラを3体見つけよう", goal: 3, now: () => countOf("cast:") },
        { id: "contact", text: "最後のステージ「Contact」までたどり着こう", goal: 1, now: () => (done.has("reach:contact") ? 1 : 0) },
    ];
    const QUEST_EXP = 40;
    const ACTIVE = 3;
    const activeQuests = () => QUESTS.filter((quest) => !done.has(`quest:${quest.id}`)).slice(0, ACTIVE);
    window.PlayLevel.quests = () => activeQuests().map((quest) => ({ text: quest.text, now: Math.min(quest.goal, quest.now()), goal: quest.goal }));
    window.PlayLevel.questsDone = () => countOf("quest:");
    window.PlayLevel.questsTotal = QUESTS.length;

    const questBanner = (quest) => notice(`QUEST CLEAR! +${QUEST_EXP} EXP `, quest.text, "quest", "trophy");
    let checkingQuests = false;
    function checkQuests() {
        if (checkingQuests) return;
        checkingQuests = true;
        const before = activeQuests().map((quest) => quest.id);
        activeQuests().forEach((quest) => {
            if (quest.now() < quest.goal) return;
            // 演出が重ならないよう、STAGE CLEAR のあとに少しずらして出す
            if (gain(`quest:${quest.id}`, QUEST_EXP)) questBanner(quest);
        });
        checkingQuests = false;
        // 新しく出てきたクエストを、ヘッダーの下のお知らせで知らせる
        activeQuests()
            .filter((quest) => !before.includes(quest.id))
            .forEach((quest) => notice("NEW QUEST ", quest.text, "quest"));
    }
    // 経験値にはならないけれど、クエストの手がかりになること
    document.addEventListener("click", (event) => {
        if (event.target.closest?.(".world-map, .world-node")) gain("map", 10);
    });
    // 横スクロールで眺めたときも（ページが自動で動かすスクロールは数えないよう、人の操作だけ）
    ["wheel", "touchstart", "pointerdown"].forEach((type) => document.querySelector(".world-map-scroll")?.addEventListener(type, () => gain("map", 10), { once: true, passive: true }));

    /* ========================================
       6. ▶ の選択カーソル（RPG のメニューのように、選んでいるものの左に ▶）
    ======================================== */

    const SELECTABLE = ".header-nav a, .settings-button, .lv-hud, .hero-button, .hero-text-link, .mode-card, .work-card, .play-card, .sns-card, .article-card, .purpose-button, .mail-button, .next-stage, .footer-trophy, .ending-button, .blog-button, .summary-mail, .works-toggle, [role='tab']";
    const cursor = decor(make("span", "menu-cursor", "▶"));
    document.body.append(cursor);
    let selected = null;
    const placeCursor = () => {
        if (!selected || !selected.isConnected || selected.closest("dialog")) {
            cursor.classList.remove("is-show");
            selected = null;
            return;
        }
        const rect = selected.getBoundingClientRect();
        if (!rect.width || rect.bottom < 0 || rect.top > window.innerHeight) {
            cursor.classList.remove("is-show");
            return;
        }
        cursor.style.left = `${Math.max(2, rect.left - 26)}px`;
        cursor.style.top = `${rect.top + rect.height / 2}px`;
        cursor.classList.add("is-show");
    };
    const select = (target) => {
        if (target === selected) return;
        selected = target;
        placeCursor();
    };
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    document.addEventListener("pointerover", (event) => {
        if (!finePointer || event.pointerType !== "mouse") return;
        select(event.target.closest?.(SELECTABLE) || null);
    });
    document.addEventListener("focusin", (event) => {
        const target = event.target.closest?.(SELECTABLE);
        if (target && target.matches(":focus-visible")) select(target);
    });
    document.addEventListener("focusout", () => {
        if (selected && !selected.matches(":hover")) select(null);
    });
    window.addEventListener("scroll", placeCursor, { passive: true });
    window.addEventListener("resize", placeCursor);

    /* ========================================
       7. お問い合わせ：「仲間にしますか？」（Contact の窓口ボタン）
          「はい」でメールを開く（件名と本文のひな形は今までどおり）
    ======================================== */

    const PURPOSE = { recruit: "採用・インターンのご連絡", game: "ゲーム制作のお誘い", web: "Web制作のご相談" };
    const party = make("dialog", "party-dialog");
    party.setAttribute("aria-labelledby", "party-title");
    const partyFace = make("img", "party-face");
    partyFace.src = "images/character/Player.png";
    partyFace.alt = "";
    partyFace.width = 64;
    partyFace.height = 64;
    const partyText = make("div", "party-text");
    const partyTitle = make("p", "party-title", "はるを仲間にしますか？");
    partyTitle.id = "party-title";
    const partyPurpose = make("p", "party-purpose");
    partyText.append(partyTitle, partyPurpose);
    const partyChoices = make("div", "party-choices");
    const yes = make("button", "party-yes", "はい（メールを開く）");
    yes.type = "button";
    const no = make("button", "party-no", "いいえ");
    no.type = "button";
    partyChoices.append(yes, no);
    party.append(partyFace, partyText, partyChoices);
    document.body.append(party);
    let pendingLink = null;
    party.addEventListener("click", (event) => {
        if (event.target === party) party.close();
    });
    no.addEventListener("click", () => {
        party.close();
        notice("PARTY ", "また いつでも 声をかけてね！");
    });
    yes.addEventListener("click", () => {
        const link = pendingLink;
        party.close();
        if (!link) return;
        gain(`mail:${link.dataset.mail || "mail"}`, 20);
        sound("powerup");
        notice("PARTY ", "はるが 仲間に くわわった！", "stage");
        emitPlayEvent(`仲間にする: ${link.dataset.mail || "mail"}`);
        setTimeout(() => (window.location.href = link.href), 250);
    });
    document.addEventListener("click", (event) => {
        const link = event.target.closest?.("#contact .purpose-button, #contact .mail-button");
        if (!link || !/^mailto:/i.test(link.getAttribute("href") || "")) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        pendingLink = link;
        partyPurpose.replaceChildren();
        const purpose = PURPOSE[link.dataset.mail];
        if (purpose) partyPurpose.append(make("span", "", "窓口："), make("span", "", purpose));
        else partyPurpose.append(make("span", "", "メールで連絡します"));
        sound("open");
        party.showModal();
        yes.focus();
    }, true);

    /* ========================================
       8. エンディング：冒険のゴール
          ・エンディングに着いたら「GAME CLEAR!」と、到達したレベル・称号
          ・ランクの欄（play.js）に、レベル・クリアしたステージ・クエストも出す（window.PlayLevel.summary）
          ・スタッフロールの「AND YOU」に、見てくれた人のレベルと称号
    ======================================== */

    const STAGE_TOTAL = stages.filter((section) => section.id !== "ending").length;
    window.PlayLevel.summary = () => ({ ...state(), stages: countOf("stage:") - (done.has("stage:ending") ? 1 : 0), stagesTotal: STAGE_TOTAL, quests: countOf("quest:"), questsTotal: QUESTS.length });

    const credit = Array.from(document.querySelectorAll(".credits-list dt")).find((dt) => dt.textContent.trim() === "AND YOU")?.nextElementSibling;
    const youLine = make("span", "credits-you");
    credit?.append(make("br"), youLine);
    const renderCredit = () => {
        const now = state();
        youLine.replaceChildren(make("b", "", `Lv.${now.level}`), document.createTextNode(" "), make("span", "", now.title));
    };
    renderCredit();

    const ending = document.getElementById("ending");
    if (ending && "IntersectionObserver" in window) {
        const endWatch = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            endWatch.disconnect();
            gain("stage:ending", 50);
            renderCredit();
            const now = state();
            const banner = make("div", "lv-up is-clear");
            banner.setAttribute("role", "status");
            banner.append(make("small", "", "GAME CLEAR!"), make("b", "", `Lv.${now.level}`), make("span", "", now.title));
            setTimeout(() => showCenter(banner, 2800, "stage"), 900);
        }, { threshold: 0.25 });
        endWatch.observe(ending);
    }
    // レベルが上がったら、スタッフロールの称号も合わせる
    hud.addEventListener("animationend", renderCredit);

    /* ========================================
       9. 作品のアイテム図鑑・スキル習得
          ・作品一覧の見出しに「図鑑 12 / 32」、開いたことのある作品のカードに「GET」の印
          ・「What I Can Do」の3つのスキルセットを、それぞれ少し見ていると「SKILL GET」
    ======================================== */

    const workCards = () => Array.from(document.querySelectorAll(".works-list .work-card"));
    const cardTitle = (card) => card.dataset.title || card.querySelector("h3")?.textContent.replace(/\s+/g, " ").trim() || "";
    const dex = make("span", "dex-count");
    document.querySelector("#other-works .section-title")?.append(dex);
    const renderDex = () => {
        const cards = workCards();
        let got = 0;
        cards.forEach((card) => {
            const has = done.has(`work:${cardTitle(card)}`);
            if (has) got += 1;
            card.classList.toggle("is-collected", has);
            if (has && !card.querySelector(".dex-mark")) card.append(decor(make("span", "dex-mark", "GET")));
        });
        dex.replaceChildren(make("small", "", "ITEM DEX"), make("b", "", `${got} / ${cards.length}`));
        dex.setAttribute("aria-label", `作品図鑑 ${got} / ${cards.length}`);
    };
    renderDex();
    document.addEventListener("work-viewer:open", () => setTimeout(renderDex, 50));

    // スキル：「What I Can Do」の3つのスキルセットを、それぞれ少し見ていたら習得（スマホはタブで切り替えて見る）
    const skillSets = Array.from(document.querySelectorAll("#what-i-can-do .can-do-category"));
    const skillName = (set) => set.querySelector(".can-do-category-title h3")?.textContent.replace(/\s+/g, " ").trim() || "";
    const learn = (set) => {
        const name = skillName(set);
        if (!name || !gain(`skill:${name}`, 10)) return;
        notice("SKILL GET ", name, "stage", "powerup");
    };
    if ("IntersectionObserver" in window && skillSets.length) {
        const timers = new Map();
        const skillWatch = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const set = entry.target;
                // スマホのタブで隠れているスキルセットは数えない
                const visible = entry.isIntersecting && set.offsetParent !== null && getComputedStyle(set).display !== "none";
                clearTimeout(timers.get(set));
                if (visible) timers.set(set, setTimeout(() => learn(set), 1200));
            });
        }, { threshold: 0.35 });
        skillSets.forEach((set) => skillWatch.observe(set));
        document.addEventListener("click", (event) => {
            if (!event.target.closest?.(".can-do-tabs button")) return;
            setTimeout(() => skillSets.filter((set) => set.classList.contains("is-mobile-current")).forEach((set) => setTimeout(() => learn(set), 1200)), 50);
        });
    }

    checkClear();
    checkQuests();
})();
