/* ========================================
   2. ページの表示（ブラウザで実際に開いて確かめる）
======================================== */

export const title = "2. ページの表示";

// 画面の右にはみ出している要素を探す
// このサイトは <html> と <body> で横のはみ出しを切り取っている（横スクロールは出ない）ので、
// 「切り取られて見えなくなっている中身」を探す。カルーセルなど、枠の中で切り取られているものは問題なし
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
                if (getComputedStyle(element).position === "fixed" || element.closest("[aria-hidden='true']")) return false;
                return !clippedInside(element);
            })
            .map((element) => ({ element, right: Math.round(element.getBoundingClientRect().right) }));
        // 外側の要素だけを報告する（中身まで全部並べると分かりにくいため）
        const outer = culprits.filter(({ element }) => !culprits.some((other) => other.element !== element && other.element.contains(element)));
        if (!outer.length) return null;
        return {
            width,
            culprits: outer.slice(0, 6).map(({ element, right }) => `<${element.tagName.toLowerCase()} class="${element.className}"> 右はしが ${right}px`),
        };
    });

// 日本語の文字が残っている場所を集める
const findJapanese = (page) =>
    page.evaluate(() => {
        const JA = /[぀-ヿ㐀-鿿！-｠]/;
        // note の記事タイトル（日本語の記事そのもの）と、わざと日本語のまま見せる部分は除く
        const skip = (element) => !element || element.closest("script, style, noscript, .article-card, [data-no-translate], [hidden]");
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

export const tests = [
    {
        name: "パソコンの大きさで、エラーなく開ける",
        async run({ open, scrollThrough, openDrawers, noErrors, expect }) {
            const { page, errors } = await open("/");
            expect((await page.title()).length > 0, "ページのタイトルがありません");
            await scrollThrough(page);
            await openDrawers(page);
            noErrors(errors);
        },
    },
    {
        name: "スマホの大きさで、エラーなく開ける",
        async run({ open, scrollThrough, openDrawers, noErrors }) {
            const { page, errors } = await open("/", { phone: true });
            await scrollThrough(page);
            await openDrawers(page);
            noErrors(errors);
        },
    },
    {
        name: "存在しないページでは 404 ページが出る",
        async run({ open, noErrors, expect }) {
            const { page, errors } = await open("/no-such-page.html");
            const text = await page.evaluate(() => document.body.innerText);
            expect(/404/.test(text), "404 の表示が見つかりません");
            noErrors(errors);
        },
    },
    {
        name: "作品カードの数と順番が data/works.js と同じ",
        async run({ open, expect }) {
            const { page } = await open("/");
            const result = await page.evaluate(() => ({
                data: (window.WORKS || []).map((work) => work.title),
                cards: [...document.querySelectorAll(".works-list .work-card h3")].map((h3) => h3.textContent.trim()),
            }));
            expect(result.cards.length === result.data.length, `作品データは ${result.data.length} 個なのに、カードは ${result.cards.length} 枚です`);
            const wrong = result.data.findIndex((title, index) => title !== result.cards[index]);
            expect(wrong < 0, `${wrong + 1}番目が違います（データ「${result.data[wrong]}」/ カード「${result.cards[wrong]}」）`);
        },
    },
    {
        name: "プレイ動画のある作品に ▶ MOVIE が付く",
        async run({ open, expect }) {
            const { page } = await open("/");
            const result = await page.evaluate(() => ({
                data: (window.WORKS || []).filter((work) => work.preview).length,
                badges: document.querySelectorAll(".works-list .work-movie-badge").length,
            }));
            expect(result.badges === result.data, `動画のある作品は ${result.data} 個なのに、MOVIE の印は ${result.badges} 個です`);
        },
    },
    ...[320, 390, 768, 1366].map((width) => ({
        name: `横幅 ${width}px で、横にはみ出さない`,
        async run({ open, scrollThrough, openDrawers, expect, listUp }) {
            const { page } = await open("/", { width });
            await scrollThrough(page);
            await openDrawers(page);
            const overflow = await findOverflow(page);
            expect(!overflow, overflow && `画面の幅 ${overflow.width}px からはみ出して、切れている部分があります\n${listUp(overflow.culprits)}`);
        },
    })),
    {
        name: "英語に切り替えると、日本語が残らない",
        async run({ open, choose, openDrawers, scrollThrough, expect, listUp, noErrors }) {
            const { page, errors } = await open("/");
            await choose(page, "lang", "en");
            await scrollThrough(page);
            await openDrawers(page);
            expect((await page.evaluate(() => document.documentElement.lang)) === "en", "<html lang> が en になっていません");
            const left = await findJapanese(page);
            expect(!left.length, `英語にならなかった日本語が ${left.length} か所あります（data/i18n-en.js に追加が必要）\n${listUp(left, 12)}`);
            noErrors(errors);
        },
    },
    {
        name: "英語から日本語に戻すと、元の文章にもどる",
        async run({ open, choose, openDrawers, expect }) {
            const { page } = await open("/");
            await openDrawers(page);
            // 本文（<main>）を比べる。通知など一時的に出るものは比べない
            const mainText = () => page.evaluate(() => document.querySelector("main").innerText);
            const before = await mainText();
            await choose(page, "lang", "en");
            await choose(page, "lang", "ja");
            await openDrawers(page);
            const after = await mainText();
            const a = before.split("\n").filter(Boolean);
            const b = after.split("\n").filter(Boolean);
            const diff = a.findIndex((line, index) => line !== b[index]);
            expect(diff < 0 && a.length === b.length, `日本語に戻したのに違う文があります: 「${a[diff] ?? "(なし)"}」→「${b[diff] ?? "(なし)"}」`);
        },
    },
    {
        name: "最初から英語の設定でも、英語で表示される",
        async run({ open, expect }) {
            const { page } = await open("/", { settings: { lang: "en" }, wait: 1500 });
            const result = await page.evaluate(() => ({
                lang: document.documentElement.lang,
                waiting: document.documentElement.classList.contains("i18n-wait"),
                heading: document.querySelector("h1")?.innerText || "",
            }));
            expect(result.lang === "en", "<html lang> が en になっていません");
            expect(!result.waiting, "本文が隠れたまま（i18n-wait）になっています");
            expect(!/[぀-ヿ]/.test(result.heading), `一番大きな見出しが日本語のままです: ${result.heading}`);
        },
    },
];
