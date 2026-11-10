/* ========================================
   result-card.js：クリア結果のシェア画像（クラシックのエンディング）

   ・エンディングの「結果を画像で保存」で、ゲームのリザルト画面のような画像（1200×630）をその場で作る
   ・中身：GAME CLEAR!／ランク／レベルと称号／プレイタイム・ステージ・クエスト・トロフィー・経験値
   ・スマホは共有メニュー（写真に保存・X などに送る）、PC は PNG のダウンロード
   ・画像はこの端末の中で作るだけで、どこにも送らない
   ※ play.js（window.PlayResult）・adventure.js（PlayLevel）の後に読み込む
======================================== */

(() => {
    const row = document.querySelector(".ending-share-row");
    if (!row || typeof window.PlayResult !== "function") return;

    const W = 1200;
    const H = 630;
    const C = {
        ink: "#111713",
        sub: "#5b6560",
        red: "#d6363d",
        blue: "#00739e",
        gold: "#ffd54a",
        goldEdge: "#b8860b",
        bg1: "#eaf6fd",
        bg2: "#fff8ec",
        line: "#e1e7ef",
    };
    const RANK_COLOR = { S: "#d6363d", A: "#ff8a00", B: "#00739e", C: "#5b6560" };
    const FONT = '"Inter", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';
    const en = () => window.I18n?.lang === "en";

    const loadImage = (src) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });

    // 角の丸い四角（下に厚みの影を付けると、サイトのボタンと同じ「押せそうな」見た目になる）
    const box = (ctx, x, y, w, h, r, fill, edge = null, depth = 0) => {
        const path = () => {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
        };
        if (edge && depth) {
            ctx.save();
            ctx.translate(0, depth);
            path();
            ctx.fillStyle = edge;
            ctx.fill();
            ctx.restore();
        }
        path();
        ctx.fillStyle = fill;
        ctx.fill();
        if (edge) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = edge;
            ctx.stroke();
        }
    };

    const text = (ctx, value, x, y, { size = 24, weight = 800, color = C.ink, align = "left", spacing = 0 } = {}) => {
        ctx.font = `${weight} ${size}px ${FONT}`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = "alphabetic";
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
        ctx.fillText(String(value), x, y);
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    };

    const draw = async () => {
        const r = window.PlayResult();
        const a = r.adventure;
        const isEn = en();
        try {
            await Promise.all([document.fonts?.load(`900 64px "Inter"`), document.fonts?.load(`800 32px "Noto Sans JP"`)]);
        } catch {
            /* フォントが無くても、端末の文字で描く */
        }
        const [logo, hero, pal] = await Promise.all([
            loadImage("images/favicon.webp"),
            loadImage("images/character/Player.png"),
            loadImage("images/character/Penko.png"),
        ]);

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false; // ドット絵をくっきり

        // 背景：明るい空色 → クリーム色 ＋ ドット
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, C.bg1);
        bg.addColorStop(1, C.bg2);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(17, 23, 19, .07)";
        for (let y = 11; y < H; y += 22) for (let x = 11; x < W; x += 22) ctx.fillRect(x, y, 2, 2);

        // 左上：サイト名
        if (logo) {
            box(ctx, 48, 40, 56, 56, 12, "#fff", C.line, 3);
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(logo, 54, 46, 44, 44);
            ctx.imageSmoothingEnabled = false;
        }
        text(ctx, "HARUTA NAGAYA", 120, 66, { size: 22, weight: 900, spacing: 2 });
        text(ctx, "GAME PROGRAMMER PORTFOLIO", 120, 90, { size: 13, weight: 800, color: C.sub, spacing: 3 });

        // 見出し：GAME CLEAR!
        text(ctx, "GAME CLEAR!", 52, 196, { size: 96, weight: 900, color: C.ink, spacing: -2 });
        text(ctx, "GAME CLEAR!", 48, 190, { size: 96, weight: 900, color: C.red, spacing: -2 });

        // ランク（右上の大きなバッジ）
        const rankColor = RANK_COLOR[r.rank] || C.ink;
        box(ctx, 900, 40, 252, 252, 32, "#fff", C.ink, 10);
        text(ctx, "RANK", 1026, 92, { size: 22, weight: 900, color: C.sub, align: "center", spacing: 6 });
        text(ctx, r.rank, 1026, 262, { size: 190, weight: 900, color: rankColor, align: "center" });

        // レベルと称号
        if (a) {
            box(ctx, 48, 222, 130, 64, 32, C.blue, "#00506e", 5);
            text(ctx, `Lv.${a.level}`, 113, 266, { size: 34, weight: 900, color: "#fff", align: "center" });
            text(ctx, isEn ? a.titleEn : a.title, 198, 266, { size: 38, weight: 900 });
        }

        // 数字のカード（2段 × 3つ）
        const stats = [
            ["PLAY TIME", r.time],
            ["STAGE", `${a ? a.stages : r.sections} / ${a ? a.stagesTotal : r.stagesTotal}`],
            ["QUEST", a ? `${a.quests} / ${a.questsTotal}` : "-"],
            [isEn ? "TROPHIES" : "TROPHY", `${r.trophies} / ${r.trophiesTotal}`],
            [isEn ? "WORKS SEEN" : "WORKS", String(r.works)],
            ["EXP", a ? a.exp.toLocaleString() : "-"],
        ];
        stats.forEach(([label, value], i) => {
            const x = 48 + (i % 3) * 272;
            const y = 318 + Math.floor(i / 3) * 112;
            box(ctx, x, y, 252, 92, 18, "#fff", C.ink, 6);
            text(ctx, label, x + 22, y + 32, { size: 15, weight: 900, color: C.sub, spacing: 2 });
            text(ctx, value, x + 22, y + 74, { size: 38, weight: 900 });
        });

        // 右下：キャラクター（ドット絵）
        if (hero) ctx.drawImage(hero, 930, 360, 128, 128);
        if (pal) ctx.drawImage(pal, 1040, 380, 112, 112);
        ctx.fillStyle = "rgba(17, 23, 19, .12)";
        ctx.beginPath();
        ctx.ellipse(1040, 494, 110, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 下の帯：サイトの住所
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, H - 56, W, 56);
        text(ctx, isEn ? "▶ PLAY THE PORTFOLIO" : "▶ 遊べるポートフォリオ", 48, H - 20, { size: 20, weight: 900, color: C.gold, spacing: 1 });
        text(ctx, "haru2401game.github.io/portfolio", W - 48, H - 20, { size: 20, weight: 800, color: "#fff", align: "right", spacing: 1 });

        return canvas;
    };

    /* ---------- 見せる・保存する ---------- */

    const dialog = document.createElement("dialog");
    dialog.className = "result-card-dialog";
    dialog.setAttribute("aria-labelledby", "result-card-title");
    dialog.innerHTML = `
        <h2 id="result-card-title">リザルト画像</h2>
        <img class="result-card-image" alt="" width="1200" height="630">
        <p class="result-card-note">この画像は、この端末の中で作りました（どこにも送っていません）。</p>
        <div class="result-card-actions">
            <button type="button" class="ending-button ending-share" data-result-save>画像を保存</button>
            <button type="button" class="ending-button" data-result-close>閉じる</button>
        </div>`;
    document.body.append(dialog);
    const image = dialog.querySelector(".result-card-image");
    let blob = null;

    const fileName = () => `portfolio-result-${new Date().toISOString().slice(0, 10)}.png`;
    const save = async () => {
        if (!blob) return;
        const file = new File([blob], fileName(), { type: "image/png" });
        // スマホ：共有メニュー（「画像を保存」や X・LINE に送れる）
        if (navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], text: "#遊べるポートフォリオ https://haru2401game.github.io/portfolio/" });
                return;
            } catch (error) {
                if (error?.name === "AbortError") return; // 共有をやめた
            }
        }
        // PC：PNG をダウンロード
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName();
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    };

    const open = async () => {
        button.disabled = true;
        try {
            const canvas = await draw();
            image.src = canvas.toDataURL("image/png");
            const result = window.PlayResult();
            image.alt = `クリア結果：ランク ${result.rank}、プレイタイム ${result.time}`;
            blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
            if (!dialog.open) dialog.showModal();
            dialog.querySelector("[data-result-save]").focus();
            document.dispatchEvent(new CustomEvent("play:event", { detail: { name: "リザルト画像" } }));
        } finally {
            button.disabled = false;
        }
    };

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ending-button ending-result-card";
    button.textContent = "🖼 結果を画像にする";
    button.addEventListener("click", open);
    row.append(button);

    dialog.querySelector("[data-result-save]").addEventListener("click", () => {
        save();
        document.dispatchEvent(new CustomEvent("play:event", { detail: { name: "リザルト画像を保存" } }));
    });
    dialog.querySelector("[data-result-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close(); // 外側を押したら閉じる
    });

    // テスト・確認用
    window.ResultCard = { draw, open };
})();
