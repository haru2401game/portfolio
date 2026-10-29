/* ========================================
   4. 操作（ボタンを押したときに、ちゃんと動くか）
======================================== */

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
];
