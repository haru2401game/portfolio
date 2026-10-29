/* ========================================
   3. だれでも使えるか（アクセシビリティ）
   画面読み上げソフトやキーボードだけで使う人にも、正しく伝わるかの基本チェック
======================================== */

export const title = "3. だれでも使えるか（アクセシビリティ）";

// ページ全部を用意する（スクロールで出る部分・引き出しも開いた状態）
const prepare = async ({ open, scrollThrough, openDrawers }, options) => {
    const { page } = await open("/", options);
    await scrollThrough(page);
    await openDrawers(page);
    return page;
};

// 要素の説明用の短い名前（失敗したとき、どこが悪いか分かるように）
const DESCRIBE = `(element) => {
    const cls = String(element.className || "").split(" ").filter(Boolean).slice(0, 2).join(".");
    const text = (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 20);
    return "<" + element.tagName.toLowerCase() + (cls ? " class=" + cls : "") + ">" + (text ? " " + text : "");
}`;

export const tests = [
    {
        name: "ページの言語（lang）とタイトルが設定されている",
        async run({ open, expect }) {
            const { page } = await open("/");
            const info = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title }));
            expect(info.lang === "ja", `<html lang> が "ja" ではありません（${info.lang}）`);
            expect(info.title.trim().length > 0, "<title> が空です");
        },
    },
    {
        name: "すべての画像に alt（説明の文）が付いている",
        async run(helpers) {
            const page = await prepare(helpers);
            const missing = await page.evaluate((describe) => {
                const name = eval(describe);
                return [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).map((img) => `${name(img)} ${img.getAttribute("src") || ""}`);
            }, DESCRIBE);
            helpers.expect(!missing.length, `alt の無い画像があります（飾りなら alt="" にする）\n${helpers.listUp(missing)}`);
        },
    },
    {
        name: "ボタンとリンクに、読み上げられる名前がある",
        async run(helpers) {
            const page = await prepare(helpers);
            const nameless = await page.evaluate((describe) => {
                const name = eval(describe);
                const accessibleName = (element) => {
                    if (element.getAttribute("aria-label")?.trim()) return true;
                    const labelledby = element.getAttribute("aria-labelledby");
                    if (labelledby && labelledby.split(/\s+/).some((id) => document.getElementById(id)?.textContent.trim())) return true;
                    if (element.getAttribute("title")?.trim()) return true;
                    // 中の文字（aria-hidden の部分は読まれないので除く）
                    const clone = element.cloneNode(true);
                    clone.querySelectorAll("[aria-hidden='true']").forEach((hidden) => hidden.remove());
                    if (clone.textContent.trim()) return true;
                    if ([...clone.querySelectorAll("img[alt]")].some((img) => img.alt.trim())) return true;
                    return false;
                };
                return [...document.querySelectorAll("button, a[href], [role='button']")]
                    .filter((element) => !element.closest("[aria-hidden='true'], [hidden]") && !element.inert)
                    .filter((element) => !accessibleName(element))
                    .map(name);
            }, DESCRIBE);
            helpers.expect(!nameless.length, `名前の無いボタン・リンクがあります（aria-label を付ける）\n${helpers.listUp(nameless)}`);
        },
    },
    {
        name: "id が重なっていない",
        async run(helpers) {
            const page = await prepare(helpers);
            const doubled = await page.evaluate(() => {
                const count = {};
                document.querySelectorAll("[id]").forEach((element) => (count[element.id] = (count[element.id] || 0) + 1));
                return Object.entries(count).filter(([, n]) => n > 1).map(([id, n]) => `id="${id}" が ${n} 個`);
            });
            helpers.expect(!doubled.length, `同じ id が複数あります\n${helpers.listUp(doubled)}`);
        },
    },
    {
        name: "aria-labelledby などが指す id が存在する",
        async run(helpers) {
            const page = await prepare(helpers);
            const broken = await page.evaluate((describe) => {
                const name = eval(describe);
                const out = [];
                document.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], label[for]").forEach((element) => {
                    for (const attribute of ["aria-labelledby", "aria-describedby", "aria-controls", "for"]) {
                        const value = element.getAttribute(attribute);
                        if (!value) continue;
                        value.split(/\s+/).filter((id) => !document.getElementById(id)).forEach((id) => out.push(`${name(element)} の ${attribute}="${id}"`));
                    }
                });
                return out;
            }, DESCRIBE);
            helpers.expect(!broken.length, `存在しない id を指しています\n${helpers.listUp(broken)}`);
        },
    },
    {
        name: "見出し（h1〜h6）が1つ目の h1 から始まり、段を飛ばさない",
        async run(helpers) {
            const page = await prepare(helpers);
            const result = await page.evaluate(() => {
                const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(
                    (heading) => !heading.closest("[hidden], dialog:not([open]), [aria-hidden='true']"),
                );
                const levels = headings.map((heading) => Number(heading.tagName[1]));
                const jumps = [];
                levels.forEach((level, index) => {
                    if (index && level > levels[index - 1] + 1) {
                        jumps.push(`h${levels[index - 1]} の次が h${level}: 「${headings[index].textContent.trim().slice(0, 24)}」`);
                    }
                });
                return { h1: levels.filter((level) => level === 1).length, first: levels[0], jumps };
            });
            helpers.expect(result.h1 === 1, `h1 は1つにしてください（今は ${result.h1} 個）`);
            helpers.expect(result.first === 1, `最初の見出しが h1 ではありません（h${result.first}）`);
            helpers.expect(!result.jumps.length, `見出しの段が飛んでいます\n${helpers.listUp(result.jumps)}`);
        },
    },
    {
        name: "Tab キーで「本文へスキップ」→ 本文へ移動できる",
        async run({ open, expect }) {
            const { page } = await open("/");
            await page.keyboard.press("Tab");
            const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute("href") }));
            expect(/スキップ|skip/i.test(first.text), `最初の Tab で「本文へスキップ」に行きません（${first.text.slice(0, 20)}）`);
            await page.keyboard.press("Enter");
            await page.waitForTimeout(300);
            expect(await page.evaluate((href) => location.hash === href, first.href), "Enter で本文へ移動しませんでした");
        },
    },
    {
        name: "スマホでボタン・リンクが小さすぎない（24px 以上）",
        async run(helpers) {
            const page = await prepare(helpers, { phone: true });
            const small = await page.evaluate((describe) => {
                const name = eval(describe);
                return [...document.querySelectorAll("button, a[href], input, select")]
                    .filter((element) => {
                        if (element.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) return false;
                        const style = getComputedStyle(element);
                        if (style.display === "inline" || style.visibility === "hidden" || element.classList.contains("skip-link")) return false; // 文中のリンクは対象外
                        const rect = element.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24);
                    })
                    .map((element) => {
                        const rect = element.getBoundingClientRect();
                        return `${name(element)} (${Math.round(rect.width)}×${Math.round(rect.height)})`;
                    });
            }, DESCRIBE);
            helpers.expect(!small.length, `指で押しにくい小さなボタンがあります\n${helpers.listUp(small)}`);
        },
    },
    {
        name: "「動きを減らす」設定の端末では、アニメーションが止まる",
        async run({ open, expect }) {
            const { page } = await open("/", { reducedMotion: "reduce" });
            const state = await page.evaluate(() => ({
                motionOff: document.documentElement.classList.contains("motion-off"),
                heroPlaying: [...document.querySelectorAll(".hero video")].some((video) => !video.paused),
            }));
            expect(state.motionOff, "<html> に motion-off が付いていません");
            expect(!state.heroPlaying, "ヒーローの動画が自動で再生されています");
        },
    },
];
