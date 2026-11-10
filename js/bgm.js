/* ========================================
   bgm.js：BGM（クラシックだけ。最初は OFF。設定画面の「BGM」で ON にした人だけに流れる）

   ・音声ファイルは使わず、Web Audio でその場で作るピコピコ音（オリジナルの短いループ曲）
   ・音量は設定画面の「音量」（動画・効果音と共通）。ミュート中・0 のときは鳴らさない
   ・ON にしたことは pa-settings.bgm に覚える。次に開いたときは、最初の操作（クリック・キー）で流れ始める
     （ブラウザは、人が操作する前に音を出せない決まりがあるため）
   ・別のタブを見ているあいだは止まる
   ※ main.js の settings（音量・ミュート）を使う。main.js の後に読み込む
======================================== */

(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || typeof settings === "undefined") return;

    const KEY = "pa-settings";
    const read = () => {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || {};
        } catch {
            return {};
        }
    };
    const save = (on) => {
        try {
            localStorage.setItem(KEY, JSON.stringify({ ...read(), bgm: on ? "on" : "off" }));
        } catch {
            /* 覚えられなくても、このページのあいだは流れる */
        }
    };
    let wanted = read().bgm === "on";

    /* ---------- 曲（オリジナル。1小節 = 8分音符 8つ。0 は休み） ---------- */

    const N = (name) => {
        const table = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
        const note = name.slice(0, -1);
        const octave = Number(name.slice(-1));
        return 440 * 2 ** ((table[note] + (octave - 4) * 12) / 12);
    };
    const LEAD = [
        "E5", "G5", "C6", "G5", "A5", 0, "G5", "E5",
        "F5", "A5", "C6", "A5", "G5", 0, "E5", "D5",
        "E5", "G5", "C6", "D6", "E6", "D6", "C6", "A5",
        "G5", 0, "E5", "G5", "D5", 0, 0, 0,
        "C5", "E5", "G5", "E5", "F5", "A5", "C6", "A5",
        "G5", "B5", "D6", "B5", "C6", 0, "G5", 0,
        "A5", "C6", "A5", "F5", "G5", "E5", "D5", "E5",
        "C5", 0, "G4", 0, "C5", 0, 0, 0,
    ];
    const BASS = ["C3", "C3", "F3", "F3", "C3", "C3", "G3", "G3", "A2", "A2", "G3", "G3", "F3", "F3", "C3", "G3"]; // 4分音符ごとの2つで1小節
    const STEP = 60 / 132 / 2; // 8分音符の長さ（テンポ 132）

    /* ---------- 鳴らす仕組み（少し先まで予約して、ずれずにループする） ---------- */

    let audio = null;
    let master = null;
    let timer = 0;
    let step = 0;
    let nextAt = 0;
    let playing = false;

    const level = () => (settings.muted || settings.volume === 0 ? 0 : (settings.volume / 100) * 0.22);

    const voice = (freq, at, len, type, vol) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(vol, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
        osc.connect(gain).connect(master);
        osc.start(at);
        osc.stop(at + len + 0.02);
    };

    const schedule = () => {
        master.gain.setTargetAtTime(level(), audio.currentTime, 0.1);
        while (nextAt < audio.currentTime + 0.25) {
            const lead = LEAD[step % LEAD.length];
            if (lead) voice(N(lead), nextAt, STEP * 0.9, "square", 0.25);
            if (step % 2 === 0) {
                const bass = BASS[(step / 2) % BASS.length];
                voice(N(bass), nextAt, STEP * 1.8, "triangle", 0.5);
            }
            nextAt += STEP;
            step += 1;
        }
    };

    const start = () => {
        if (playing) return;
        if (!audio) {
            audio = new AudioContextClass();
            const filter = audio.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 3200; // 耳に痛くならないように、少しこもらせる
            master = audio.createGain();
            master.gain.value = 0;
            master.connect(filter).connect(audio.destination);
        }
        audio.resume().catch(() => {});
        playing = true;
        nextAt = audio.currentTime + 0.1;
        timer = setInterval(schedule, 80);
        schedule();
        render();
    };
    const stop = () => {
        if (!playing) return;
        playing = false;
        clearInterval(timer);
        master?.gain.setTargetAtTime(0, audio.currentTime, 0.05);
        setTimeout(() => !playing && audio?.suspend().catch(() => {}), 300);
        render();
    };

    /* ---------- 設定画面に「BGM」の行を足す ---------- */

    const body = document.querySelector(".settings-panel .settings-body");
    let group = null;
    const render = () => {
        group?.querySelectorAll("[role=radio]").forEach((option) => {
            const on = (option.dataset.value === "on") === wanted;
            option.setAttribute("aria-checked", String(on));
            option.tabIndex = on ? 0 : -1;
        });
    };
    if (body) {
        const row = document.createElement("div");
        row.className = "settings-row";
        row.innerHTML = `
            <h3 class="settings-label" id="settings-bgm">BGM</h3>
            <div class="settings-choices" role="radiogroup" aria-labelledby="settings-bgm">
                <button type="button" role="radio" data-value="on">ON</button>
                <button type="button" role="radio" data-value="off">OFF</button>
            </div>
            <p class="settings-note">ゲームのような BGM が流れます（音量は上の「音量」と同じ）</p>`;
        const sfxRow = body.querySelector('[data-setting="sfx"]')?.closest(".settings-row");
        (sfxRow || body.lastElementChild)?.after(row);
        group = row.querySelector("[role=radiogroup]");
        const options = Array.from(group.querySelectorAll("[role=radio]"));
        const choose = (on) => {
            wanted = on;
            save(on);
            if (on) start();
            else stop();
            document.dispatchEvent(new CustomEvent("play:event", { detail: { name: `設定: bgm=${on ? "on" : "off"}` } }));
        };
        options.forEach((option) => option.addEventListener("click", () => choose(option.dataset.value === "on")));
        group.addEventListener("keydown", (event) => {
            const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (!move) return;
            event.preventDefault();
            choose(!wanted);
            group.querySelector('[aria-checked="true"]')?.focus();
        });
        // 「初期設定に戻す」で OFF に
        document.querySelector(".settings-panel .settings-reset")?.addEventListener("click", () => choose(false));
        render();
    }

    // 前に ON にしていた人は、最初の操作で流れ始める
    if (wanted) {
        const kick = () => {
            if (wanted) start();
            ["pointerdown", "keydown"].forEach((type) => window.removeEventListener(type, kick, true));
        };
        ["pointerdown", "keydown"].forEach((type) => window.addEventListener(type, kick, true));
    }
    // 別のタブを見ているあいだは止める
    document.addEventListener("visibilitychange", () => {
        if (!audio) return;
        if (document.hidden) audio.suspend().catch(() => {});
        else if (playing) audio.resume().catch(() => {});
    });
})();
