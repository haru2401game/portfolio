/* ========================================
   run.mjs：ポートフォリオの自動テストを動かす本体

   使い方（tests フォルダで）
     npm test                    … 全部のテストを実行
     npm test -- 英語            … 名前に「英語」を含むテストだけ実行
     npm test -- --headed        … ブラウザの画面を表示しながら実行（動きを見たいとき）

   やっていること
     1. このパソコンの中だけで動く小さなサーバーを立てて、サイトを開けるようにする
     2. Chromium（Chrome と同じ中身のブラウザ）を自動で操作して、cases/ のテストを順番に試す
     3. 結果を日本語で表示する。失敗したテストは画面を results/ に保存する

   ※ テストは外のサイト（アクセス解析・いいね・フォントなど）には通信しない。
     本物のデータを汚さないためと、ネットの調子で結果が変わらないようにするため
======================================== */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(TESTS_DIR, "..");
const RESULTS_DIR = path.join(TESTS_DIR, "results");
const TIMEOUT = 90_000; // 1つのテストにかけてよい時間（ミリ秒）

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const filters = args.filter((arg) => !arg.startsWith("--"));

/* ---------- 色つきの表示（対応していない画面では色なし） ---------- */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = paint(32);
const red = paint(31);
const yellow = paint(33);
const gray = paint(90);
const bold = paint(1);

/* ---------- 小さなサーバー（サイトのフォルダをそのまま配る） ---------- */

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
};

const server = http.createServer((request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
        response.writeHead(400).end();
        return;
    }
    // 公開先（https://haru2401game.github.io/portfolio/）と同じく、/portfolio/ から始まる住所も使えるようにする
    if (pathname === "/portfolio") pathname = "/portfolio/";
    if (pathname.startsWith("/portfolio/")) pathname = pathname.slice("/portfolio".length);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.join(SITE_DIR, pathname);
    // サイトのフォルダの外や、テスト用の部品は配らない
    const outside = !file.startsWith(SITE_DIR + path.sep);
    const hidden = /[\\/](node_modules|\.git)[\\/]/.test(file);

    const send = (status, target) => {
        const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
        const stat = fs.statSync(target);
        const range = /bytes=(\d*)-(\d*)/.exec(request.headers.range || "");
        // 動画は少しずつ読み込まれるので、「途中から」の注文（Range）にも答える
        if (range && status === 200) {
            const start = range[1] ? Number(range[1]) : 0;
            const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
            response.writeHead(206, {
                "Content-Type": type,
                "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                "Content-Length": end - start + 1,
                "Accept-Ranges": "bytes",
            });
            fs.createReadStream(target, { start, end }).pipe(response);
            return;
        }
        response.writeHead(status, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
        fs.createReadStream(target).pipe(response);
    };

    // 大文字・小文字がファイル名とちがうときは「無い」ことにする（公開先の GitHub Pages と同じ）
    const exactCase = () => {
        let current = SITE_DIR;
        for (const part of path.relative(SITE_DIR, file).split(path.sep)) {
            if (!fs.readdirSync(current).includes(part)) return false;
            current = path.join(current, part);
        }
        return true;
    };

    if (!outside && !hidden && fs.existsSync(file) && fs.statSync(file).isFile() && exactCase()) {
        send(200, file);
    } else if (fs.existsSync(path.join(SITE_DIR, "404.html"))) {
        send(404, path.join(SITE_DIR, "404.html")); // GitHub Pages と同じく、無いページは 404.html を見せる
    } else {
        response.writeHead(404).end("not found");
    }
});

/* ---------- テストの中で使う道具 ---------- */

class TestFailure extends Error {}

// 条件が成り立たなければ、そのテストを「失敗」にする
const expect = (condition, message) => {
    if (!condition) throw new TestFailure(message);
};

// 一覧を「・〇〇」の形で読みやすくまとめる（多すぎるときは省略）
const listUp = (items, max = 8) => {
    const shown = items.slice(0, max).map((item) => `      ・${item}`);
    if (items.length > max) shown.push(`      …ほか ${items.length - max} 件`);
    return shown.join("\n");
};

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const PC = { viewport: { width: 1366, height: 800 } };

