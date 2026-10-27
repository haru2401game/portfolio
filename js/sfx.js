/* ========================================
   sfx.js：効果音（設定画面の「効果音」が ON のときだけ鳴る）

   ・音声ファイルは使わず、Web Audio でその場で作る（ゲームのメニュー風の短い電子音）
   ・操作の種類ごとに音を変える（選ぶ・決定・切り替え・開く・閉じる・写真・動画・コピーなど）
   ・PC ではボタンやカードにカーソルを乗せたときにも小さく鳴る（ゲームのメニューのカーソル音）
   ・音量は設定画面の「音量」（動画と共通）。ミュート中・0 のときは鳴らさない
   ・最初の操作（クリック・キー）があるまでは音を出さない（ブラウザの決まり）
   ※ main.js の settings を使う。main.js の後に読み込む
======================================== */

(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || typeof settings === "undefined") return;

    const enabled = () => settings.sfx === "on" && !settings.muted && settings.volume > 0;

    /* ---------- 音を作る仕組み ---------- */

    let audio = null;
    let output = null;
    let noise = null;

    const getAudio = () => {
        if (!audio) {
            audio = new AudioContextClass();
            // 音が重なっても割れないように、最後にコンプレッサーを通す
            const compressor = audio.createDynamicsCompressor();
            compressor.threshold.value = -14;
            compressor.ratio.value = 6;
            output = audio.createGain();
            output.connect(compressor);
            compressor.connect(audio.destination);
            // 写真のシャッター音・ポップアップの「シュッ」用のノイズ
            noise = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
            const data = noise.getChannelData(0);
            for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
        }
        if (audio.state === "suspended") audio.resume().catch(() => {});
        output.gain.value = (settings.volume / 100) * 0.9;
        return audio;
    };

    /* 1つの音：
       tone({ f: 周波数, to: 最後の周波数, at: 開始(秒), len: 長さ(秒), type: 波形, vol: 大きさ, cut: こもらせる周波数 }) */
    const tone = ({ f, to, at = 0, len = 0.08, type = "square", vol = 0.3, cut = 5000 }) => {
        const ctx = getAudio();
        const start = ctx.currentTime + 0.005 + at;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = type;
        osc.frequency.setValueAtTime(f, start);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, start + len);
        filter.type = "lowpass";
        filter.frequency.value = cut;
        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(vol, start + 0.006);
        env.gain.exponentialRampToValueAtTime(vol * 0.6, start + len * 0.5);
        env.gain.exponentialRampToValueAtTime(0.0001, start + len);
        osc.connect(filter);
        filter.connect(env);
        env.connect(output);
        osc.start(start);
        osc.stop(start + len + 0.03);
    };

    // ノイズ（シャッター・シュッという音）
    const hiss = ({ at = 0, len = 0.1, vol = 0.3, from = 1200, to = 4000, q = 1 }) => {
        const ctx = getAudio();
        const start = ctx.currentTime + 0.005 + at;
        const source = ctx.createBufferSource();
        source.buffer = noise;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = q;
        filter.frequency.setValueAtTime(from, start);
        filter.frequency.exponentialRampToValueAtTime(to, start + len);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(vol, start + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, start + len);
        source.connect(filter);
        filter.connect(env);
        env.connect(output);
        source.start(start);
        source.stop(start + len + 0.03);
    };

    // ド〜ドの音の高さ（メロディ用）
    const NOTE = { C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568, C7: 2093 };

    let likeCombo = 0;
    let likeTimer = 0;

    const SOUNDS = {
        // カーソルを合わせた（PC だけ・ごく小さく）
        cursor: () => tone({ f: 1760, len: 0.035, type: "triangle", vol: 0.12 }),
        // ふつうのボタン・リンクを押した（決定）
        select: () => {
            tone({ f: NOTE.A5, len: 0.05, vol: 0.22, cut: 3200 });
            tone({ f: NOTE.E6, at: 0.05, len: 0.07, vol: 0.2, cut: 3200 });
        },
        // カード（作品・遊べる作品・SNS・記事）を選んだ
        card: () => {
            tone({ f: NOTE.E5, len: 0.05, vol: 0.22, cut: 3500 });
            tone({ f: NOTE.B5, at: 0.05, len: 0.05, vol: 0.22, cut: 3500 });
            tone({ f: NOTE.E6, at: 0.1, len: 0.1, vol: 0.2, cut: 3500 });
        },
        // ページ内の移動（ナビ・トップへ・「注目作品を見る」など）
        jump: () => tone({ f: 440, to: 1320, len: 0.14, type: "triangle", vol: 0.32 }),
        // タブ・絞り込み・設定の選択肢を切り替えた
        tab: () => {
            tone({ f: NOTE.D6, len: 0.04, vol: 0.2, cut: 3000 });
            tone({ f: NOTE.G6, at: 0.04, len: 0.05, vol: 0.16, cut: 3000 });
        },
        // 横スワイプのカードが1枚動いた
        slide: () => tone({ f: 1100, to: 1500, len: 0.05, type: "triangle", vol: 0.16 }),
        // 一覧・折りたたみ・メニューを開いた／閉じた
        expand: () => {
            tone({ f: 392, to: 784, len: 0.12, type: "triangle", vol: 0.3 });
            tone({ f: NOTE.G5, at: 0.1, len: 0.06, vol: 0.14, cut: 3000 });
        },
        collapse: () => tone({ f: 784, to: 330, len: 0.12, type: "triangle", vol: 0.3 }),
        // ポップアップ（作品の詳細・設定・トロフィー）を開いた／閉じた
        open: () => {
            hiss({ len: 0.12, vol: 0.12, from: 800, to: 5000 });
            tone({ f: NOTE.C6, at: 0.03, len: 0.06, vol: 0.18, cut: 3500 });
            tone({ f: NOTE.G6, at: 0.08, len: 0.1, vol: 0.18, cut: 3500 });
        },
        close: () => {
            hiss({ len: 0.1, vol: 0.1, from: 5000, to: 800 });
            tone({ f: NOTE.G5, at: 0.02, len: 0.06, vol: 0.18, cut: 3000 });
            tone({ f: NOTE.C5, at: 0.07, len: 0.09, vol: 0.18, cut: 3000 });
        },
        // 写真を拡大した（シャッター音）
        shutter: () => {
            hiss({ len: 0.035, vol: 0.4, from: 3000, to: 6000, q: 0.7 });
            hiss({ at: 0.06, len: 0.05, vol: 0.3, from: 2500, to: 1500, q: 0.7 });
        },
        // 動画を再生した（スタート）
        start: () => {
            [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone({ f, at: i * 0.06, len: 0.07, vol: 0.2, cut: 3500 }));
        },
        // 外のサイトへ（ワープ）
        warp: () => {
            tone({ f: 300, to: 2400, len: 0.22, type: "square", vol: 0.16, cut: 2500 });
            hiss({ at: 0.05, len: 0.18, vol: 0.08, from: 1000, to: 6000 });
        },
        // メール・連絡
        mail: () => {
            tone({ f: NOTE.G5, len: 0.07, type: "triangle", vol: 0.3 });
            tone({ f: NOTE.C6, at: 0.08, len: 0.07, type: "triangle", vol: 0.3 });
            tone({ f: NOTE.E6, at: 0.16, len: 0.14, type: "triangle", vol: 0.3 });
        },
        // アドレスをコピーした（キラッ）
        copy: () => {
            tone({ f: NOTE.E6, len: 0.08, type: "sine", vol: 0.35 });
            tone({ f: NOTE.C7, at: 0.07, len: 0.2, type: "sine", vol: 0.3 });
        },
        // スイッチの ON / OFF（ミュートなど）
        on: () => tone({ f: 660, to: 990, len: 0.08, type: "triangle", vol: 0.3 }),
        off: () => tone({ f: 990, to: 495, len: 0.08, type: "triangle", vol: 0.3 }),
        // キャラクターを見つけた（コイン）
        coin: () => {
            tone({ f: NOTE.B5, len: 0.07, vol: 0.26, cut: 4500 });
            tone({ f: NOTE.E6, at: 0.07, len: 0.3, vol: 0.24, cut: 4500 });
        },
        // トロフィー解除（ファンファーレ）
        trophy: () => {
            [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone({ f, at: i * 0.09, len: 0.09, vol: 0.24, cut: 3500 }));
            tone({ f: NOTE.C6, at: 0.27, len: 0.36, vol: 0.26, cut: 3500 });
            tone({ f: NOTE.E5, at: 0.27, len: 0.36, type: "triangle", vol: 0.2 });
        },
        // 隠しコマンドの入力（1つ正解するごとに音が上がる）
        konamiStep: (step) => tone({ f: 523 * 2 ** (step / 12 * 2), len: 0.06, vol: 0.2, cut: 3500 }),
        // 隠しコマンド成功（パワーアップ）
        powerup: () => {
            tone({ f: 392, to: 1568, len: 0.45, vol: 0.22, cut: 3000 });
            tone({ f: 523, to: 2093, at: 0.05, len: 0.45, type: "triangle", vol: 0.16 });
        },
        // いいね（連打するほど音が高くなる）
        like: () => {
            clearTimeout(likeTimer);
            likeTimer = setTimeout(() => (likeCombo = 0), 700);
            const up = Math.min(likeCombo, 12);
            likeCombo += 1;
            tone({ f: 660 * 2 ** (up / 12), to: 330 * 2 ** (up / 12), len: 0.1, type: "sine", vol: 0.45 });
        },
        // 新しいステージ（セクション）に進んだ
        stage: () => {
            tone({ f: NOTE.G5, len: 0.06, type: "triangle", vol: 0.16 });
            tone({ f: NOTE.D6, at: 0.06, len: 0.1, type: "triangle", vol: 0.14 });
        },
        // 失敗（コピーできなかったなど）
        error: () => tone({ f: 220, to: 140, len: 0.18, vol: 0.2, cut: 1500 }),
    };

    let last = { name: "", at: 0 };
    const sfx = (name, ...args) => {
        if (!enabled() || !SOUNDS[name]) return;
        // 同じ音が一瞬で重なったときは1回にする（いいね・カーソルは除く）
        const now = performance.now();
        if (name === last.name && now - last.at < 40 && name !== "like" && name !== "cursor") return;
        last = { name, at: now };
        try {
            SOUNDS[name](...args);
        } catch {
            /* 音が出せない環境でも、ページの動きは止めない */
        }
    };
    window.PlaySfx = sfx;

    /* ---------- どの操作で、どの音を鳴らすか ---------- */

    const CLOSERS = ".settings-close, .settings-done, .work-viewer-close, .photo-viewer-close, .trophy-close, .settings-hint-close, [aria-label='閉じる'], [aria-label='Close'], [aria-label='お知らせを閉じる'], [aria-label='Close notice']";
    const TABS = "[role='tab'], [role='radio'], .stage-filter button, .can-do-tabs button, .swipe-dot, .world-node, .work-viewer-nav button";
    const DIALOGS = ".settings-button, .work-card, .works-pickup-card, .footer-trophy, .ending-trophy, .trophy-open";
    const PHOTOS = ".tech-photo, .timeline-photo";
    const CARDS = ".play-card, .sns-card, .article-card a, .summary-works a, .main-tab";
    const MAIL = "a[href^='mailto:'], [data-mail], .quick-contact, .nav-mail";
    const HOVERABLE = "a[href], button, [role='tab'], .work-card, .works-pickup-card, .play-card, .sns-card, .article-card";

    const soundFor = (target) => {
        if (target.closest(".like-button")) return ["like"];
        if (target.closest(".mail-copy")) return ["copy"];
        if (target.closest(MAIL)) return ["mail"];
        if (target.closest(CLOSERS)) return ["close"];
        const mute = target.closest(".settings-mute");
        if (mute) return [mute.getAttribute("aria-pressed") === "true" ? "on" : "off"];
        if (target.closest(TABS)) return ["tab"];
        if (target.closest(".movie-play")) return ["start"];
        if (target.closest(PHOTOS)) return ["shutter"];
        if (target.closest(DIALOGS) && !target.closest("a[href]")) return ["open"];
        // 開く・閉じるボタン（一覧・折りたたみ・メニュー）：押す前の状態で音を変える
        const toggle = target.closest("[aria-expanded]");
        if (toggle) return [toggle.getAttribute("aria-expanded") === "true" ? "collapse" : "expand"];
        if (target.closest(".works-close")) return ["collapse"];
        if (target.closest(CARDS)) {
            const link = target.closest("a[href]");
            return [link && link.target === "_blank" ? "warp" : "card"];
        }
        const link = target.closest("a[href]");
        if (link) {
            if (link.target === "_blank" || link.hostname !== location.hostname) return ["warp"];
            if (link.getAttribute("href").startsWith("#")) return ["jump"];
            return ["select"];
        }
        if (target.closest("button, summary, input[type='checkbox']")) return ["select"];
        return null;
    };

    document.addEventListener("click", (event) => {
        // プログラムから押したクリック（ピックアップ → 作品カードなど）では、二重に鳴らさない
        if (!event.isTrusted || !enabled() || !(event.target instanceof Element)) return;
        const sound = soundFor(event.target);
        if (sound) sfx(...sound);
    }, true);

    // ゲームパッド（gamepad.js）で押したときも、クリックと同じ音を鳴らす
    window.PlaySfxFor = (target) => {
        if (!(target instanceof Element)) return;
        const sound = soundFor(target);
        if (sound) sfx(...sound);
    };

    // カーソルを乗せたとき（マウスのある PC だけ）
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    let hovered = null;
    let hoverAt = 0;
    if (finePointer) {
        document.addEventListener("pointerover", (event) => {
            if (!enabled() || event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
            const item = event.target.closest(HOVERABLE);
            if (!item || item === hovered) return;
            hovered = item;
            const now = performance.now();
            if (now - hoverAt < 70) return;
            hoverAt = now;
            sfx("cursor");
        });
        document.addEventListener("pointerout", (event) => {
            if (hovered && !hovered.contains(event.relatedTarget)) hovered = null;
        });
    }

    // キーボード：Esc でポップアップを閉じた・隠しコマンドの入力
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let konami = 0;
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.querySelector("dialog[open]")) sfx("close");
        if (event.target instanceof Element && event.target.closest("input, textarea")) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        konami = key === KONAMI[konami] ? konami + 1 : key === KONAMI[0] ? 1 : 0;
        if (konami > 0 && konami < KONAMI.length) sfx("konamiStep", konami);
        if (konami === KONAMI.length) konami = 0;
    }, true);

    // 音量スライダーを動かしたとき、その大きさで確認の音を鳴らす
    let volumeTimer = 0;
    document.addEventListener("input", (event) => {
        if (!(event.target instanceof Element) || !event.target.closest(".settings-volume input")) return;
        clearTimeout(volumeTimer);
        volumeTimer = setTimeout(() => sfx("tab"), 90);
    });

    // 横スワイプのカードが1枚動いたとき（いま何枚目かのドットが変わったら）
    new MutationObserver((mutations) => {
        if (!enabled()) return;
        if (mutations.some((m) => m.target.classList?.contains("swipe-dot") && m.target.classList.contains("is-current") && m.oldValue && !m.oldValue.includes("is-current"))) {
            sfx("slide");
        }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

    // 新しいステージ（セクション）に初めて進んだとき（ヘッダーの下の STAGE 表示が変わったら）
    const reachedStages = new Set();
    const watchStage = () => {
        const chip = document.querySelector(".stage-bar-chip");
        if (!chip) return;
        const check = (quiet) => {
            const code = chip.textContent.match(/STAGE (\d+)/)?.[1];
            if (!code || reachedStages.has(code)) return;
            reachedStages.add(code);
            if (!quiet) sfx("stage");
        };
        check(true);
        new MutationObserver(() => check(false)).observe(chip, { childList: true, characterData: true, subtree: true });
    };
    if (document.readyState === "complete") watchStage();
    else window.addEventListener("load", watchStage);

    // ほかのファイルから届く出来事
    document.addEventListener("play:cast", () => sfx("coin"));
    document.addEventListener("play:trophy", () => setTimeout(() => sfx("trophy"), 120));
    document.addEventListener("play:event", (event) => {
        const name = event.detail?.name || "";
        if (name === "隠しコマンド") sfx("powerup");
        // 設定画面で効果音を ON にしたときは、確認のために1回鳴らす
        if (name === "設定: sfx=on") sfx("coin");
    });
    document.addEventListener("copy:failed", () => sfx("error"));
})();
