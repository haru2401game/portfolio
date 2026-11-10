/* ========================================
   4. 操作（ボタンを押したときに、ちゃんと動くか）
======================================== */

import fs from "node:fs";
import path from "node:path";

export const title = "4. 操作";

// 鳴った効果音の数を数えられるようにする（AudioContext の音の部品を見張る）
function countSounds() {
    const Original = window.AudioContext;
    window.__sounds = 0;
    if (!Original) return;
    window.AudioContext = class extends Original {
        createOscillator() {
            const oscillator = super.createOscillator();
            const start = oscillator.start.bind(oscillator);
            oscillator.start = (...args) => {
                window.__sounds += 1;
                return start(...args);
            };
            return oscillator;
        }
    };
}

// にせもののゲームパッドをつなぐ（ボタンは window.__pad.buttons[番号].pressed で押す）
function fakeGamepad() {
    const pad = {
        id: "test-pad",
        index: 0,
        connected: true,
        mapping: "standard",
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
}

const PAD = { a: 0, b: 1, start: 9, up: 12, down: 13, left: 14, right: 15 };

const pressPad = async (page, button, wait = 350) => {
    await page.evaluate((index) => (window.__pad.buttons[index].pressed = true), PAD[button]);
    await page.waitForTimeout(120);
    await page.evaluate((index) => (window.__pad.buttons[index].pressed = false), PAD[button]);
    await page.waitForTimeout(wait);
};

// 作品一覧を開いて、作品の画像ボタンを押せる状態にする
const showWorks = async (page) => {
    await page.evaluate(() => document.getElementById("other-works")?.scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(400);
    const toggle = page.locator(".works-toggle");
    if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
    await page.waitForTimeout(800);
};

export const tests = [
    {
        name: "設定（OPTIONS）で「アニメーション なし」を選ぶと、動きが止まり、次に開いても覚えている",
        async run({ open, choose, expect }) {
            const { page } = await open("/");
            await choose(page, "motion", "none");
            expect(await page.evaluate(() => document.documentElement.classList.contains("motion-off")), "<html> に motion-off が付きません");
            await page.reload();
            await page.waitForTimeout(600);
            expect(await page.evaluate(() => document.documentElement.classList.contains("motion-off")), "読み込み直すと設定が消えています");
        },
    },
    {
        name: "設定の画面が Esc で閉じて、ボタンにフォーカスが戻る",
        async run({ open, expect }) {
            const { page } = await open("/");
            await page.click(".settings-button");
            await page.waitForTimeout(300);
            expect(await page.evaluate(() => !!document.querySelector("dialog[open]")), "設定の画面が開きません");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            const state = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement?.classList.contains("settings-button") }));
            expect(!state.open, "Esc で閉じません");
            expect(state.focus, "閉じたあと、設定ボタンにフォーカスが戻りません");
        },
    },
    {
        name: "絞り込み（SELECT STAGE）で作品が絞られ、「すべて」で元に戻る",
        async run({ open, expect }) {
            const { page } = await open("/");
            await showWorks(page);
            const buttons = page.locator(".stage-filter button");
            const total = await page.locator(".works-list .work-card").count();
            const unity = buttons.filter({ hasText: "Unity" });
            const expected = Number(await unity.locator("b").textContent());
            await unity.click();
            await page.waitForTimeout(300);
            const shown = await page.locator(".works-list .work-card:not([hidden])").count();
            expect(shown === expected && shown < total, `Unity を押すと ${expected} 個になるはずが ${shown} 個です`);
            expect((await unity.getAttribute("aria-pressed")) === "true", "押したボタンが「選択中」（aria-pressed）になりません");
            await buttons.first().click();
            await page.waitForTimeout(300);
            expect((await page.locator(".works-list .work-card:not([hidden])").count()) === total, "「すべて」で全部の作品に戻りません");
        },
    },
    {
        name: "作品の画像を押すと詳しい画面が開き、Esc で閉じる",
        async run({ open, expect }) {
            const { page, errors } = await open("/");
            await showWorks(page);
            const thumb = page.locator(".works-list .work-card:not([hidden]) .work-thumb").first();
            const title = (await page.locator(".works-list .work-card:not([hidden]) h3").first().textContent()).trim();
            await thumb.click();
            await page.waitForTimeout(500);
            const viewer = await page.evaluate(() => {
                const dialog = document.querySelector("dialog.work-viewer[open]");
                return dialog && { title: dialog.querySelector("[data-wv='title']")?.textContent.trim(), image: !!dialog.querySelector("img")?.getAttribute("src") };
            });
            expect(viewer, "詳しい画面（ビューアー）が開きません");
            expect(viewer.title === title, `違う作品が開きました（「${title}」のはずが「${viewer.title}」）`);
            expect(viewer.image, "ビューアーに画像がありません");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(400);
            expect(!(await page.evaluate(() => !!document.querySelector("dialog.work-viewer[open]"))), "Esc で閉じません");
            expect(await page.evaluate(() => !!document.activeElement?.closest(".work-card")), "閉じたあと、元の作品にフォーカスが戻りません");
            expect(!errors.length, `エラーが出ました: ${errors[0]}`);
        },
    },
    {
        name: "作品ごとのリンク（#work=○○）で、その作品が開く",
        async run({ open, expect, listUp, siteDir }) {
            // すべての作品に、ちがう名前が付いているか（同じだと、リンクで別の作品が開いてしまう）
            const { page: first } = await open("/");
            const ids = await first.evaluate(() => Array.from(document.querySelectorAll(".works-list .work-card")).map((card) => [card.dataset.workId, card.querySelector("h3")?.textContent.trim()]));
            const problems = [];
            const seen = new Map();
            ids.forEach(([id, title]) => {
                if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id || "")) problems.push(`「${title}」のリンク名が作れません（data/works.js に id: "英小文字とハイフン" を書く）`);
                else if (seen.has(id)) problems.push(`「${seen.get(id)}」と「${title}」のリンク名が同じ（${id}）。どちらかに id を書く`);
                else seen.set(id, title);
                if (["shishito", "falien"].includes(id)) problems.push(`「${title}」のリンク名 ${id} が Main Works の作品と同じです`);
            });
            expect(!problems.length, `作品のリンク名に問題があります\n${listUp(problems)}`);

            // 作品ごとのページ（works/○○/）が、サイトのリンク名と同じ名前でそろっているか
            // （scripts/work-pages.js と js/works.js で、名前の作り方がずれていないか）
            const missingPages = ids.filter(([pageId]) => !fs.existsSync(path.join(siteDir, "works", pageId, "index.html")));
            expect(!missingPages.length, `作品ごとのページがありません（npm run pages）\n${listUp(missingPages.map(([pageId, pageTitle]) => `${pageTitle}: works/${pageId}/`))}`);

            // 作品ごとのページ：作品の情報と「遊ぶ」ボタンがあり、「ポートフォリオでこの作品を見る」で本体のその作品が開く
            const { page: workPage, errors: workErrors } = await open("/works/potion-berserker/");
            const info = await workPage.evaluate(() => ({
                title: document.querySelector("h1")?.textContent.trim(),
                play: document.querySelector(".wp-button.is-play")?.getAttribute("href"),
                canonical: document.querySelector('link[rel="canonical"]')?.href,
                robots: document.querySelector('meta[name="robots"]')?.content || "",
            }));
            expect(info.title === "POTION BERSERKER", `works/potion-berserker/ の見出しが違います（${info.title || "なし"}）`);
            expect(/unityroom\.com\/games\/potionberserker/.test(info.play || ""), "works/potion-berserker/ に「遊ぶ」ボタンがありません");
            expect(info.canonical === "https://haru2401game.github.io/portfolio/works/potion-berserker/", `canonical が違います（${info.canonical}）`);
            expect(!/noindex/.test(info.robots), "作品ごとのページが検索に出ない設定（noindex）になっています");
            await workPage.click(".wp-button.is-portfolio");
            await workPage.waitForTimeout(1200);
            const via = await workPage.evaluate(() => ({
                hash: location.hash,
                title: document.querySelector("dialog.work-viewer[open] [data-wv='title']")?.textContent.trim(),
            }));
            expect(via.hash === "#work=potion-berserker" && via.title === "POTION BERSERKER", `「ポートフォリオでこの作品を見る」で POTION BERSERKER が開きません（${via.hash}・${via.title || "開いていない"}）`);
            expect(!workErrors.length, `作品ごとのページでエラーが出ました: ${workErrors[0]}`);

            // Other Works の作品：詳しい画面が開き、閉じると URL から #work= が消える
            const [id, title] = ids[Math.min(6, ids.length - 1)];
            const { page, errors } = await open(`/#work=${id}`);
            await page.waitForTimeout(800);
            const opened = await page.evaluate(() => document.querySelector("dialog.work-viewer[open] [data-wv='title']")?.textContent.trim());
            expect(opened === title, `#work=${id} で「${title}」が開きません（開いたのは「${opened || "なし"}」）`);
            expect(await page.evaluate(() => location.hash) === `#work=${id}`, "開いているあいだ、URL に #work= が付いていません");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(400);
            expect(await page.evaluate(() => location.hash) === "", "閉じたあとも URL に #work= が残っています");

            // Main Works の作品：タブが切り替わる
            const { page: main } = await open("/#work=falien");
            await main.waitForTimeout(800);
            expect(await main.evaluate(() => document.getElementById("tab-falien")?.getAttribute("aria-selected")) === "true", "#work=falien で Falien のタブに切り替わりません");
            const tabsTop = await main.evaluate(() => Math.round(document.querySelector(".main-tabs").getBoundingClientRect().top));
            expect(tabsTop >= 0 && tabsTop < 250, `#work=falien で Main Works まで移動しません（タブが画面の上から ${tabsTop}px の位置）`);

            // 知らない名前：何も開かず、エラーも出ない
            const { page: unknown, errors: unknownErrors } = await open("/#work=no-such-work");
            await unknown.waitForTimeout(600);
            expect(!(await unknown.evaluate(() => !!document.querySelector("dialog.work-viewer[open]"))), "知らない名前なのに、何かが開きました");
            expect(!errors.length && !unknownErrors.length, `エラーが出ました: ${errors[0] || unknownErrors[0]}`);
        },
    },
    {
        name: "効果音 OFF のときは音が鳴らず、ON のときは鳴る",
        async run({ open, expect }) {
            const play = async (sfx) => {
                const { page } = await open("/", { settings: { sfx, volume: 0.5 }, init: countSounds });
                await page.mouse.click(5, 400); // 音はクリックのあとでないと鳴らせない（ブラウザのきまり）
                await page.hover(".settings-button");
                await page.click(".settings-button");
                await page.click('[data-setting="motion"] [data-value="lite"]');
                await page.keyboard.press("Escape");
                await page.waitForTimeout(400);
                return page.evaluate(() => window.__sounds);
            };
            const off = await play("off");
            const on = await play("on");
            expect(off === 0, `効果音 OFF なのに ${off} 回鳴りました`);
            expect(on > 0, "効果音 ON なのに1回も鳴りませんでした");
        },
    },
    {
        name: "ゲームパッドの十字キーで移動でき、START で設定が開いて B で閉じる",
        async run({ open, expect }) {
            const { page, errors } = await open("/", { init: fakeGamepad });
            await page.evaluate(() => window.dispatchEvent(new Event("gamepadconnected")));
            await page.waitForTimeout(300);
            const focused = () => page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) || "");
            const start = await focused();
            await pressPad(page, "down");
            await pressPad(page, "down");
            const moved = await focused();
            expect(moved !== start && !/^<body/.test(moved), "十字キーの下でフォーカスが動きません");
            expect(await page.evaluate(() => document.documentElement.classList.contains("using-gamepad")), "ゲームパッド操作中の印（using-gamepad）が付きません");
            await pressPad(page, "start", 500);
            expect(await page.evaluate(() => !!document.querySelector("dialog[open]")), "START ボタンで設定が開きません");
            await pressPad(page, "b", 500);
            expect(!(await page.evaluate(() => !!document.querySelector("dialog[open]"))), "B ボタンで閉じません");
            expect(!errors.length, `エラーが出ました: ${errors[0]}`);
        },
    },
    {
        name: "いいねのサーバーに届かないときは、いいねボタンを出さない",
        async run({ open, expect }) {
            // このテストでは外への通信を止めているので、サーバーに届かない状態になる
            const { page } = await open("/", { wait: 1500 });
            const state = await page.evaluate(() => ({ button: !!document.querySelector(".like-button"), flag: document.documentElement.classList.contains("has-like") }));
            expect(!state.button && !state.flag, "届かないのにいいねボタンが残っています（押しても数えられません）");
        },
    },
    {
        name: "いいねボタンは、前回の数をすぐ表示する",
        async run({ open, expect }) {
            // サーバーへの通信を遅らせて、「返事が来る前」の表示を確かめる
            const { page } = await open("/", {
                wait: 300,
                slowNetwork: true,
                init: () => localStorage.setItem("pa-like-total", "42"),
            });
            const count = await page.evaluate(() => document.querySelector(".like-button .like-count")?.textContent);
            expect(count === "42", `前回の数（42）ではなく「${count}」が表示されています`);
        },
    },
    {
        name: "見て回ると経験値がたまり（作品を開くと増える）、Lv 表示を押すと冒険の記録が開く",
        async run({ open, expect }) {
            const { page, errors } = await open("/", { wait: 800, init: () => sessionStorage.setItem("pa-classic-intro", "1") });
            const exp = () => page.evaluate(() => window.PlayLevel?.state().exp);
            expect(await page.evaluate(() => /^Lv\.\d+$/.test(document.querySelector(".lv-hud-level")?.textContent || "")), "ヘッダーに Lv が表示されていません");
            await showWorks(page);
            const thumb = page.locator(".works-list .work-card:not([hidden]) .work-thumb").first();
            const before = await exp();
            await thumb.click();
            await page.waitForTimeout(400);
            expect((await exp()) > before, `作品を開いても経験値が増えません（${before}）`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            const again = await exp();
            await thumb.click();
            await page.waitForTimeout(300);
            expect((await exp()) === again, "同じ作品を開き直しても経験値が増えています（1回だけのはず）");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            await page.click(".lv-hud");
            await page.waitForTimeout(300);
            expect(await page.evaluate(() => document.querySelector(".trophy-room")?.open && /Lv\.\d+/.test(document.querySelector(".trophy-level")?.textContent || "")), "Lv 表示を押しても、レベルつきの冒険の記録が開きません");
            expect(!errors.length, `エラーが出ました: ${errors[0]}`);
        },
    },
    {
        name: "ステージに入ると案内役のキャラが話し、「ガイドを出さない」で止められる",
        async run({ open, expect }) {
            const { page } = await open("/", { wait: 800, init: () => sessionStorage.setItem("pa-classic-intro", "1") });
            await page.evaluate(() => document.getElementById("about").scrollIntoView());
            await page.waitForTimeout(1600);
            const talk = () => page.evaluate(() => { const box = document.querySelector(".rpg-talk"); return { shown: Boolean(box && !box.hidden && box.classList.contains("is-show")), name: box?.querySelector(".rpg-name")?.textContent }; });
            const first = await talk();
            expect(first.shown, "ステージに入っても、案内役のキャラが話しません");
            await page.click(".rpg-off");
            await page.waitForTimeout(400);
            await page.evaluate(() => document.getElementById("timeline").scrollIntoView());
            await page.waitForTimeout(1600);
            expect(!(await talk()).shown, "「ガイドを出さない」を押したのに、次のステージでも話しています");
        },
    },
    {
        name: "冒険の記録にクエストが3つ出て、作品を3つ開くと達成になる",
        async run({ open, expect }) {
            const { page } = await open("/", { wait: 800, init: () => sessionStorage.setItem("pa-classic-intro", "1") });
            const quests = () => page.evaluate(() => window.PlayLevel.quests().map((quest) => quest.text));
            expect((await quests()).length === 3, "クエストが3つ出ていません");
            expect((await quests()).includes("作品を3つ開こう"), "「作品を3つ開こう」のクエストがありません");
            await showWorks(page);
            for (let i = 0; i < 3; i++) {
                await page.locator(".works-list .work-card:not([hidden]) .work-thumb").nth(i).click();
                await page.waitForTimeout(250);
                await page.keyboard.press("Escape");
                await page.waitForTimeout(250);
            }
            expect(!(await quests()).includes("作品を3つ開こう"), "作品を3つ開いても、クエストが達成になりません");
            expect(await page.evaluate(() => window.PlayLevel.questsDone()) >= 1, "達成したクエストの数が増えていません");
        },
    },
    {
        name: "Contact の窓口ボタンで「仲間にしますか？」が出て、「いいえ」で閉じる",
        async run({ open, expect }) {
            const { page } = await open("/", { wait: 800, init: () => sessionStorage.setItem("pa-classic-intro", "1") });
            await page.evaluate(() => document.getElementById("contact").scrollIntoView());
            await page.waitForTimeout(300);
            await page.click("#contact .purpose-button >> nth=0", { force: true });
            await page.waitForTimeout(400);
            expect(await page.evaluate(() => document.querySelector(".party-dialog")?.open), "窓口ボタンを押しても「仲間にしますか？」が出ません");
            expect(await page.evaluate(() => document.activeElement?.classList.contains("party-yes")), "「はい」にフォーカスがありません");
            await page.click(".party-no");
            await page.waitForTimeout(300);
            expect(!(await page.evaluate(() => document.querySelector(".party-dialog").open)), "「いいえ」で閉じません");
        },
    },
];
