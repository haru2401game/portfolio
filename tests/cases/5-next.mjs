/* ========================================
   5. 新デザイン（next/）
   BETA 版のあいだは /next/ を、本番に切り替えたあと（npm run launch）はトップ（/）を確かめる
======================================== */

import fs from "node:fs";
import path from "node:path";

export const title = "5. 新デザイン";

// 切り替え前は next/index.html が本体。切り替え後は「移動しました」のページになり、トップが本体
const pageOf = (siteDir) => {
    const next = path.join(siteDir, "next", "index.html");
    if (!fs.existsSync(next)) return null;
    return fs.readFileSync(next, "utf8").includes('data-launched="1"') ? "/" : "/next/";
};

// （前のデザインの起動演出の印。今は使っていないが、古い保存が残っていても動くことを確かめる）
function skipBoot() {
    try {
        sessionStorage.setItem("next-booted", "1");
    } catch {
        /* ignore */
    }
}

// にせもののゲームパッド
function fakeGamepad() {
    try {
        sessionStorage.setItem("next-booted", "1");
    } catch {
        /* ignore */
    }
    const pad = { id: "test-pad", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
}
const PAD = { a: 0, b: 1, start: 9, up: 12, down: 13, left: 14, right: 15 };
const pressPad = async (page, name, wait = 250) => {
    await page.evaluate((index) => (window.__pad.buttons[index].pressed = true), PAD[name]);
    await page.waitForTimeout(120);
    await page.evaluate((index) => (window.__pad.buttons[index].pressed = false), PAD[name]);
    await page.waitForTimeout(wait);
};

const DESCRIBE = `(element) => {
    const cls = String(element.className || "").split(" ").filter(Boolean).slice(0, 2).join(".");
    const text = (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 20);
    return "<" + element.tagName.toLowerCase() + (cls ? " class=" + cls : "") + ">" + (text ? " " + text : "");
}`;

const findOverflow = (page) =>
    page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const clippedInside = (element) => {
            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                if (getComputedStyle(parent).overflowX !== "visible" && parent.getBoundingClientRect().right <= width + 1) return true;
            }
            return false;
        };
        const culprits = [...document.querySelectorAll("body *")]
            .filter((element) => {
                const rect = element.getBoundingClientRect();
                if (!(rect.width > 0 && rect.height > 0 && rect.right > width + 1)) return false;
                if (getComputedStyle(element).position === "fixed" || element.closest("[aria-hidden='true'], .tl-scroller, .articles, .marquee")) return false;
                return !clippedInside(element);
            })
            .map((element) => ({ element, right: Math.round(element.getBoundingClientRect().right) }));
        const outer = culprits.filter(({ element }) => !culprits.some((other) => other.element !== element && other.element.contains(element)));
        if (!outer.length) return null;
        return { width, culprits: outer.slice(0, 6).map(({ element, right }) => `<${element.tagName.toLowerCase()} class="${element.className}"> 右はしが ${right}px`) };
    });

const findJapanese = (page) =>
    page.evaluate(() => {
        const JA = /[぀-ヿ㐀-鿿！-｠]/;
        const skip = (element) => !element || element.closest("script, style, noscript, [data-no-translate], [hidden], .play-continue");
        const found = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!skip(node.parentElement) && JA.test(node.nodeValue)) found.add(node.nodeValue.trim().replace(/\s+/g, " ").slice(0, 50));
        }
        document.querySelectorAll("[alt], [aria-label], [title], [placeholder]").forEach((element) => {
            if (skip(element)) return;
            for (const name of ["alt", "aria-label", "title", "placeholder"]) {
                const value = element.getAttribute(name);
                if (value && JA.test(value)) found.add(`${name}="${value.slice(0, 50)}"`);
            }
        });
        if (JA.test(document.title)) found.add(`タブの名前: ${document.title}`);
        return [...found];
    });

