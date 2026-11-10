/* ========================================
   minigame.js：トップの「ししとう」の画面で遊べるミニゲーム「IDEA CATCH」（クラシックだけ）

   ・画面の「遊んでみる」を押すと、その場で30秒のミニゲームが始まる
   ・💡アイデア（+10）と ⭐ひらめき（+30）を集めて、🐛バグはよける（3回当たるとゲームオーバー）
   ・続けて取るとコンボ（5コンボごとに得点が上がる）
   ・操作：← → キー（A / D）／ マウス・指を左右に動かす
   ・ハイスコアは見ている人のブラウザ（localStorage の pa-minigame-best）にだけ保存
   ・最後まで遊ぶ／300点以上で、トロフィー（play.js）が解除される
   ・効果音は sfx.js（設定で ON のときだけ鳴る）
======================================== */

(() => {
    const screen = document.querySelector(".hero-screen");
    if (!screen) return;

    const BEST_KEY = "pa-minigame-best";
    const LENGTH = 30; // 秒
    const LIVES = 3;
    const GOOD_SCORE = 300;
    const sound = (name) => window.PlaySfx?.(name);
    const trophy = (id) => window.PlayTrophy?.unlock(id);
    const emit = (name) => document.dispatchEvent(new CustomEvent("play:event", { detail: { name } }));
    const calm = () => document.documentElement.classList.contains("motion-off");
    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const best = () => {
        try {
            return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0);
        } catch {
            return 0;
        }
    };
    const saveBest = (value) => {
        try {
            localStorage.setItem(BEST_KEY, String(value));
        } catch {
            /* 保存できなくても遊べる */
        }
    };

    /* ---------- 「遊んでみる」ボタン ---------- */

    const opener = el("button", "mg-open");
    opener.type = "button";
    opener.setAttribute("aria-haspopup", "true");
    opener.innerHTML = '<span class="mg-open-icon" aria-hidden="true">▶</span><span class="mg-open-text"><b>遊んでみる</b><small>30秒ミニゲーム</small></span>';
    screen.append(opener);

    /* ---------- ゲームの画面（開いたときに作る） ---------- */

    let layer = null;
    let canvas = null;
    let ctx = null;
    let ui = {};
    let player = null;
    const playerImg = new Image();
    playerImg.src = "images/character/Player.png";

    const build = () => {
        layer = el("div", "mg");
        layer.setAttribute("role", "region");
        layer.setAttribute("aria-label", "ミニゲーム「IDEA CATCH」");
        canvas = el("canvas", "mg-canvas");
        canvas.setAttribute("aria-hidden", "true");
        ctx = canvas.getContext("2d");

        const hud = el("div", "mg-hud");
        const scoreBox = el("span", "mg-score");
        scoreBox.append(el("small", "", "SCORE"), (ui.score = el("b", "", "0")));
        const timeBox = el("span", "mg-time");
        timeBox.append(el("small", "", "TIME"), (ui.time = el("b", "", String(LENGTH))));
        ui.life = el("span", "mg-life");
        ui.combo = el("span", "mg-combo");
        hud.append(scoreBox, timeBox, ui.combo, ui.life);

        // 説明（最初）と結果（最後）を出す板
        ui.panel = el("div", "mg-panel");
        ui.count = el("p", "mg-count");
        ui.count.setAttribute("aria-hidden", "true");
        ui.live = el("p", "mg-live");
        ui.live.setAttribute("aria-live", "polite");

        const close = el("button", "mg-close", "×");
        close.type = "button";
        close.setAttribute("aria-label", "ミニゲームを閉じる");
        close.addEventListener("click", closeGame);

        layer.append(canvas, hud, ui.count, ui.panel, close, ui.live);
        screen.append(layer);

        // 操作：マウス・指は、動かした位置へキャラが向かう
        const pointTo = (event) => {
            if (!state.running) return;
            const rect = canvas.getBoundingClientRect();
            state.target = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        };
        canvas.addEventListener("pointermove", pointTo);
        canvas.addEventListener("pointerdown", pointTo);
        layer.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                closeGame();
            }
        });
        new ResizeObserver(resize).observe(canvas);
        resize();
    };

    /* ---------- 大きさ（画面の大きさに合わせて、くっきり描く） ---------- */

    let W = 0;
    let H = 0;
    let unit = 1;
    function resize() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        W = rect.width;
        H = rect.height;
        unit = Math.max(0.6, W / 640);
        canvas.width = Math.round(W * ratio);
        canvas.height = Math.round(H * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (!state.running) draw();
    }

    /* ---------- ゲームの状態 ---------- */

    const ITEMS = {
        idea: { icon: "💡", score: 10 },
        star: { icon: "⭐", score: 30 },
        bug: { icon: "🐛", score: 0 },
    };
    const state = { running: false, score: 0, lives: LIVES, combo: 0, left: LENGTH, items: [], pops: [], target: 0.5, x: 0.5, spawnIn: 0, shake: 0, last: 0, keys: new Set(), raf: 0 };

    const updateHud = () => {
        ui.score.textContent = String(state.score);
        ui.time.textContent = String(Math.ceil(state.left));
        ui.life.textContent = "♥".repeat(state.lives) + "♡".repeat(LIVES - state.lives);
        ui.life.setAttribute("aria-label", `ライフ ${state.lives}`);
        ui.combo.textContent = state.combo >= 3 ? `${state.combo} COMBO` : "";
    };

    const spawn = () => {
        const progress = 1 - state.left / LENGTH; // 0 → 1（後半ほど速く・バグが多く）
        const roll = Math.random();
        const bugRate = 0.18 + progress * 0.14;
        const type = roll < bugRate ? "bug" : roll < bugRate + 0.1 ? "star" : "idea";
        state.items.push({
            type,
            x: 0.06 + Math.random() * 0.88,
            y: -0.08,
            speed: (0.32 + progress * 0.3 + Math.random() * 0.12) * (type === "star" ? 1.25 : 1),
            spin: Math.random() * Math.PI,
        });
        state.spawnIn = Math.max(0.32, 0.75 - progress * 0.4) * (0.7 + Math.random() * 0.6);
    };

    const pop = (x, y, text, color) => state.pops.push({ x, y, text, color, life: 0.8 });

    const step = (now) => {
        if (!state.running) return;
        const dt = Math.min(0.05, (now - state.last) / 1000 || 0);
        state.last = now;
        state.left = Math.max(0, state.left - dt);

        // キー操作
        const dir = (state.keys.has("right") ? 1 : 0) - (state.keys.has("left") ? 1 : 0);
        if (dir) state.target = Math.min(1, Math.max(0, state.x + dir * 0.12));
        state.x += (state.target - state.x) * Math.min(1, dt * 14);

        state.spawnIn -= dt;
        if (state.spawnIn <= 0) spawn();

        const px = state.x * W;
        const py = H - 46 * unit;
        const reach = 40 * unit;
        state.items.forEach((item) => {
            item.y += item.speed * dt;
            item.spin += dt * 2;
            const ix = item.x * W;
            const iy = item.y * H;
            if (!item.done && Math.abs(ix - px) < reach && Math.abs(iy - py) < 34 * unit) {
                item.done = true;
                if (item.type === "bug") {
                    state.lives -= 1;
                    state.combo = 0;
                    state.shake = calm() ? 0 : 0.35;
                    pop(ix, iy, "BUG!", "#ff5a5f");
                    sound("error");
                } else {
                    state.combo += 1;
                    const bonus = 1 + Math.floor(state.combo / 5) * 0.5; // 5コンボごとに 1.5倍、2倍…
                    const gain = Math.round(ITEMS[item.type].score * bonus);
                    state.score += gain;
                    pop(ix, iy, `+${gain}`, item.type === "star" ? "#ffb300" : "#006ea8");
                    sound(item.type === "star" ? "powerup" : "coin");
                }
            }
            if (!item.done && item.y > 1.05) {
                item.done = true;
                if (item.type !== "bug") state.combo = 0; // 取りこぼすとコンボが切れる
            }
        });
        state.items = state.items.filter((item) => !item.done);
        state.pops.forEach((p) => (p.life -= dt));
        state.pops = state.pops.filter((p) => p.life > 0);
        state.shake = Math.max(0, state.shake - dt);

        updateHud();
        draw();
        if (state.left <= 0 || state.lives <= 0) finish();
        else state.raf = requestAnimationFrame(step);
    };

    /* ---------- 描く ---------- */

    function draw() {
        if (!ctx || !W) return;
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        if (state.shake) ctx.translate((Math.random() - 0.5) * 10 * state.shake, (Math.random() - 0.5) * 10 * state.shake);

        // 背景：空と地面
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#bfe8ff");
        sky.addColorStop(1, "#effaff");
        ctx.fillStyle = sky;
        ctx.fillRect(-10, -10, W + 20, H + 20);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 4; i++) {
            const cx = ((i * 0.31 + 0.1) % 1) * W;
            const cy = (0.16 + (i % 2) * 0.14) * H;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 46 * unit, 14 * unit, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#7ccf5b";
        ctx.fillRect(0, H - 18 * unit, W, 18 * unit);
        ctx.fillStyle = "#5fb043";
        ctx.fillRect(0, H - 18 * unit, W, 4 * unit);

        // 落ちてくるもの
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.round(34 * unit)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        state.items.forEach((item) => {
            ctx.save();
            ctx.translate(item.x * W, item.y * H);
            if (item.type === "star") ctx.rotate(Math.sin(item.spin) * 0.4);
            if (item.type === "bug") ctx.rotate(Math.sin(item.spin * 2) * 0.2);
            ctx.fillText(ITEMS[item.type].icon, 0, 0);
            ctx.restore();
        });

        // プレイヤー（ゲームキャラ）
        const size = 64 * unit;
        const px = state.x * W;
        const bob = state.running && !calm() ? Math.sin(performance.now() / 120) * 2 * unit : 0;
        if (playerImg.complete && playerImg.naturalWidth) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(playerImg, px - size / 2, H - 18 * unit - size + bob, size, size);
        } else {
            ctx.fillStyle = "#006ea8";
            ctx.fillRect(px - size / 3, H - 18 * unit - size * 0.8, size / 1.5, size * 0.8);
        }

        // 得点の文字
        ctx.font = `900 ${Math.round(20 * unit)}px Inter, "Noto Sans JP", sans-serif`;
        state.pops.forEach((p) => {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y - (0.8 - p.life) * 50 * unit);
        });
        ctx.restore();
    }

    /* ---------- 始める・終わる ---------- */

    const heroVideo = screen.querySelector("video");
    let videoWasPlaying = false;

    const showPanel = (kind) => {
        ui.panel.replaceChildren();
        ui.panel.hidden = false;
        if (kind === "title") {
            ui.panel.append(
                el("p", "mg-title", "IDEA CATCH"),
                el("p", "mg-rule", "💡アイデアと⭐ひらめきを集めて、🐛バグはよけよう！"),
                el("p", "mg-keys", "← → キー ／ マウス・指を左右に動かして移動"),
            );
            const go = el("button", "mg-btn is-main", "START");
            go.type = "button";
            go.addEventListener("click", countdown);
            ui.panel.append(go);
            go.focus({ preventScroll: true });
            return;
        }
        const high = best();
        const isNew = state.score > 0 && state.score >= high && state.newBest;
        const rank = state.score >= 500 ? "S" : state.score >= GOOD_SCORE ? "A" : state.score >= 150 ? "B" : "C";
        const comment = { S: "神プレイ！ 一緒にゲームを作りましょう！", A: "ナイス！ アイデアをたくさん形にできました", B: "いい調子！ もう一度でハイスコアを狙おう", C: "まずは1回クリア！ 次はもっと集めよう" }[rank];
        const result = el("p", "mg-result");
        result.append(el("span", "mg-rank", rank), el("b", "", String(state.score)), el("small", "", "点"));
        ui.panel.append(
            el("p", "mg-title", state.lives <= 0 ? "GAME OVER" : "FINISH!"),
            result,
            el("p", isNew ? "mg-best is-new" : "mg-best", isNew ? "ハイスコア更新！" : `ハイスコア ${high}`),
            el("p", "mg-comment", comment),
        );
        const actions = el("div", "mg-actions");
        const again = el("button", "mg-btn is-main", "もう一度");
        again.type = "button";
        again.addEventListener("click", countdown);
        const quit = el("button", "mg-btn", "やめる");
        quit.type = "button";
        quit.addEventListener("click", closeGame);
        actions.append(again, quit);
        ui.panel.append(actions);
        again.focus({ preventScroll: true });
        ui.live.textContent = `${state.score}点。ハイスコア ${high}点。`;
    };

    function countdown() {
        ui.panel.hidden = true;
        Object.assign(state, { running: false, score: 0, lives: LIVES, combo: 0, left: LENGTH, items: [], pops: [], target: 0.5, x: 0.5, spawnIn: 0.4, shake: 0, newBest: false });
        updateHud();
        draw();
        layer.focus({ preventScroll: true });
        let n = 3;
        const tick = () => {
            if (!layer?.isConnected) return;
            ui.count.textContent = n > 0 ? String(n) : "GO!";
            ui.count.classList.remove("is-tick");
            void ui.count.offsetWidth;
            ui.count.classList.add("is-tick");
            sound(n > 0 ? "cursor" : "start");
            if (n > 0) {
                n -= 1;
                state.countTimer = setTimeout(tick, calm() ? 400 : 650);
            } else {
                state.countTimer = setTimeout(() => (ui.count.textContent = ""), 500);
                state.running = true;
                state.last = performance.now();
                state.raf = requestAnimationFrame(step);
                emit("ミニゲーム: スタート");
            }
        };
        tick();
    }

    function finish() {
        state.running = false;
        cancelAnimationFrame(state.raf);
        const high = best();
        if (state.score > high) {
            saveBest(state.score);
            state.newBest = true;
        }
        sound(state.lives <= 0 ? "close" : "stage");
        if (state.lives > 0) trophy("minigame");
        if (state.score >= GOOD_SCORE) trophy("minigame300");
        emit(`ミニゲーム: ${state.lives <= 0 ? "ゲームオーバー" : "クリア"}`);
        draw();
        showPanel("result");
    }

    function openGame() {
        if (!layer) build();
        layer.hidden = false;
        layer.tabIndex = -1;
        screen.classList.add("is-playing-game");
        videoWasPlaying = heroVideo && !heroVideo.paused;
        heroVideo?.pause();
        resize();
        updateHud();
        draw();
        showPanel("title");
        emit("ミニゲーム: 開く");
        sound("open");
    }

    function closeGame() {
        if (!layer) return;
        state.running = false;
        cancelAnimationFrame(state.raf);
        clearTimeout(state.countTimer);
        layer.hidden = true;
        screen.classList.remove("is-playing-game");
        if (videoWasPlaying) heroVideo?.play().catch(() => {});
        opener.focus({ preventScroll: true });
        sound("close");
    }

    opener.addEventListener("click", openGame);

    // キー操作（ゲーム中だけ。ページがスクロールしないように止める）
    const KEY = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    window.addEventListener("keydown", (event) => {
        if (!state.running || !KEY[event.key]) return;
        event.preventDefault();
        state.keys.add(KEY[event.key]);
    });
    window.addEventListener("keyup", (event) => {
        if (KEY[event.key]) state.keys.delete(KEY[event.key]);
    });
    // 別のタブに移ったら一時停止して、戻ったら続きから
    document.addEventListener("visibilitychange", () => {
        if (!layer || layer.hidden) return;
        if (document.hidden && state.running) {
            state.running = false;
            state.paused = true;
            cancelAnimationFrame(state.raf);
        } else if (!document.hidden && state.paused) {
            state.paused = false;
            state.running = true;
            state.last = performance.now();
            state.raf = requestAnimationFrame(step);
        }
    });
})();
