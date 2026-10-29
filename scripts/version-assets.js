/* ========================================
   version-assets.js：CSS・JS の読み込みに「バージョン番号」を付ける

   ブラウザは一度読んだファイルをしばらく覚えておく（キャッシュ）ので、
   push してもしばらく古いファイルのまま表示されることがある。
   ファイルの中身から作った番号（?v=xxxxxxxx）を付けておくと、
   中身が変わったときだけ番号が変わり、すぐ新しいファイルが読まれる。

   使い方（portfolio フォルダで）
     npm run assets          … 番号を最新にする（CSS・JS を直したら push の前に1回）
     npm run assets -- --check … 番号が古くないか確かめるだけ（自動テストが使う）

   ※ data/blog.js は毎日自動で更新されるので対象外
======================================== */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");

// 改行コード（Windows の CRLF と GitHub の LF）の違いで番号が変わらないようにする
const hashOf = (file) => {
    const text = fs.readFileSync(path.join(ROOT, file)).toString("utf8").replace(/\r\n/g, "\n");
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
};

const outdated = [];

const update = (file, pattern, makeReplacement) => {
    const full = path.join(ROOT, file);
    const before = fs.readFileSync(full, "utf8");
    const after = before.replace(pattern, makeReplacement);
    if (after !== before) {
        outdated.push(file);
        if (!check) fs.writeFileSync(full, after);
    }
};

// 1. i18n.js があとから読み込む英語の辞書
update("js/i18n.js", /script\.src = "data\/i18n-en\.js(\?v=[0-9a-f]*)?";/, () => `script.src = "data/i18n-en.js?v=${hashOf("data/i18n-en.js")}";`);

// 2. index.html が読み込む CSS・JS（1 で i18n.js が変わっていても、ここで新しい番号になる）
const TARGET = /(src|href)="((?:js\/[\w-]+\.js)|(?:css\/[\w-]+\.css)|(?:data\/works\.js))(\?v=[0-9a-f]*)?"/g;
for (const page of ["index.html", "404.html"]) {
    if (!fs.existsSync(path.join(ROOT, page))) continue;
    update(page, TARGET, (whole, attr, file) => (fs.existsSync(path.join(ROOT, file)) ? `${attr}="${file}?v=${hashOf(file)}"` : whole));
}

if (check) {
    if (outdated.length) {
        console.log(`バージョン番号が古いファイルがあります: ${outdated.join(", ")}`);
        console.log("portfolio フォルダで  npm run assets  を実行してください");
        process.exit(1);
    }
    console.log("バージョン番号は最新です");
} else {
    console.log(outdated.length ? `バージョン番号を更新しました: ${outdated.join(", ")}` : "バージョン番号は最新です（変更なし）");
}
