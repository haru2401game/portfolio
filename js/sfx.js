/* ========================================
   sfx.js：効果音（設定画面の「効果音」が ON のときだけ鳴る）

   ・音声ファイルは使わず、Web Audio でその場で作る（ファミコン風の短い電子音）
   ・音量は設定画面の「音量」（動画と共通）。ミュート中・0 のときは鳴らさない
   ・最初の操作（クリック・キー）があるまでは音を出さない（ブラウザの決まり）
   ※ main.js の settings を使う。main.js の後に読み込む
======================================== */

(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || typeof settings === "undefined") return;

    let context = null;
    const enabled = () => settings.sfx === "on" && !settings.muted && settings.volume > 0;

    const getContext = () => {
        if (!context) context = new AudioContextClass();
        if (context.state === "suspended") context.resume().catch(() => {});
        return context;
    };

    /* 音を1つ鳴らす：notes = [[周波数Hz, 開始(秒), 長さ(秒)], ...] */
    const play = (notes, { type = "square", gain = 0.12, slide = 0 } = {}) => {
        if (!enabled()) return;
        const audio = getContext();
        const master = audio.createGain();
        // 音量は 0〜100 → 0〜1。耳に痛くないように全体を小さめにする
        master.gain.value = (settings.volume / 100) * gain;
        master.connect(audio.destination);
        const now = audio.currentTime;
        notes.forEach(([frequency, start, length]) => {
            const osc = audio.createOscillator();
            const env = audio.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, now + start);
            if (slide) osc.frequency.exponentialRampToValueAtTime(frequency * slide, now + start + length);
            env.gain.setValueAtTime(0.0001, now + start);
            env.gain.exponentialRampToValueAtTime(1, now + start + 0.008);
            env.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
            osc.connect(env);
            env.connect(master);
            osc.start(now + start);
            osc.stop(now + start + length + 0.02);
        });
    };

    const SOUNDS = {
        // カーソルを合わせて決定（ふつうのボタン・リンク）
        select: () => play([[988, 0, 0.05]], { gain: 0.07 }),
        // 選択肢を切り替え（タブ・絞り込み・設定）
        tick: () => play([[1319, 0, 0.035]], { gain: 0.06 }),
        // 画面を開く（ポップアップ・設定・一覧）
        open: () => play([[659, 0, 0.06], [988, 0.06, 0.08]], { gain: 0.08 }),
        // 画面を閉じる
        close: () => play([[988, 0, 0.06], [659, 0.06, 0.08]], { gain: 0.07 }),
        // キャラクターを見つけた（コイン）
        coin: () => play([[988, 0, 0.07], [1319, 0.07, 0.22]], { gain: 0.1 }),
        // トロフィー解除（ファンファーレ）
        trophy: () => play([[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.09], [1047, 0.27, 0.3]], { gain: 0.1 }),
        // 隠しコマンド（パワーアップ）
        powerup: () => play([[392, 0, 0.5]], { gain: 0.09, slide: 4 }),
        // いいね（ポンッ）
        like: () => play([[880, 0, 0.09]], { type: "sine", gain: 0.25, slide: 0.5 }),
    };
    const sfx = (name) => SOUNDS[name]?.();
    window.PlaySfx = sfx;

    /* ---------- どの操作で、どの音を鳴らすか ---------- */

    const OPENERS = ".settings-button, .work-card, .works-pickup-card, .tech-photo, .timeline-photo, .footer-trophy, .ending-trophy, .hamburger, .works-toggle, .quest-toggle";
    const CLOSERS = ".settings-close, .settings-done, .work-viewer-close, .photo-viewer-close, .trophy-close, .works-close, [aria-label='閉じる'], [aria-label='Close']";
    const TICKS = "[role='radio'], [role='tab'], .stage-filter button, .settings-mute, .world-node";

    document.addEventListener("click", (event) => {
        // プログラムから押したクリック（ピックアップ → 作品カードなど）では、二重に鳴らさない
        if (!event.isTrusted || !enabled() || !(event.target instanceof Element)) return;
        const target = event.target;
        if (target.closest(".like-button")) return sfx("like");
        if (target.closest(CLOSERS)) return sfx("close");
        if (target.closest(TICKS)) return sfx("tick");
        if (target.closest(OPENERS)) return sfx("open");
        if (target.closest("a[href], button, summary")) sfx("select");
    }, true);

    // ポップアップを背景クリックや Esc キーで閉じたとき
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.querySelector("dialog[open]")) sfx("close");
    }, true);

    document.addEventListener("play:cast", () => sfx("coin"));
    document.addEventListener("play:trophy", () => setTimeout(() => sfx("trophy"), 120));
    document.addEventListener("play:event", (event) => {
        const name = event.detail?.name || "";
        if (name === "隠しコマンド") sfx("powerup");
        // 設定画面で効果音を ON にしたときは、確認のために1回鳴らす
        if (name === "設定: sfx=on") sfx("coin");
    });
})();