const makeHelpers = (browser, baseURL, opened) => ({
    expect,
    listUp,
    siteDir: SITE_DIR,
    baseURL,

    /**
     * サイトのページを開く
     * @param {string} pathname  開くページ（"/" や "/404.html"）
     * @param {object} options   phone: スマホの大きさで開く / width: 画面の幅 / settings: 先に入れておく設定（OPTIONS）
     *                           slowNetwork: 外への通信の返事を遅らせる / reducedMotion: "reduce" で「動きを減らす」端末のまね
     *                           init: ページの読み込み前に動かす関数
     * @returns {Promise<{page, errors}>}  errors にはページで起きたエラーがたまる
     */
    async open(pathname = "/", options = {}) {
        let contextOptions = options.phone ? PHONE : PC;
        if (options.width) {
            const small = options.width < 769;
            contextOptions = { viewport: { width: options.width, height: small ? 844 : 800 }, isMobile: small, hasTouch: small };
        }
        const context = await browser.newContext({ ...contextOptions, reducedMotion: options.reducedMotion || "no-preference" });
        opened.push(context);

        // 外のサイトへの通信は止める（このテスト用サーバー以外）
        await context.route("**/*", (route) => {
            const url = route.request().url();
            if (url.startsWith(baseURL) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
            // slowNetwork: 外への通信を「なかなか返事が来ない」状態にする（遅い回線のまね）
            if (options.slowNetwork) return new Promise((resolve) => setTimeout(() => route.abort().catch(() => {}).then(resolve), 5000));
            return route.abort();
        });

        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(`JavaScript のエラー: ${error.message}`));
        page.on("console", (message) => {
            const text = message.text();
            if (/Content Security Policy|Refused to/i.test(text)) errors.push(`セキュリティ設定（CSP）で止められた: ${text.slice(0, 160)}`);
            else if (message.type() === "error" && !/Failed to load resource|net::ERR_/i.test(text)) errors.push(`コンソールのエラー: ${text.slice(0, 160)}`);
            else if (message.type() === "warning" && /data\/works\.js/.test(text)) errors.push(`作品データの警告: ${text}`);
        });
        // サイト内のファイルが見つからない（404）ときもエラーにする
        page.on("response", (response) => {
            const url = response.url();
            if (url.startsWith(baseURL) && response.status() === 404 && !/favicon\.ico$/.test(url) && url !== baseURL + pathname.replace(/^\//, "")) {
                errors.push(`ファイルが見つからない: ${url.slice(baseURL.length - 1)}`);
            }
        });

        await page.addInitScript(
            ({ settings }) => {
                // テストごとに新しいブラウザの部屋（保存データは空）で開くので、最初の1回だけ設定を入れる
                try {
                    if (settings && !sessionStorage.getItem("__test-ready")) localStorage.setItem("pa-settings", JSON.stringify(settings));
                    sessionStorage.setItem("__test-ready", "1");
                } catch {
                    /* ignore */
                }
            },
            { settings: options.settings || null },
        );
        if (options.init) await page.addInitScript(options.init, options.initArg);

        await page.goto(baseURL + pathname.replace(/^\//, ""), { waitUntil: "load" });
        await page.waitForTimeout(options.wait ?? 800);
        return { page, errors };
    },

    // ページを上から下までスクロールする（スクロールで表示される部分を全部動かすため）
    async scrollThrough(page) {
        await page.evaluate(async () => {
            const height = document.documentElement.scrollHeight;
            for (let y = 0; y < height; y += 500) {
                window.scrollTo({ top: y, behavior: "instant" });
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            window.scrollTo({ top: 0, behavior: "instant" });
        });
        await page.waitForTimeout(500);
    },

    // 閉じている引き出し（作品一覧など）を全部開く
    async openDrawers(page) {
        await page.evaluate(() => {
            document.querySelectorAll(".works-toggle[aria-expanded='false'], .quest-toggle[aria-expanded='false']").forEach((button) => button.click());
        });
        await page.waitForTimeout(700);
    },

    // 設定（OPTIONS）を開いて、項目を選ぶ。例: choose(page, "lang", "en")
    async choose(page, setting, value) {
        await page.click(".settings-button");
        await page.click(`[data-setting="${setting}"] [data-value="${value}"]`);
        await page.waitForTimeout(500);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
    },

    // ページの中で起きたエラーが無いことを確かめる
    noErrors(errors, where = "") {
        expect(errors.length === 0, `${where}エラーが ${errors.length} 件出ました\n${listUp([...new Set(errors)])}`);
    },
});

/* ---------- テストを集めて順番に動かす ---------- */

const loadCases = async () => {
    const dir = path.join(TESTS_DIR, "cases");
    const files = fs.readdirSync(dir).filter((name) => name.endsWith(".mjs")).sort();
    const groups = [];
    for (const file of files) {
        const module = await import(pathToFileURL(path.join(dir, file)).href);
        groups.push({ title: module.title || file, tests: module.tests || [], file });
    }
    return groups;
};

const seconds = (ms) => `${(ms / 1000).toFixed(1)}秒`;
const safeName = (text) => text.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 60);

const main = async () => {
    let chromium;
    try {
        ({ chromium } = await import("playwright"));
    } catch {
        console.log(red("Playwright が見つかりません。tests フォルダで先に次の2つを実行してください。"));
        console.log("  npm install");
        console.log("  npm run setup");
        process.exit(1);
    }

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const baseURL = `http://127.0.0.1:${server.address().port}/`;

    let browser;
    try {
        browser = await chromium.launch({ headless: !headed });
    } catch (error) {
        console.log(red("ブラウザ（Chromium）を起動できませんでした。tests フォルダで次を実行してから、もう一度試してください。"));
        console.log("  npm run setup");
        console.log(gray(String(error.message).split("\n")[0]));
        server.close();
        process.exit(1);
    }

    fs.rmSync(RESULTS_DIR, { recursive: true, force: true });

    const groups = await loadCases();
    const results = { pass: 0, fail: 0, skip: 0 };
    const failures = [];
    const started = Date.now();

    console.log(bold("\nポートフォリオの自動テストを始めます"));
    if (filters.length) console.log(gray(`（名前に「${filters.join("」「")}」を含むテストだけ）`));

    for (const group of groups) {
        const tests = group.tests.filter((test) => !filters.length || filters.some((word) => `${group.title} ${test.name}`.includes(word)));
        if (!tests.length) continue;
        console.log(`\n${bold("■ " + group.title)}`);

        for (const test of tests) {
            const opened = [];
            const helpers = makeHelpers(browser, baseURL, opened);
            const begin = Date.now();
            let timer;
            try {
                await Promise.race([
                    test.run(helpers),
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new TestFailure(`${TIMEOUT / 1000}秒たっても終わりませんでした`)), TIMEOUT);
                    }),
                ]);
                results.pass += 1;
                console.log(`  ${green("✔")} ${test.name} ${gray(seconds(Date.now() - begin))}`);
            } catch (error) {
                results.fail += 1;
                const reason = error instanceof TestFailure ? error.message : `テストの途中で止まりました: ${String(error.message).split("\n")[0]}`;
                console.log(`  ${red("✘")} ${test.name} ${gray(seconds(Date.now() - begin))}`);
                console.log(red(`      → ${reason.replace(/\n/g, "\n")}`));

                // 失敗したときの画面を保存する
                const pages = opened.flatMap((context) => context.pages());
                const last = pages[pages.length - 1];
                if (last) {
                    try {
                        fs.mkdirSync(RESULTS_DIR, { recursive: true });
                        const shot = path.join(RESULTS_DIR, `${safeName(test.name)}.png`);
                        await last.screenshot({ path: shot });
                        console.log(gray(`      → そのときの画面: tests/results/${path.basename(shot)}`));
                    } catch {
                        /* ignore */
                    }
                }
                failures.push({ group: group.title, name: test.name, file: group.file });
            } finally {
                clearTimeout(timer);
                await Promise.all(opened.map((context) => context.close().catch(() => {})));
            }
        }
    }

    await browser.close();
    server.close();

    const total = results.pass + results.fail;
    console.log("\n" + "─".repeat(40));
    if (!total) {
        console.log(yellow(`「${filters.join(" ")}」に当てはまるテストがありませんでした`));
        process.exit(1);
    }
    if (results.fail === 0) {
        console.log(green(bold(`すべて合格です！ ${results.pass} / ${total}`)) + gray(`（${seconds(Date.now() - started)}）`));
    } else {
        console.log(red(bold(`失敗 ${results.fail} 件`)) + ` ／ 合格 ${results.pass} 件 ／ 全 ${total} 件` + gray(`（${seconds(Date.now() - started)}）`));
        console.log("失敗したテスト:");
        failures.forEach((failure) => console.log(`  ・${failure.group} › ${failure.name} ${gray(`(tests/cases/${failure.file})`)}`));
        console.log(gray("\n1つだけやり直すときは  npm test -- テストの名前の一部  のように実行できます"));
    }
    process.exit(results.fail ? 1 : 0);
};

main().catch((error) => {
    console.error(red("テストを動かせませんでした"), error);
    server.close();
    process.exit(1);
});
