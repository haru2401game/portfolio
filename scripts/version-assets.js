/* ========================================
   version-assets.js：CSS・JS の読み込みに「バージョン番号」を付ける

   ブラウザは一度読んだファイルをしばらく覚えておく（キャッシュ）ので、
   push してもしばらく古いファイルのまま表示されることがある。
   ファイルの中身から作った番号（?v=xxxxxxxx）を付けておくと、
   中身が変わったときだけ番号が変わり、すぐ新しいファイルが読まれる。

   使い方（portfolio フォルダで）
     npm run assets          … 番号を最新にする（CSS・JS を直したら push の前に1回）
                               作品ごとのページ（scripts/work-pages.js）も一緒に作り直す
     node scripts/version-assets.js --check … 番号が古くないか確かめるだけ（自動テストが使う）

   ・ページに書いてある作品数・note の記事数（JavaScript が動く前の表示と、SNS のカードの説明文）も、データにそろえる
   ※ data/blog.js は毎日自動で更新されるので、バージョン番号と自動テストの対象外（記事数は書きかえるだけ）
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
update("js/i18n.js", /"data\/i18n-en\.js(\?v=[0-9a-f]*)?";/, () => `"data/i18n-en.js?v=${hashOf("data/i18n-en.js")}";`);

// 2. index.html が読み込む CSS・JS（1 で i18n.js が変わっていても、ここで新しい番号になる）
const TARGET = /(src|href)="((?:js\/[\w-]+\.js)|(?:css\/[\w-]+\.css)|(?:data\/(?:works|timeline|notice)\.js))(\?v=[0-9a-f]*)?"/g;
for (const page of ["index.html", "404.html", "classic.html"]) {
    if (!fs.existsSync(path.join(ROOT, page))) continue;
    update(page, TARGET, (whole, attr, file) => (fs.existsSync(path.join(ROOT, file)) ? `${attr}="${file}?v=${hashOf(file)}"` : whole));
}

// 3. NEW モード（next/index.html）。住所は next/ から見た場所（../js/… は今のサイトと共通のファイル）
const NEXT_TARGET = /(src|href)="((?:\.\.\/)?(?:js\/[\w-]+\.js|css\/[\w-]+\.css|data\/(?:works|timeline|notice)\.js))(\?v=[0-9a-f]*)?"/g;
if (fs.existsSync(path.join(ROOT, "next/index.html"))) {
    update("next/index.html", NEXT_TARGET, (whole, attr, file) => {
        const real = path.join("next", file);
        return fs.existsSync(path.join(ROOT, real)) ? `${attr}="${file}?v=${hashOf(real)}"` : whole;
    });
}

// 4. ページに書いてある数字（JavaScript が動く前の表示・SNS のカードの説明文）を、データにそろえる
//    ・作品数：data/works.js の作品＋代表作2本（作品を足したら、ここも自動でそろう。自動テストも確かめる）
//    ・note の記事数：data/blog.js（毎日自動で更新されるので、ここでは書きかえるだけで、自動テストでは確かめない）
//    ※ ページを開いたあとは、どちらも JavaScript が同じデータから数字を入れ直す
const vm = require("vm");
const loadWindow = (file) => {
    const window = {};
    try {
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { window });
    } catch {
        /* 読めないときは、数字をそろえない */
    }
    return window;
};
const works = loadWindow("data/works.js").WORKS;
const blog = loadWindow("data/blog.js").BLOG_DATA;
const workTotal = Array.isArray(works) ? works.length + 2 : 0;
const blogCount = Number(blog?.articleCount) || 0;
for (const page of ["index.html", "next/index.html"]) {
    if (!fs.existsSync(path.join(ROOT, page))) continue;
    if (workTotal) {
        update(page, /(data-summary-stat="gameCount">|data-count="works">)\d+(<)/g, (whole, head, tail) => `${head}${workTotal}${tail}`);
        update(page, /(など|のポートフォリオ。|・)\d+(作品)/g, (whole, head, tail) => `${head}${workTotal}${tail}`);
    }
    if (blogCount && !check) {
        const full = path.join(ROOT, page);
        const before = fs.readFileSync(full, "utf8");
        const after = before.replace(/(data-summary-stat="blogCount">|data-count="blog">)\d+(<)/g, (whole, head, tail) => `${head}${blogCount}${tail}`);
        if (after !== before) {
            fs.writeFileSync(full, after);
            outdated.push(`${page}（note の記事数）`);
        }
    }
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
