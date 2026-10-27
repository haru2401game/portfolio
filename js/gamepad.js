/* ========================================
   gamepad.js：ゲームパッド（コントローラー）でサイトを操作する

   ・十字キー / 左スティック：となりのボタンやリンクへカーソルを動かす（画面上の位置で探す）
   ・A：決定　B：戻る（ポップアップ・メニューを閉じる）　X：いいね
   ・LB / RB：前 / 次のセクションへ　LT / RT：1画面ずつスクロール　右スティック：スクロール
   ・START：設定（OPTIONS）を開く / 閉じる
   ・隠しコマンドもコントローラーで入力できる（↑↑↓↓←→←→BA）
   ※ 音は sfx.js、通知・トロフィーは play.js に任せる（ここは入力だけを扱う）
======================================== */

(() => {
    if (!("getGamepads" in navigator)) return;

    const root = document.documentElement;
    const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select, summary, [tabindex]:not([tabindex='-1']), [role='tab'], [role='radio']";
    const CLOSE_BUTTONS = ".settings-close, .work-viewer-close, .photo-viewer-close, .trophy-close, [aria-label='閉じる'], [aria-label='Close']";
    const STICK = 0.5;              // スティックをどれだけ倒したら「押した」とみなすか
    const REPEAT_FIRST = 380;       // 押しっぱなしで動き始めるまで（ミリ秒）
    const REPEAT_NEXT = 120;        // 押しっぱなしのときの間隔
    const KONAMI = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];

    // 標準配置（Xbox / PlayStation / Switch Pro など、ブラウザが「standard」と認識するもの）
    const BUTTONS = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, start: 9, up: 12, down: 13, left: 14, right: 15 };

    let frame = 0;
    let using = false;
    let greeted = false;
    let konami = 0;
    const pressed = {};             // いま押されているボタン
    const repeatAt = {};            // 押しっぱなしで次に動く時刻

    const sound = (name, ...args) => window.PlaySfx?.(name, ...args);
    const soundFor = (target) => window.PlaySfxFor?.(target);
    const behavior = () => (root.classList.contains("motion-off") ? "auto" : "smooth");

    /* ---------- 操作ガイド（画面左下・ゲームのボタン案内のように） ---------- */

    const guide = document.createElement("div");
    guide.className = "gamepad-guide";
    guide.setAttribute("aria-hidden", "true");
    const GUIDE = [["✚", "移動"], ["A", "決定"], ["B", "戻る"], ["X", "いいね"], ["LB RB", "セクション"], ["START", "設定"]];
    guide.innerHTML = '<span class="gamepad-guide-icon">🎮</span>' + GUIDE.map(([key]) => `<span class="gamepad-guide-item"><b>${key}</b><span></span></span>`).join("");
    guide.querySelectorAll(".gamepad-guide-item > span").forEach((label, index) => {
        label.textContent = GUIDE[index][1];
    });

    const startUsing = () => {
        if (using) return;
        using = true;
        root.classList.add("using-gamepad");
        if (!guide.isConnected) document.body.append(guide);
        if (!greeted) {
            greeted = true;
            document.dispatchEvent(new CustomEvent("play:notify", {
                detail: { label: "CONTROLLER", text: " コントローラーで操作できます（左下に操作ガイド）", tone: "" },
            }));
            // アクセス解析（遊び）とトロフィーに知らせる
            document.dispatchEvent(new CustomEvent("play:event", { detail: { name: "ゲームパッド" } }));
        }
    };

    // マウスやタッチに持ちかえたら、ガイドとカーソルの強調をしまう
    const stopUsing = () => {
        if (!using) return;
        using = false;
        root.classList.remove("using-gamepad");
    };
    let mouseFrom = null;
    window.addEventListener("pointermove", (event) => {
        if (!using) return;
        if (event.pointerType !== "mouse") return stopUsing();
        mouseFrom ??= { x: event.clientX, y: event.clientY };
        if (Math.hypot(event.clientX - mouseFrom.x, event.clientY - mouseFrom.y) > 24) {
            mouseFrom = null;
            stopUsing();
        }
    }, { passive: true });
    window.addEventListener("pointerdown", stopUsing, { passive: true });

    /* ---------- カーソル（フォーカス）を動かす先を、画面上の位置で探す ---------- */

    const isShown = (element) => {
        if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const style = getComputedStyle(element);
        return style.visibility !== "hidden" && style.display !== "none";
    };

    // ポップアップが開いていればその中だけ、スマホのメニューが開いていればメニューの中だけ
    const scope = () => {
        const dialogs = document.querySelectorAll("dialog[open]");
        if (dialogs.length) return dialogs[dialogs.length - 1];
        const menu = document.querySelector(".header-nav.active");
        return menu ? menu.closest("header") || menu : document.body;
    };

    // 画面に固定されたもの（ヘッダー・右下のボタンなど）は、本文の流れから外す
    // ヘッダーだけは、ページのいちばん上にいるときに選べる
    const fixedParent = (element) => {
        for (let node = element; node && node !== document.body; node = node.parentElement) {
            const position = getComputedStyle(node).position;
            if (position === "fixed" || position === "sticky") return node;
        }
        return null;
    };
    const candidates = () => {
        const inPage = scope() === document.body;
        return Array.from(scope().querySelectorAll(FOCUSABLE)).filter((element) => {
            if (!isShown(element)) return false;
            if (!inPage) return true;
            const fixed = fixedParent(element);
            return !fixed || (fixed.matches("header, .header") && window.scrollY < 40);
        });
    };

    const headerBottom = () => {
        const bar = document.querySelector(".stage-bar");
        const header = document.querySelector("header");
        return Math.max(header?.getBoundingClientRect().bottom || 0, bar?.getBoundingClientRect().bottom || 0, 0);
    };

    const onScreen = (rect) => rect.bottom > headerBottom() && rect.top < innerHeight;

    // 今のカーソル位置（画面の外にあるときは、画面のふちを起点にする）
    const origin = (direction) => {
        const current = document.activeElement;
        if (current && current !== document.body && scope().contains(current) && isShown(current)) {
            const rect = current.getBoundingClientRect();
            if (onScreen(rect) || scope() !== document.body) return { rect, element: current };
        }
        const top = headerBottom();
        const edge = direction === "up" ? innerHeight : top;
        return { rect: { top: edge, bottom: edge, left: 0, right: innerWidth, width: innerWidth, height: 0 }, element: null };
    };

    const gap = (a1, a2, b1, b2) => Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));

    const findNext = (direction) => {
        const { rect: from, element } = origin(direction);
        const fx = from.left + from.width / 2;
        const fy = from.top + from.height / 2;
        let best = null;
        let bestScore = Infinity;
        candidates().forEach((target) => {
            if (target === element || target.contains(element) || element?.contains(target)) return;
            const rect = target.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let main;
            let side;
            if (direction === "down" || direction === "up") {
                const ahead = direction === "down" ? cy > fy + 4 && rect.bottom > from.bottom : cy < fy - 4 && rect.top < from.top;
                if (!ahead) return;
                main = direction === "down" ? Math.max(0, rect.top - from.bottom) : Math.max(0, from.top - rect.bottom);
                // 縦の移動は「近さ」を優先（少し横にずれていても、すぐ下のものを選ぶ）
                side = gap(rect.left, rect.right, from.left, from.right) * 0.4;
            } else {
                const ahead = direction === "right" ? cx > fx + 4 && rect.right > from.right : cx < fx - 4 && rect.left < from.left;
                if (!ahead) return;
                main = direction === "right" ? Math.max(0, rect.left - from.right) : Math.max(0, from.left - rect.right);
                // 横の移動は「同じ行」を優先
                side = gap(rect.top, rect.bottom, from.top, from.bottom) * 2;
            }
            const score = main + side * 2 + Math.hypot(cx - fx, cy - fy) * 0.05;
            if (score < bestScore) {
                bestScore = score;
                best = { target, main };
            }
        });
        return best;
    };

    const focusOn = (target) => {
        target.focus({ preventScroll: true });
        const rect = target.getBoundingClientRect();
        if (!onScreen(rect) || rect.bottom > innerHeight) {
            target.scrollIntoView({ behavior: behavior(), block: "center", inline: "nearest" });
        } else {
            // 横にスクロールする一覧（ワールドマップ・スマホのカード）の中では、横だけ合わせる
            target.scrollIntoView({ behavior: behavior(), block: "nearest", inline: "nearest" });
        }
        target.classList.remove("is-gamepad-hop");
        void target.offsetWidth;
        target.classList.add("is-gamepad-hop");
        setTimeout(() => target.classList.remove("is-gamepad-hop"), 260);
    };

    // スライダー（音量）は、左右で値を変える
    const adjustRange = (input, direction) => {
        if (direction === "right") input.stepUp();
        else input.stepDown();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const move = (direction) => {
        const current = document.activeElement;
        if (current?.matches?.("input[type='range']") && (direction === "left" || direction === "right")) {
            adjustRange(current, direction);
            return;
        }
        const next = findNext(direction);
        // 次のボタンまで遠いとき（長い文章など）は、少しずつスクロールして読めるようにする
        const far = scope() === document.body && (direction === "up" || direction === "down") && (!next || next.main > innerHeight * 0.8);
        if (far) {
            window.scrollBy({ top: (direction === "down" ? 1 : -1) * innerHeight * 0.6, behavior: behavior() });
            return;
        }
        if (!next) return;
        focusOn(next.target);
        if (konami >= 3) sound("konamiStep", konami);
        else sound("cursor");
    };

    /* ---------- ボタンの役割 ---------- */

    const press = (target) => {
        if (!target) return;
        soundFor(target);
        target.click();
    };

    const back = () => {
        const dialogs = document.querySelectorAll("dialog[open]");
        const dialog = dialogs[dialogs.length - 1];
        if (dialog) {
            const close = dialog.querySelector(CLOSE_BUTTONS);
            if (close) press(close);
            else {
                sound("close");
                dialog.close();
            }
            return;
        }
        const hamburger = document.querySelector(".hamburger[aria-expanded='true']");
        if (hamburger) press(hamburger);
    };

    const sections = () => Array.from(document.querySelectorAll("main > section[id], footer")).filter(isShown);

    const jumpSection = (step) => {
        // 作品のポップアップでは、前 / 次の作品へ
        const viewer = document.querySelector("dialog.work-viewer[open]");
        if (viewer) {
            press(viewer.querySelector(`.work-viewer-nav [data-step="${step}"]`));
            return;
        }
        if (scope() !== document.body) return;
        const list = sections();
        const line = headerBottom() + 8;
        let index = list.findIndex((section) => section.getBoundingClientRect().bottom > line);
        if (index < 0) index = list.length - 1;
        // いまのセクションの途中にいて「前へ」を押したら、まずそのセクションの先頭へ
        const top = list[index]?.getBoundingClientRect().top ?? 0;
        let next = step > 0 ? index + 1 : (top < line - 40 ? index : index - 1);
        if (step > 0 && top > line + 40) next = index;
        if (next < 0) {
            window.scrollTo({ top: 0, behavior: behavior() });
            sound("jump");
            return;
        }
        const section = list[Math.min(next, list.length - 1)];
        if (!section) return;
        section.scrollIntoView({ behavior: behavior(), block: "start" });
        const first = Array.from(section.querySelectorAll(FOCUSABLE)).find(isShown);
        if (first) first.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
        sound("jump");
    };

    const like = () => {
        const button = document.querySelector(".like-button:not([hidden])");
        if (button && isShown(button)) press(button);
    };

    const options = () => {
        const panel = document.querySelector("dialog.settings-panel[open]");
        if (panel) back();
        else press(document.querySelector(".settings-button"));
    };

    // 隠しコマンドは、十字キーと B・A の順番だけを見る
    const trackKonami = (name) => {
        if (!KONAMI.includes(name)) return false;
        konami = name === KONAMI[konami] ? konami + 1 : name === KONAMI[0] ? 1 : 0;
        if (konami === KONAMI.length) {
            konami = 0;
            document.dispatchEvent(new CustomEvent("play:konami"));
            return true;
        }
        return false;
    };

    const onPress = (name) => {
        startUsing();
        const completed = trackKonami(name);
        if (completed) return;      // 最後の A では、決定の操作はしない
        if (name === "up" || name === "down" || name === "left" || name === "right") move(name);
        else if (name === "a") {
            const current = document.activeElement;
            if (current && current !== document.body && isShown(current)) press(current);
            else move("down");
        } else if (name === "b") back();
        else if (name === "x") like();
        else if (name === "lb") jumpSection(-1);
        else if (name === "rb") jumpSection(1);
        else if (name === "lt" || name === "rt") {
            window.scrollBy({ top: (name === "rt" ? 1 : -1) * innerHeight * 0.8, behavior: behavior() });
            sound("slide");
        } else if (name === "start") options();
    };

    /* ---------- 毎フレーム、コントローラーの状態を読む ---------- */

    const REPEATABLE = new Set(["up", "down", "left", "right"]);

    const read = (pad) => {
        const down = {};
        Object.entries(BUTTONS).forEach(([name, index]) => {
            down[name] = Boolean(pad.buttons[index]?.pressed);
        });
        const [lx = 0, ly = 0, , ry = 0] = pad.axes;
        if (ly < -STICK) down.up = true;
        if (ly > STICK) down.down = true;
        if (lx < -STICK) down.left = true;
        if (lx > STICK) down.right = true;
        return { down, ry };
    };

    const tick = (now) => {
        frame = 0;
        const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
        if (!pads.length) return;
        if (!document.hidden) {
            const state = {};
            let scroll = 0;
            pads.forEach((pad) => {
                const { down, ry } = read(pad);
                Object.entries(down).forEach(([name, value]) => {
                    if (value) state[name] = true;
                });
                if (Math.abs(ry) > 0.2) scroll = ry;
            });
            Object.keys(BUTTONS).forEach((name) => {
                const isDown = Boolean(state[name]);
                if (isDown && !pressed[name]) {
                    pressed[name] = true;
                    repeatAt[name] = now + REPEAT_FIRST;
                    onPress(name);
                } else if (isDown && REPEATABLE.has(name) && now >= repeatAt[name]) {
                    repeatAt[name] = now + REPEAT_NEXT;
                    konami = 0;
                    move(name);
                } else if (!isDown) {
                    pressed[name] = false;
                }
            });
            // 右スティックで、なめらかにスクロール
            if (scroll && scope() === document.body) {
                startUsing();
                window.scrollBy(0, Math.sign(scroll) * (Math.abs(scroll) - 0.2) * 28);
            }
        }
        frame = requestAnimationFrame(tick);
    };

    const start = () => {
        if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("gamepadconnected", start);
    // すでにつながっていた場合（ページを開く前からボタンを押していたなど）
    if (Array.from(navigator.getGamepads?.() || []).some(Boolean)) start();
})();
