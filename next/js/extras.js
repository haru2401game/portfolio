/* ========================================
   extras.js：遊び要素（新デザイン）

   1. トロフィー（14種）……今のサイトと同じ記録（pa-trophy）。OPTIONS の中に一覧
   2. キャラクター図鑑 …… 顔を出す・漂うキャラをクリックすると図鑑に登録（pa-cast）。エンディングに CAST が出る
   3. 隠しコマンド ……… ↑↑↓↓←→←→BA（スマホはロゴを2秒以内に5回タップ／ゲームパッドでも入力できる）
   4. つづきから ………… 2回目の訪問で、前回見ていたセクションへ案内（pa-save）
   5. リザルト ………… エンディングにランク・プレイタイム・結果をシェア

   記録は、見ている人のブラウザ（localStorage / sessionStorage）にだけ残る。今のサイトと共通なので、
   どちらのデザインで遊んでも続きになる
   ※ next.js のあとに読み込む（通知・効果音は window.NextUI を使う）
======================================== */

(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const root = document.documentElement;
    const BASE = root.dataset.base || "";
    const UI = window.NextUI || { toast() {}, sound() {}, emit() {} };
    const calm = () => root.classList.contains("motion-off");
    const scrollBehavior = () => (calm() ? "auto" : "smooth");

    const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };
    const storage = (area) => ({
        get(key, fallback) {
            try {
                const value = area.getItem(key);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                area.setItem(key, JSON.stringify(value));
            } catch {
                /* 保存できなくても遊べる */
            }
        },
    });
    const local = storage(window.localStorage);
    const session = storage(window.sessionStorage);
    const notify = (label, text) => UI.toast(label, text, true);

    /* ========================================
       1. トロフィー
    ======================================== */

    const TROPHIES = [
        { id: "start", title: "PRESS START", text: "ポートフォリオに遊びに来た", hint: "" },
        { id: "achievements", title: "実績チェック", text: "制作実績をチェックした", hint: "PLAYER STATUS を見てみよう" },
        { id: "works5", title: "作品ハンター", text: "作品の詳細を5作品見た", hint: "Other Works のカードを押してみよう" },
        { id: "photo", title: "思い出アルバム", text: "写真を拡大して見た", hint: "写真を押してみよう" },
        { id: "play", title: "プレイヤー", text: "遊べる作品のサイトを開いた", hint: "実際に遊べる場所があるよ" },
        { id: "cast5", title: "キャラ探し", text: "キャラクターを5体見つけた", hint: "顔を出すキャラを押してみよう" },
        { id: "castAll", title: "図鑑コンプリート", text: "全キャラクターを見つけた", hint: "キャラクターを全員見つけよう" },
        { id: "konami", title: "隠しコマンド", text: "隠しコマンドを見つけた", hint: "ゲーム好きなら知っているあのコマンド" },
        { id: "like100", title: "いいね連打", text: "いいねを100回押した", hint: "右下のハートを押しまくろう" },
        { id: "allStages", title: "全ステージ踏破", text: "全ステージを見た", hint: "すべてのセクションを見てみよう" },
        { id: "ending", title: "ALL CLEAR", text: "エンディングにたどり着いた", hint: "最後まで進んでみよう" },
        { id: "continue", title: "セーブデータ", text: "「つづきから」で再開した", hint: "また遊びに来てね" },
        { id: "gamepad", title: "コントローラー派", text: "ゲームパッドでサイトを操作した", hint: "コントローラーをつないでみよう" },
        { id: "share", title: "シェアありがとう", text: "クリアの結果をシェアした", hint: "エンディングで結果をシェアしてみよう" },
    ];
    let unlocked = local.get("pa-trophy", {});
    if (!unlocked || typeof unlocked !== "object" || Array.isArray(unlocked)) unlocked = {};
    const count = () => TROPHIES.filter((trophy) => unlocked[trophy.id]).length;

    const renderTrophies = () => {
        const list = $("[data-trophies]");
        if (list) {
            list.replaceChildren(
                ...TROPHIES.map((trophy) => {
                    const got = Boolean(unlocked[trophy.id]);
                    const item = make("li", got ? "is-got" : "");
                    item.append(make("b", "", got ? trophy.title : "？？？"));
                    const note = got ? trophy.text : trophy.hint ? `ヒント：${trophy.hint}` : "";
                    if (note) item.append(make("small", "", note));
                    return item;
                }),
            );
        }
        $$("[data-trophy-count]").forEach((node) => (node.textContent = `${count()} / ${TROPHIES.length}`));
    };

    const unlock = (id) => {
        const trophy = TROPHIES.find((item) => item.id === id);
        if (!trophy || unlocked[id]) return;
        unlocked[id] = Date.now();
        local.set("pa-trophy", unlocked);
        renderTrophies();
        UI.sound("trophy");
        UI.toast(`TROPHY UNLOCKED ${count()} / ${TROPHIES.length}`, trophy.title);
        document.dispatchEvent(new CustomEvent("play:trophy", { detail: { id, count: count() } }));
        if (count() === TROPHIES.length) UI.emit("トロフィー コンプリート");
    };
    renderTrophies();

    // PRESS START：開いた瞬間だと通知がトップに重なるので、最初にスクロールしたとき（しなければ8秒後）
    const pressStart = () => {
        removeEventListener("scroll", onFirstScroll);
        clearTimeout(startTimer);
        unlock("start");
    };
    const onFirstScroll = () => scrollY > 120 && pressStart();
    addEventListener("scroll", onFirstScroll, { passive: true });
    const startTimer = setTimeout(pressStart, 8000);

    // 作品の詳しい画面を5作品
    const seenWorks = new Set(session.get("pa-works", []));
    document.addEventListener("work-viewer:open", (event) => {
        if (event.detail?.title) seenWorks.add(event.detail.title);
        session.set("pa-works", [...seenWorks]);
        if (seenWorks.size >= 5) unlock("works5");
    });

    let photos = session.get("pa-photos", 0);
    let likes = local.get("pa-likes", 0);
    document.addEventListener("click", (event) => {
        if (event.target.closest?.(".photo, .tl-photo")) {
            photos += 1;
            session.set("pa-photos", photos);
            unlock("photo");
        }
        if (event.target.closest?.(".play-card, .work-viewer-play, .featured-play")) unlock("play");
        if (event.target.closest?.(".like-button")) {
            likes += 1;
            local.set("pa-likes", likes);
            if (likes >= 100) unlock("like100");
        }
    }, true);

    document.addEventListener("play:event", (event) => {
        const name = event.detail?.name;
        if (name === "隠しコマンド") unlock("konami");
        if (name === "つづきから") unlock("continue");
        if (name === "ゲームパッド") unlock("gamepad");
    });

    /* ========================================
       2. キャラクター図鑑
    ======================================== */

    const CHARACTER = /images\/character\/([A-Za-z]+)(?:_\d+)?\.png$/;
    const nameOf = (img) => (img.getAttribute("src") || "").match(CHARACTER)?.[1] || "";

    const sprite = (file, className) => {
        const img = make("img", className);
        img.loading = "lazy";
        img.decoding = "async";
        img.src = `${BASE}images/character/${file}`;
        img.alt = "";
        img.draggable = false;
        img.setAttribute("aria-hidden", "true");
        return img;
    };

    // のぞく：箱のふちから、ときどき顔を出す
    const PEEKERS = [
        { host: ".hero-badges", file: "Koutei.png", x: "70%", w: 76, delay: 2 },
        { host: ".about-photo", file: "Pensand.png", x: "64%", w: 88, delay: 1 },
        { host: ".about-meta", file: "Penko.png", x: "30%", w: 64, delay: 4 },
        { host: ".skill-col:nth-child(2)", file: "Openji.png", x: "62%", w: 56, delay: 5.5 },
        { host: "#panel-shishito .sp-info", file: "Ojisand.png", x: "78%", w: 72, delay: 3 },
        { host: ".filters", file: "Penzou.png", x: "86%", w: 60, delay: 6.5 },
        { host: ".articles", file: "Penny.png", x: "86%", w: 76, delay: 2.5 },
        { host: ".tl-item.is-now .tl-card", file: "Chrono_0.png", side: true, y: "18%", w: 60, delay: 0.5 },
        { host: ".play-grid", file: "Machopen.png", x: "6%", w: 76, delay: 6 },
        { host: ".mail-bar", file: "Player.png", x: "86%", w: 60, delay: 3.5 },
        { host: ".ft", file: "Clone_0.png", x: "46%", w: 60, delay: 7.5 },
    ];
    PEEKERS.forEach((config) => {
        const host = $(config.host);
        if (!host) return;
        const frame = make("div", `peeker${config.side ? " is-side" : ""}`);
        frame.setAttribute("aria-hidden", "true");
        frame.style.setProperty("--peek-x", config.x || "0");
        frame.style.setProperty("--peek-y", config.y || "0");
        frame.style.setProperty("--peek-w", `${config.w}px`);
        frame.style.setProperty("--peek-delay", `${config.delay}s`);
        frame.append(sprite(config.file, "peeker-sprite"));
        host.classList.add("has-peeker");
        host.append(frame);
    });

    // 漂う：セクションの後ろを横切る
    const DRIFTERS = [
        { section: ".hero", file: "Fish.png", y: "80%", w: 60, d: 34, delay: -6 },
        { section: ".about", file: "RedFish.png", y: "86%", w: 54, d: 40, delay: -12, reverse: true },
        { section: ".featured", file: "Boss.png", y: "58%", w: 116, d: 58, delay: -14 },
        { section: ".works", file: "RedFish.png", y: "30%", w: 56, d: 38, delay: -4, reverse: true },
        { section: ".works", file: "Fish.png", y: "74%", w: 50, d: 46, delay: -28 },
        { section: ".skills", file: "Penzou.png", y: "44%", w: 60, d: 48, delay: -8 },
        { section: ".play", file: "Ojisand.png", y: "70%", w: 58, d: 40, delay: -16, reverse: true },
        { section: ".blog", file: "Penko.png", y: "14%", w: 60, d: 50, delay: -30 },
        { section: ".contact", file: "RedFish.png", y: "72%", w: 54, d: 36, delay: -18 },
    ];
    DRIFTERS.forEach((config) => {
        const section = $(config.section);
        if (!section) return;
        let layer = $(":scope > .ambient", section);
        if (!layer) {
            layer = make("div", "ambient");
            layer.setAttribute("aria-hidden", "true");
            section.prepend(layer);
        }
        const img = sprite(config.file, `drifter${config.reverse ? " is-reverse" : ""}`);
        img.style.top = config.y;
        img.style.setProperty("--drift-w", `${config.w}px`);
        img.style.setProperty("--drift-d", `${config.d}s`);
        img.style.setProperty("--drift-delay", `${config.delay}s`);
        layer.append(img);
    });

    // 飛び出す：カードにマウスを乗せると顔を出す
    const POP = { ".play-card": ["Pensand.png", "Penko.png", "Machopen.png"], ".sns a": ["Koutei.png", "RedFish.png", "Chrono_0.png", "Ojisand.png", "Fish.png"] };
    Object.entries(POP).forEach(([selector, cast]) => {
        $$(selector).forEach((card, index) => card.append(sprite(cast[index % cast.length], "card-pop")));
    });

    const allCast = () => [...new Set($$('img[src*="images/character/"]').map(nameOf).filter(Boolean))].sort();
    const castTotal = allCast().length;
    const found = new Set(local.get("pa-cast", []).filter((name) => typeof name === "string"));

    const bubble = (x, y, text) => {
        if (calm()) return;
        const node = make("span", "play-bubble", text);
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        document.body.append(node);
        setTimeout(() => node.remove(), 1100);
    };

    const renderCast = () => {
        const cast = $("[data-ending-cast]");
        const meter = $("[data-cast-meter]");
        if (!cast) return;
        const names = allCast();
        cast.replaceChildren(
            ...names.map((name) => {
                const item = make("span", found.has(name) ? "cast-name is-found" : "cast-name", found.has(name) ? name : "？？？");
                return item;
            }),
        );
        const got = [...found].filter((name) => names.includes(name)).length;
        if (meter) {
            meter.textContent = got >= names.length
                ? `CAST ${got} / ${names.length} コンプリート！`
                : calm()
                    ? `CAST ${got} / ${names.length} 発見 ── ⚙ OPTIONS のアニメーションを「なし」以外にすると、キャラクターが顔を出します`
                    : `CAST ${got} / ${names.length} 発見 ── サイトのあちこちで顔を出すキャラクターを、クリックして探してみてください`;
            meter.classList.toggle("is-complete", got >= names.length);
        }
        const secret = $("[data-cast-secret]");
        if (secret) secret.hidden = got < names.length;
        if (got >= 5) unlock("cast5");
        if (names.length && got >= names.length) unlock("castAll");
    };

    const catchCharacter = (img, event) => {
        const name = nameOf(img);
        if (!name) return;
        img.classList.add("is-caught");
        setTimeout(() => img.classList.remove("is-caught"), 450);
        // 押した場所に輪が広がる（キャラ自体の動きは止めない）
        if (!calm()) {
            const burst = make("span", "catch-burst");
            burst.style.left = `${event.clientX}px`;
            burst.style.top = `${event.clientY}px`;
            document.body.append(burst);
            setTimeout(() => burst.remove(), 550);
        }
        if (found.has(name)) {
            bubble(event.clientX, event.clientY, name);
            return;
        }
        found.add(name);
        local.set("pa-cast", [...found]);
        bubble(event.clientX, event.clientY, "見つかった！");
        UI.sound("select");
        const total = castTotal;
        notify(found.size >= total ? "CAST COMPLETE!" : "NEW CAST!", found.size >= total ? `全${total}キャラ発見！ エンディングを見てね` : `${name} を見つけた（${found.size} / ${total}）`);
        if (found.size >= total) UI.emit("キャラ図鑑 コンプリート");
        renderCast();
    };

    // 漂うキャラは文章やカードの後ろにいることが多いので、
    // リンクやボタン以外を押したときは、その場所にキャラが重なっていれば捕まえる
    const INTERACTIVE = "a, button, input, textarea, select, label, summary, [role='tab'], dialog";
    const characterAt = (x, y) =>
        $$(".drifter, .peeker-sprite").find((img) => {
            const box = img.getBoundingClientRect();
            return box.width > 0 && x >= box.left - 6 && x <= box.right + 6 && y >= box.top - 6 && y <= box.bottom + 6 && getComputedStyle(img).visibility !== "hidden";
        });
    document.addEventListener("click", (event) => {
        if (calm()) return;
        let img = event.target.closest?.(".peeker-sprite, .drifter");
        if (!img && !event.target.closest?.(INTERACTIVE)) img = characterAt(event.clientX, event.clientY);
        if (img) catchCharacter(img, event);
    });
    renderCast();

    /* ========================================
       3. 隠しコマンド
    ======================================== */

    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let progress = 0;
    let parading = false;

    const parade = () => {
        if (parading) return;
        parading = true;
        UI.emit("隠しコマンド");
        UI.sound("trophy");

        const layer = make("div", "play-parade");
        layer.setAttribute("aria-hidden", "true");
        const banner = make("p", "play-parade-banner");
        banner.append(make("small", "", "SECRET COMMAND"), document.createTextNode("SECRET UNLOCKED!"));
        layer.append(banner);
        const files = [...new Set($$('img[src*="images/character/"]').map((img) => img.getAttribute("src")))];
        files.forEach((src, index) => {
            const runner = make("img", "play-runner");
            runner.src = src;
            runner.alt = "";
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
        }, calm() ? 2200 : 4200);
        setTimeout(() => notify("HINT", "走っていたキャラは、サイトのどこかに隠れています。クリックで図鑑に登録！"), calm() ? 2400 : 4400);
    };

    document.addEventListener("play:konami", parade);
    document.addEventListener("keydown", (event) => {
        if (event.target.closest?.("input, textarea, select, [contenteditable]")) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
        if (progress === KONAMI.length) {
            progress = 0;
            parade();
        }
    });

    // スマホ：ロゴを2秒以内に5回タップ
    let taps = [];
    $(".hd-logo")?.addEventListener("click", (event) => {
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
       4. つづきから・全ステージ・エンディング
    ======================================== */

    const stages = $$("main > section[id]").filter((section) => section.id !== "ending" && section.id !== "top");
    const ending = $("#ending");
    const labelOf = (section) => section.dataset.section || section.id;
    const reached = new Set(session.get("pa-reached", []));

    let current = null;
    let saveTimer = 0;
    const save = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            if (!current || current === ending) return;
            local.set("pa-save", { id: current.id, label: labelOf(current), at: Date.now() });
        }, 600);
    };

    if ("IntersectionObserver" in window) {
        // 画面の真ん中あたりを通ったセクションを「見た」にする（長いセクションでも、短いセクションでも）
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                current = entry.target;
                save();
                reached.add(entry.target.id);
                session.set("pa-reached", [...reached]);
                if (stages.every((stage) => reached.has(stage.id))) unlock("allStages");
                if (entry.target.id === "about") watchStatus();
            });
        }, { rootMargin: "-45% 0px -45% 0px" });
        stages.forEach((stage) => observer.observe(stage));

        // 実績（PLAYER STATUS）を半分以上見た
        let statusWatched = false;
        function watchStatus() {
            if (statusWatched) return;
            statusWatched = true;
            const status = $("#achievements");
            if (!status) return;
            const statusObserver = new IntersectionObserver((entries) => {
                if (!entries[0].isIntersecting) return;
                statusObserver.disconnect();
                unlock("achievements");
            }, { threshold: 0.5 });
            statusObserver.observe(status);
        }

        // エンディングは、ページのいちばん下で画面の真ん中まで来ないことがあるので、半分見えたら
        if (ending) {
            const endObserver = new IntersectionObserver((entries) => {
                if (!entries[0].isIntersecting) return;
                unlock("ending");
                startRankClock();
            }, { threshold: 0.4 });
            endObserver.observe(ending);
        }
    }

    // つづきから（タブを開いて最初の1回・30日以内・トップにいるとき）
    const saved = local.get("pa-save", null);
    let firstView = true;
    try {
        firstView = !sessionStorage.getItem("pa-continue");
        sessionStorage.setItem("pa-continue", "1");
    } catch {
        firstView = true;
    }
    const target = saved && typeof saved.id === "string" ? document.getElementById(saved.id) : null;
    const recent = saved && Date.now() - Number(saved.at || 0) < 30 * 24 * 60 * 60 * 1000;
    if (firstView && target && recent && stages.includes(target) && !location.hash && scrollY < 200) {
        const card = make("div", "play-continue");
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-label", "前回の続きから見る");
        const text = make("p");
        text.append(make("small", "", "SAVE DATA FOUND"), document.createTextNode(`前回は「${labelOf(target)}」まで見ていました`));
        const go = make("button", "btn btn-red", "▶ つづきから");
        go.type = "button";
        const close = make("button", "btn btn-line", "はじめから");
        close.type = "button";
        const dismiss = () => {
            card.classList.remove("is-show");
            setTimeout(() => card.remove(), 400);
        };
        go.addEventListener("click", () => {
            dismiss();
            UI.emit("つづきから");
            target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        });
        close.addEventListener("click", dismiss);
        const actions = make("div", "play-continue-actions");
        actions.append(go, close);
        card.append(text, actions);
        // 起動演出が終わってから出す
        const show = () => {
            document.body.append(card);
            requestAnimationFrame(() => card.classList.add("is-show"));
            setTimeout(() => {
                if (card.isConnected && !card.matches(":hover, :focus-within")) dismiss();
            }, 12000);
        };
        setTimeout(show, root.classList.contains("is-booting") ? 2400 : 900);
    }

    /* ========================================
       5. リザルト（ランク・プレイタイム・結果をシェア）
    ======================================== */

    let playTime = Number(session.get("pa-playtime", 0)) || 0;
    setInterval(() => {
        if (document.visibilityState !== "visible") return;
        playTime += 1;
        if (playTime % 5 === 0) session.set("pa-playtime", playTime);
    }, 1000);

    const RANKS = [
        { rank: "S", min: 105, text: "パーフェクト！ 隅々まで見てくれてありがとうございます" },
        { rank: "A", min: 75, text: "じっくり見てくれてありがとうございます" },
        { rank: "B", min: 45, text: "まだ見ていないステージや作品があります" },
        { rank: "C", min: 0, text: "もう一度はじめから、ゆっくりどうぞ！" },
    ];
    const score = () => {
        const sections = stages.filter((stage) => reached.has(stage.id)).length;
        const cast = found.size;
        // 今のサイトと同じ配点（セクションの数がちがうので、セクションは割合で最大 72）
        const points =
            (stages.length ? (sections / stages.length) * 72 : 0) +
            Math.min(seenWorks.size, 5) * 4 +
            Math.min(photos, 3) * 2 +
            Math.min(cast, 14) +
            Math.min(playTime / 300, 1) * 20;
        return { points, sections, cast };
    };
    const time = () => `${String(Math.floor(playTime / 60)).padStart(2, "0")}:${String(playTime % 60).padStart(2, "0")}`;

    const rankBox = $("[data-ending-rank]");
    const renderRank = () => {
        if (!rankBox) return;
        const { points, sections, cast } = score();
        const result = RANKS.find((rank) => points >= rank.min);
        rankBox.dataset.rank = result.rank;
        const badge = make("span", "rank-badge");
        badge.append(make("small", "", "RANK"), document.createTextNode(result.rank));
        const body = make("span", "rank-body");
        const line = make("small", "", `読んだステージ ${sections} / ${stages.length} ／ 見た作品 ${seenWorks.size} ／ 発見キャラ ${cast}`);
        body.append(make("b", "", `PLAY TIME ${time()}`), line, make("span", "", result.text), make("small", "", `TROPHY ${count()} / ${TROPHIES.length}`));
        rankBox.replaceChildren(badge, body);
    };
    let rankTimer = 0;
    function startRankClock() {
        renderRank();
        if (rankTimer) return;
        rankTimer = setInterval(() => {
            const box = ending.getBoundingClientRect();
            if (box.bottom > 0 && box.top < innerHeight) renderRank();
        }, 1000);
    }

    // 結果をシェア（X の投稿画面を開くだけ。このサイトからは何も送らない）
    const SHARE_URL = "https://haru2401game.github.io/portfolio/";
    const SHARE_TAG = "遊べるポートフォリオ";
    const shareText = () => {
        const result = RANKS.find((rank) => score().points >= rank.min);
        const trophies = `${count()}/${TROPHIES.length}`;
        const lines = window.I18n?.lang === "en"
            ? ["I played through Haruta Nagaya's game-style portfolio 🎮", `RANK ${result.rank} (PLAY TIME ${time()})`, `🏆 Trophies ${trophies}`]
            : ["長屋晴太さんのポートフォリオを遊んでみた🎮", `RANK ${result.rank}（PLAY TIME ${time()}）`, `🏆 トロフィー ${trophies}`];
        return [...lines, `#${SHARE_TAG}`].join("\n");
    };
    $("[data-share]")?.addEventListener("click", () => {
        unlock("share"); // 先に解除して、シェアする文章のトロフィー数にも入れる
        window.open(`https://x.com/intent/post?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(SHARE_URL)}`, "_blank", "noopener");
        UI.emit("結果をシェア");
    });

    // アニメーションの設定を変えたら、図鑑の説明を合わせる
    document.addEventListener("settings:change", renderCast);
})();
