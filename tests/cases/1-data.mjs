/* ========================================
   1. データとファイルのチェック（ブラウザを使わない・すぐ終わる）
   作品を追加したあとは、まずここが通るか見るとよい
======================================== */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const title = "1. 作品データとファイル";

// data/xxx.js を読み込んで、window に入った中身を取り出す
const loadData = (siteDir, file) => {
    const window = {};
    const code = fs.readFileSync(path.join(siteDir, file), "utf8");
    vm.runInNewContext(code, { window, console: { warn() {}, log() {} } }, { filename: file });
    return window;
};

const REQUIRED = ["title", "image", "alt", "genre", "tech", "period", "member", "role", "description", "link"];

const nameOf = (work, index) => `${index + 1}番目「${work?.title || "名前なし"}」`;
const isOutsideLink = (url) => /^https?:\/\//i.test(url);
// ファイルがあるか（大文字・小文字も区別する。Windows では区別されないが、公開先の GitHub Pages では区別されるため）
const exists = (siteDir, relative) => {
    const parts = decodeURI(relative.split(/[?#]/)[0]).split("/").filter(Boolean);
    let current = siteDir;
    for (const part of parts) {
        if (part === ".") continue;
        if (!fs.existsSync(current) || !fs.statSync(current).isDirectory() || !fs.readdirSync(current).includes(part)) return false;
        current = path.join(current, part);
    }
    return fs.existsSync(current);
};

export const tests = [
    {
        name: "data/works.js が正しく読み込める",
        async run({ siteDir, expect }) {
            let data;
            try {
                data = loadData(siteDir, "data/works.js");
            } catch (error) {
                expect(false, `data/works.js の書き方に間違いがあります（カンマや括弧の抜けが多いです）\n      ${error.message}`);
            }
            expect(Array.isArray(data.WORKS), "window.WORKS = [ ... ] の形になっていません");
            expect(data.WORKS.length > 0, "作品が1つもありません");
        },
    },
    {
        name: "すべての作品に必要な項目がそろっている",
        async run({ siteDir, expect, listUp }) {
            const works = loadData(siteDir, "data/works.js").WORKS;
            const problems = [];
            works.forEach((work, index) => {
                const missing = REQUIRED.filter((key) => work[key] === undefined || work[key] === null || String(work[key]).trim() === "");
                if (missing.length) problems.push(`${nameOf(work, index)}: ${missing.join("・")} がありません`);
                if (work.member !== undefined && !(Number.isInteger(work.member) && work.member >= 1)) {
                    problems.push(`${nameOf(work, index)}: member は 1 以上の数字にしてください（"" で囲まない）`);
                }
                if (work.size !== undefined && !(Array.isArray(work.size) && work.size.length === 2 && work.size.every((n) => Number(n) > 0))) {
                    problems.push(`${nameOf(work, index)}: size は [横, 縦] の形にしてください`);
                }
            });
            expect(!problems.length, `足りない・おかしい項目があります\n${listUp(problems)}`);
        },
    },
    {
        name: "作品の画像・プレイ動画のファイルがある",
        async run({ siteDir, expect, listUp }) {
            const works = loadData(siteDir, "data/works.js").WORKS;
            const missing = [];
            works.forEach((work, index) => {
                if (work.image && !exists(siteDir, work.image)) missing.push(`${nameOf(work, index)} の画像: ${work.image}`);
                if (work.preview && !exists(siteDir, work.preview)) missing.push(`${nameOf(work, index)} の動画: ${work.preview}`);
            });
            expect(!missing.length, `ファイルが見つかりません（名前や場所、大文字小文字を確認）\n${listUp(missing)}`);
        },
    },
    {
        name: "作品のリンクが正しい形になっている",
        async run({ siteDir, expect, listUp }) {
            const works = loadData(siteDir, "data/works.js").WORKS;
            const problems = [];
            works.forEach((work, index) => {
                const link = String(work.link || "").trim();
                if (!link) return;
                if (isOutsideLink(link)) {
                    if (/\s/.test(link)) problems.push(`${nameOf(work, index)}: URL に空白が入っています`);
                } else if (/^[a-z]+:/i.test(link)) {
                    problems.push(`${nameOf(work, index)}: http(s):// で始まる URL にしてください（${link.slice(0, 40)}）`);
                } else if (!exists(siteDir, link)) {
                    problems.push(`${nameOf(work, index)}: サイト内のファイルが見つかりません（${link}）`);
                }
            });
            expect(!problems.length, `リンクに問題があります\n${listUp(problems)}`);
        },
    },
    {
        name: "同じタイトルの作品が重なっていない",
        async run({ siteDir, expect, listUp }) {
            const works = loadData(siteDir, "data/works.js").WORKS;
            const seen = new Map();
            works.forEach((work, index) => seen.set(work.title, [...(seen.get(work.title) || []), index + 1]));
            const doubled = [...seen].filter(([, places]) => places.length > 1).map(([name, places]) => `「${name}」が ${places.join("番目と")}番目`);
            expect(!doubled.length, `同じタイトルが2回以上あります（コピーしたまま直し忘れ？）\n${listUp(doubled)}`);
        },
    },
    {
        name: "すべての作品に英語（en）がある",
        async run({ siteDir, expect, listUp }) {
            const works = loadData(siteDir, "data/works.js").WORKS;
            const problems = [];
            // タイトルは英語でも同じことが多いので、en.title は無くてもよい
            works.forEach((work, index) => {
                if (!work.en) problems.push(`${nameOf(work, index)}: en がありません`);
                else {
                    const missing = ["alt", "genre", "role", "description"].filter((key) => !String(work.en[key] || "").trim());
                    if (missing.length) problems.push(`${nameOf(work, index)}: en の ${missing.join("・")} がありません`);
                }
            });
            expect(!problems.length, `英語表示のとき日本語のまま出てしまいます\n${listUp(problems)}`);
        },
    },
    {
        name: "ページが読み込むサイト内のファイルが全部ある",
        async run({ siteDir, expect, listUp }) {
            const missing = [];
            for (const page of ["index.html", "404.html"]) {
                const html = fs.readFileSync(path.join(siteDir, page), "utf8").replace(/<!--[\s\S]*?-->/g, "");
                const found = [...html.matchAll(/\s(?:src|href|poster|data-preview|data-src)="([^"]+)"/g)].map((match) => match[1]);
                for (const url of new Set(found)) {
                    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(url) || url.includes("${")) continue;
                    // 公開先は https://haru2401game.github.io/portfolio/ なので、/portfolio/ はサイトのフォルダと同じ
                    const local = url.replace(/^\/portfolio\//, "/").replace(/^\.?\//, "");
                    if (!local) continue;
                    if (!exists(siteDir, local.endsWith("/") ? local + "index.html" : local)) missing.push(`${page}: ${url}`);
                }
            }
            expect(!missing.length, `見つからないファイルがあります（リンク切れ）\n${listUp(missing)}`);
        },
    },
    {
        name: "英語の辞書（data/i18n-en.js）が読み込める",
        async run({ siteDir, expect }) {
            let data;
            try {
                data = loadData(siteDir, "data/i18n-en.js");
            } catch (error) {
                expect(false, `data/i18n-en.js の書き方に間違いがあります\n      ${error.message}`);
            }
            const dictionary = Object.values(data).find((value) => value && typeof value === "object" && value.texts);
            expect(dictionary && Object.keys(dictionary.texts).length > 100, "英語の辞書の中身が見つかりません");
        },
    },
];