// 新デザインが無いとき（まだ作っていない／消した）は、確かめるものが無いので合格にする
const withPage = (run) => async (helpers) => {
    const target = pageOf(helpers.siteDir);
    if (!target) return;
    await run({ ...helpers, target, openNext: (options = {}) => helpers.open(target, { init: skipBoot, ...options }) });
};

export const tests = [
    {
        name: "本番に切り替えられる状態になっている（npm run launch の確認）",
        async run({ siteDir, expect }) {
            const { execFileSync } = await import("node:child_process");
            let output = "";
            try {
                output = execFileSync("node", [path.join(siteDir, "scripts", "launch-next.js"), "--check"], { encoding: "utf8" });
            } catch (error) {
                output = `${error.stdout || ""}${error.stderr || ""}`;
                expect(false, output.trim());
            }
        },
    },
    {
        name: "パソコンの大きさで、エラーなく開ける",
        run: withPage(async ({ openNext, scrollThrough, noErrors, expect }) => {
            const { page, errors } = await openNext();
            expect((await page.title()).length > 0, "ページのタイトルがありません");
            await scrollThrough(page);
            noErrors(errors);
        }),
    },
    {
        name: "スマホの大きさで、エラーなく開ける",
        run: withPage(async ({ openNext, scrollThrough, noErrors }) => {
            const { page, errors } = await openNext({ phone: true });
            await scrollThrough(page);
            noErrors(errors);
        }),
    },
    {
        name: "遊び要素（キャラクター・トロフィー・いいね・効果音）が入っていない",
        run: withPage(async ({ openNext, scrollThrough, expect }) => {
            const { page } = await openNext();
            await scrollThrough(page);
            for (const key of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(key);
            await page.waitForTimeout(400);
            const found = await page.evaluate(() =>
                [".peeker", ".drifter", ".play-parade", "[data-trophies]", ".like-button", "[data-sfx-demo]", "[data-setting='sfx']", ".cursor-ring", ".sparks", "[data-boot]", ".marquee", "[data-share]"]
                    .filter((selector) => document.querySelector(selector)),
            );
            expect(!found.length, `落ち着いたデザインに入れない部品があります: ${found.join(", ")}`);
            const scripts = await page.evaluate(() => [...document.scripts].map((script) => script.src).filter((src) => /extras|like|sfx|play\.js/.test(src)));
            expect(!scripts.length, `遊び要素のスクリプトを読み込んでいます: ${scripts.join(", ")}`);
        }),
    },
    {
        name: "作品カードの数と順番が data/works.js と同じ",
        run: withPage(async ({ openNext, expect }) => {
            const { page } = await openNext();
            const result = await page.evaluate(() => ({
                data: (window.WORKS || []).map((work) => work.title),
                cards: [...document.querySelectorAll(".works-grid .work-title")].map((title) => title.textContent.trim()),
            }));
            expect(result.cards.length === result.data.length, `作品データは ${result.data.length} 個なのに、カードは ${result.cards.length} 枚です`);
            const wrong = result.data.findIndex((title, index) => title !== result.cards[index]);
            expect(wrong < 0, `${wrong + 1}番目が違います（データ「${result.data[wrong]}」/ カード「${result.cards[wrong]}」）`);
        }),
    },
    ...[320, 390, 768, 1366].map((width) => ({
        name: `横幅 ${width}px で、横にはみ出さない`,
        run: withPage(async ({ openNext, scrollThrough, expect, listUp }) => {
            const { page } = await openNext({ width });
            await scrollThrough(page);
            const overflow = await findOverflow(page);
            expect(!overflow, overflow && `画面の幅 ${overflow.width}px からはみ出して、切れている部分があります\n${listUp(overflow.culprits)}`);
        }),
    })),
    {
        name: "英語に切り替えると日本語が残らず、日本語に戻すと元にもどる",
        run: withPage(async ({ openNext, scrollThrough, expect, listUp, noErrors }) => {
            const { page, errors } = await openNext();
            // エンディングのランクは、スクロールで最後まで行くと出てくるので比べない
            const mainText = () => page.evaluate(() => (() => { const main = document.querySelector("main").cloneNode(true); main.querySelectorAll("[data-ending-rank]").forEach((node) => node.remove()); return main.textContent.replace(/\s+/g, " "); })());
            const before = await mainText();
            await page.click(".hd-options");
            await page.click('[data-setting="lang"] [data-value="en"]');
            await page.waitForTimeout(600);
            await page.keyboard.press("Escape");
            await scrollThrough(page);
            expect((await page.evaluate(() => document.documentElement.lang)) === "en", "<html lang> が en になっていません");
            const left = await findJapanese(page);
            expect(!left.length, `英語にならなかった日本語が ${left.length} か所あります（en_dict に追加が必要）\n${listUp(left, 12)}`);
            await page.click(".hd-options");
            await page.click('[data-setting="lang"] [data-value="ja"]');
            await page.waitForTimeout(400);
            await page.keyboard.press("Escape");
            const after = await mainText();
            expect(after.replace(/\d+/g, "") === before.replace(/\d+/g, ""), "日本語に戻したとき、元の文章と違うところがあります");
            noErrors(errors);
        }),
    },
    {
        name: "最初から英語の設定でも、英語で表示される",
        run: withPage(async ({ openNext, expect, listUp }) => {
            const { page } = await openNext({ settings: { lang: "en" }, wait: 1500 });
            const left = await findJapanese(page);
            expect(!left.length, `英語にならなかった日本語があります\n${listUp(left, 8)}`);
        }),
    },
    {
        name: "画像の alt・ボタンの名前・id・見出しの順番が正しい",
        run: withPage(async ({ openNext, scrollThrough, expect, listUp }) => {
            const { page } = await openNext();
            await scrollThrough(page);
            const result = await page.evaluate((describe) => {
                const name = eval(describe);
                const accessibleName = (element) => {
                    if (element.getAttribute("aria-label")?.trim() || element.getAttribute("title")?.trim()) return true;
                    const labelledby = element.getAttribute("aria-labelledby");
                    if (labelledby && labelledby.split(/\s+/).some((id) => document.getElementById(id)?.textContent.trim())) return true;
                    const clone = element.cloneNode(true);
                    clone.querySelectorAll("[aria-hidden='true']").forEach((hidden) => hidden.remove());
                    return Boolean(clone.textContent.trim() || [...clone.querySelectorAll("img[alt]")].some((img) => img.alt.trim()));
                };
                const count = {};
                document.querySelectorAll("[id]").forEach((element) => (count[element.id] = (count[element.id] || 0) + 1));
                const broken = [];
                document.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], label[for]").forEach((element) => {
                    for (const attribute of ["aria-labelledby", "aria-describedby", "aria-controls", "for"]) {
                        const value = element.getAttribute(attribute);
                        if (value) value.split(/\s+/).filter((id) => !document.getElementById(id)).forEach((id) => broken.push(`${name(element)} の ${attribute}="${id}"`));
                    }
                });
                const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter((heading) => !heading.closest("[hidden], dialog:not([open]), [aria-hidden='true']"));
                const levels = headings.map((heading) => Number(heading.tagName[1]));
                const jumps = levels.flatMap((level, index) => (index && level > levels[index - 1] + 1 ? [`h${levels[index - 1]} の次が h${level}: 「${headings[index].textContent.trim().slice(0, 24)}」`] : []));
                return {
                    noAlt: [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).map((img) => img.getAttribute("src")),
                    nameless: [...document.querySelectorAll("button, a[href], [role='button']")].filter((element) => !element.closest("[aria-hidden='true'], [hidden]") && !accessibleName(element)).map(name),
                    doubled: Object.entries(count).filter(([, n]) => n > 1).map(([id, n]) => `id="${id}" が ${n} 個`),
                    broken,
                    h1: levels.filter((level) => level === 1).length,
                    first: levels[0],
                    jumps,
                };
            }, DESCRIBE);
            expect(!result.noAlt.length, `alt の無い画像があります\n${listUp(result.noAlt)}`);
            expect(!result.nameless.length, `名前の無いボタン・リンクがあります\n${listUp(result.nameless)}`);
            expect(!result.doubled.length, `同じ id が複数あります\n${listUp(result.doubled)}`);
            expect(!result.broken.length, `存在しない id を指しています\n${listUp(result.broken)}`);
            expect(result.h1 === 1 && result.first === 1, `h1 は1つで、最初の見出しにしてください（h1 ${result.h1} 個・最初は h${result.first}）`);
            expect(!result.jumps.length, `見出しの段が飛んでいます\n${listUp(result.jumps)}`);
        }),
    },
    {
        name: "Tab キーで「本文へスキップ」→ 本文へ移動できる",
        run: withPage(async ({ openNext, expect }) => {
            const { page } = await openNext();
            await page.keyboard.press("Tab");
            const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute("href") }));
            expect(/スキップ|skip/i.test(first.text), `最初の Tab で「本文へスキップ」に行きません（${first.text.slice(0, 20)}）`);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(300);
            expect(await page.evaluate((href) => location.hash === href, first.href), "Enter で本文へ移動しませんでした");
        }),
    },
    {
        name: "スマホでボタン・リンクが小さすぎない（24px 以上）",
        run: withPage(async ({ openNext, scrollThrough, expect, listUp }) => {
            const { page } = await openNext({ phone: true });
            await scrollThrough(page);
            const small = await page.evaluate((describe) => {
                const name = eval(describe);
                return [...document.querySelectorAll("button, a[href], input, select")]
                    .filter((element) => {
                        if (element.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) return false;
                        const style = getComputedStyle(element);
                        if (style.display === "inline" || style.visibility === "hidden" || element.classList.contains("skip-link")) return false;
                        const rect = element.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24);
                    })
                    .map((element) => `${name(element)} (${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)})`);
            }, DESCRIBE);
            expect(!small.length, `指で押しにくい小さなボタンがあります\n${listUp(small)}`);
        }),
    },
    {
        name: "「動きを減らす」設定の端末では、動きが止まる",
        run: withPage(async ({ open, target, expect }) => {
            const { page } = await open(target, { reducedMotion: "reduce", wait: 1200 });
            const state = await page.evaluate(() => ({
                motionOff: document.documentElement.classList.contains("motion-off"),
                heroPlaying: [...document.querySelectorAll(".hero video")].some((video) => !video.paused),
            }));
            expect(state.motionOff, "<html> に motion-off が付いていません");
            expect(!state.heroPlaying, "トップの動画が自動で再生されています");
        }),
    },
    {
        name: "設定（OPTIONS）の「アニメーション なし」が、次に開いても覚えている。Esc で閉じてボタンに戻る",
        run: withPage(async ({ openNext, expect }) => {
            const { page } = await openNext();
            await page.click(".hd-options");
            await page.click('[data-setting="motion"] [data-value="none"]');
            expect(await page.evaluate(() => document.documentElement.classList.contains("motion-off")), "「なし」を選んでも motion-off が付きません");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
            expect(!(await page.evaluate(() => document.querySelector("#options").open)), "Esc で設定が閉じません");
            expect(await page.evaluate(() => document.activeElement?.classList.contains("hd-options")), "閉じたあと、OPTIONS ボタンにフォーカスが戻りません");
            await page.reload();
            await page.waitForTimeout(500);
            expect(await page.evaluate(() => document.documentElement.classList.contains("motion-off")), "開き直すと「なし」が消えています");
        }),
    },
    {
        name: "Main Works のタブで、選んだ作品だけが表示される",
        run: withPage(async ({ openNext, expect }) => {
            const { page } = await openNext();
            const shown = () => page.evaluate(() => [...document.querySelectorAll(".stage-panel")].filter((panel) => getComputedStyle(panel).display !== "none").map((panel) => panel.id));
            expect((await shown()).join() === "panel-shishito", `最初に表示されているのが ししとう だけではありません（${await shown()}）`);
            await page.click("#tab-falien");
            await page.waitForTimeout(300);
            expect((await shown()).join() === "panel-falien", `Falien を選んでも切り替わりません（${await shown()}）`);
        }),
    },
    {
        name: "絞り込みで作品が絞られ、作品を押すと詳しい画面が開いて Esc で閉じる",
        run: withPage(async ({ openNext, expect }) => {
            const { page } = await openNext();
            const visible = () => page.evaluate(() => document.querySelectorAll(".works-grid li:not(.is-hidden)").length);
            const all = await visible();
            await page.click('[data-filter="play"]');
            const playable = await visible();
            const expected = await page.evaluate(() => (window.WORKS || []).filter((work) => /^https?:/.test(work.play || "")).length);
            expect(playable === expected, `「遊べる」で ${expected} 作品のはずが ${playable} 作品です`);
            await page.click('[data-filter="all"]');
            expect((await visible()) === all, "「すべて」で元に戻りません");
            await page.click(".works-grid .work >> nth=0");
            await page.waitForTimeout(300);
            expect(await page.evaluate(() => document.querySelector("#viewer").open), "作品を押しても詳しい画面が開きません");
            const title = await page.evaluate(() => document.querySelector("#viewer-title").textContent);
            expect(title === (await page.evaluate(() => window.WORKS[0].title)), `開いた作品の名前が違います（${title}）`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
            expect(!(await page.evaluate(() => document.querySelector("#viewer").open)), "Esc で閉じません");
        }),
    },
    {
        name: "作品ごとのリンク（#work=○○）で、その作品が開く",
        run: withPage(async ({ open, target, expect }) => {
            const { page } = await open(`${target}#work=potion-berserker`, { init: skipBoot });
            const state = await page.evaluate(() => ({ open: document.querySelector("#viewer").open, title: document.querySelector("#viewer-title").textContent }));
            expect(state.open && state.title === "POTION BERSERKER", `#work=potion-berserker で開きません（${state.title}）`);
        }),
    },
    {
        name: "ゲームパッドの十字キーで移動でき、START で設定が開いて B で閉じる",
        run: withPage(async ({ open, target, expect }) => {
            const { page, errors } = await open(target, { init: fakeGamepad });
            await page.evaluate(() => window.dispatchEvent(new Event("gamepadconnected")));
            await page.waitForTimeout(300);
            const focused = () => page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) || "");
            const start = await focused();
            await pressPad(page, "down");
            await pressPad(page, "down");
            expect((await focused()) !== start && !/^<body/.test(await focused()), "十字キーの下でフォーカスが動きません");
            await pressPad(page, "start", 500);
            expect(await page.evaluate(() => !!document.querySelector("dialog[open]")), "START ボタンで設定が開きません");
            await pressPad(page, "b", 500);
            expect(!(await page.evaluate(() => !!document.querySelector("dialog[open]"))), "B ボタンで閉じません");
            expect(!errors.length, `エラーが出ました: ${errors[0]}`);
        }),
    },
    {
        name: "BETA 版では、アクセス解析を送らない",
        run: withPage(async ({ openNext, target, expect }) => {
            if (target !== "/next/") return; // 本番に切り替えたあとは送ってよい
            const { page } = await openNext({ init: () => {
                try {
                    sessionStorage.setItem("next-booted", "1");
                } catch {
                    /* ignore */
                }
                window.__beacons = 0;
                const original = navigator.sendBeacon?.bind(navigator);
                navigator.sendBeacon = (url, data) => {
                    if (/collect/.test(url)) window.__beacons += 1;
                    return original ? original(url, data) : true;
                };
            } });
            await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
            await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
            expect((await page.evaluate(() => window.__beacons)) === 0, "BETA 版なのにアクセス解析を送っています");
        }),
    },
];
