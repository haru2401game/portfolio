/* ========================================
   work-pages.js：作品ごとの小さなページ（works/○○/index.html）を作る

   X・Discord・LINE などにリンクを貼ったとき、その作品の画像とタイトルのカードが出るようにするためのページ。
   開くとすぐ本体の …/portfolio/#work=○○ へ移動して、その作品が開く（js/work-redirect.js）。
   Google の検索結果には出さない（noindex。検索には本体のページだけが出る）。

   使い方（portfolio フォルダで）
     npm run pages            … ページを作り直す（作品を足したり直したりしたら、push の前に1回）
     npm run pages -- --check … ページが古くないか確かめるだけ（自動テストが使う）

   ・Other Works の作品は data/works.js から、Main Works の2本は下の MAIN_WORKS から作る
   ・リンク名（○○）の作り方は js/works.js の idOf と同じ（変えるときは両方そろえる）
   ・data/works.js から消した作品のページは、自動で消す
======================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "works");
const SITE = "https://haru2401game.github.io/portfolio/";
const check = process.argv.includes("--check");

// Main Works（index.html に直接書いてある2本）。タブの id が tab-○○ になっている
const MAIN_WORKS = [
    {
        id: "shishito",
        title: "ししとう",
        image: "images/index/Hero/poster.webp",
        size: [703, 397],
        alt: "ししとうのタイトル画面",
        text: "四肢を回して闘う2D格闘ゲーム。5人チームでリードプログラマーを担当。東京ゲームショウ2026 インディーゲームコーナー出展。",
    },
    {
        id: "falien",
        title: "Falien",
        image: "images/index/otherworks/Falien.webp",
        size: [1280, 720],
        alt: "Falienのタイトル画面",
        text: "宇宙人の足を付け替えて研究所から脱出する2Dアクション。6か国・7人の国際チームでジェネラリストを担当。IGCCゲームジャム グランプリ受賞。",
    },
];

// js/works.js の idOf と同じ
const idOf = (work) => String(work.id || work.en?.title || work.title || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escape = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 改行コード（Windows の CRLF と GitHub の LF）の違いで番号が変わらないようにする（version-assets.js と同じ）
const hashOf = (file) => {
    const text = fs.readFileSync(path.join(ROOT, file)).toString("utf8").replace(/\r\n/g, "\n");
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
};

const loadWorks = () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data/works.js"), "utf8"), { window, console: { warn() {}, log() {} } });
    return Array.isArray(window.WORKS) ? window.WORKS : [];
};

const pageOf = (work, redirect) => {
    const title = `${work.title}｜長屋晴太のポートフォリオ`;
    const url = `${SITE}works/${work.id}/`;
    const image = `${SITE}${work.image}`;
    const [width, height] = Array.isArray(work.size) && work.size.length === 2 ? work.size : [1280, 720];
    const target = `../../#work=${work.id}`;
    return `<!DOCTYPE html>
<!-- scripts/work-pages.js が自動で作ったページ（直接書き換えない。data/works.js を直して npm run pages） -->
<html lang="ja" data-work="${escape(work.id)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="noindex">
<title>${escape(title)}</title>
<meta name="description" content="${escape(work.text)}">

<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="長屋晴太 Portfolio">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(work.text)}">
<meta property="og:url" content="${escape(url)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:width" content="${Number(width)}">
<meta property="og:image:height" content="${Number(height)}">
<meta property="og:image:alt" content="${escape(work.alt)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@haru2401game">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(work.text)}">
<meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:image:alt" content="${escape(work.alt)}">

<link rel="icon" type="image/png" sizes="32x32" href="../../images/favicon-32.png">
<script src="../../${redirect}"></script>
<noscript><meta http-equiv="refresh" content="0; url=${escape(target)}"></noscript>
</head>
<body>
<p><a href="${escape(target)}">${escape(work.title)} を見る（長屋晴太のポートフォリオ）</a></p>
</body>
</html>
`;
};

const describe = (work) => {
    const members = Number(work.member) || 1;
    const team = members > 1 ? `${members}人チーム` : "個人制作";
    return `${work.description}（${work.genre}・${team}・${work.period}）長屋晴太（ゲームプログラマー志望）のポートフォリオ。`;
};

const works = [
    ...MAIN_WORKS,
    ...loadWorks().map((work) => ({
        id: idOf(work),
        title: work.title,
        image: work.image,
        size: work.size,
        alt: work.alt,
        text: describe(work),
    })),
];

const redirect = `js/work-redirect.js?v=${hashOf("js/work-redirect.js")}`;
const wanted = new Map(works.filter((work) => work.id).map((work) => [work.id, pageOf(work, redirect)]));
const outdated = [];

// 作る・直す
for (const [id, html] of wanted) {
    const file = path.join(OUT, id, "index.html");
    const now = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
    if (now === html) continue;
    outdated.push(`works/${id}/`);
    if (!check) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, html);
    }
}

// data/works.js から消えた作品のページを消す
if (fs.existsSync(OUT)) {
    for (const name of fs.readdirSync(OUT)) {
        if (wanted.has(name) || !fs.statSync(path.join(OUT, name)).isDirectory()) continue;
        outdated.push(`works/${name}/（消す）`);
        if (!check) fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
    }
}

if (check) {
    if (outdated.length) {
        console.log(`作品ごとのページが古くなっています: ${outdated.slice(0, 5).join(", ")}${outdated.length > 5 ? ` ほか${outdated.length - 5}件` : ""}`);
        console.log("portfolio フォルダで  npm run pages  を実行してください");
        process.exit(1);
    }
    console.log(`作品ごとのページは最新です（${wanted.size}ページ）`);
} else {
    console.log(outdated.length ? `作品ごとのページを更新しました（${outdated.length}件）` : `作品ごとのページは最新です（変更なし・${wanted.size}ページ）`);
}
