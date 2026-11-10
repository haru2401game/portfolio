/* ========================================
   launch-next.js：新デザイン（next/）を本番のトップページに切り替える

   使い方（portfolio フォルダで）
     npm run launch                      … 切り替える（このあと  npm run assets  → テスト → push）
     node scripts/launch-next.js --check … 切り替えられる状態か確かめるだけ（何も書き換えない。自動テストが使う）

   切り替えでやること
     1. next/index.html から、<!--beta--> 〜 <!--/beta--> で囲んだ部分（BETA の帯・検索に出さない設定など）を消す
     2. 住所を本番用に直す（../images/… → images/…、data-base="../" → data-base=""）
     3. できたページを index.html（トップ）に上書きする
     4. next/css・next/js のファイルを css/・js/ にコピーする
     5. next/index.html は「トップへ移動しました」のページにする（BETA の住所を知っている人のため）
     6. 今のデザイン用のテスト（tests/cases/2〜4）を tests/classic/ にしまう（新デザインは 5-next.mjs が確かめる）
     7. 今のトップページを classic.html として残す（OPTIONS の「デザイン」・フッターから切り替えられる。検索には出さない）
     8. 作品ごとのページ・404 の「何も選んでいない人に見せるデザイン」を新デザインにする（js/look.js）

   元に戻すとき：切り替えたコミットを  git revert  する（前のトップページは Git の履歴に残っている）
======================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NEXT = path.join(ROOT, "next");
const check = process.argv.includes("--check");
const problems = [];

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);

const source = path.join(NEXT, "index.html");
if (!exists(source)) {
    console.log("next/index.html がありません（もう切り替え済みかもしれません）");
    process.exit(check ? 0 : 1);
}
const html = read(source);
if (html.includes('data-launched="1"')) {
    console.log("next/ はもう本番に切り替え済みです（移動のお知らせページになっています）");
    process.exit(0);
}

/* ---------- 1. BETA の部分を消す ---------- */

const opens = (html.match(/<!--beta-->/g) || []).length;
const closes = (html.match(/<!--\/beta-->/g) || []).length;
if (opens !== closes) problems.push(`<!--beta--> と <!--/beta--> の数が合いません（${opens} と ${closes}）`);
let page = html.replace(/<!--beta-->[\s\S]*?<!--\/beta-->\n?/g, "");
if (/beta-bar|noindex/.test(page)) problems.push("BETA の帯か noindex が残っています（<!--beta--> で囲まれていない）");

/* ---------- 2. 住所を本番用に ---------- */

// 切り替え先（クラシック）の住所：BETA では "../"（トップ）→ 本番では classic.html
if (!/<meta name="pa-design-classic" content="\.\.\/">/.test(page)) problems.push('新デザインに <meta name="pa-design-classic" content="../"> がありません');
page = page.replace('<meta name="pa-design-classic" content="../">', '<meta name="pa-design-classic" content="classic.html">');

// 今のトップ → classic.html（同じフォルダに置くので、ファイルの住所はそのまま使える）
const currentTop = read(path.join(ROOT, "index.html"));
if (!/<meta name="pa-design-new" content="next\/">/.test(currentTop)) problems.push('今のトップに <meta name="pa-design-new" content="next/"> がありません');
const classic = currentTop
    .replace('<meta name="pa-design-new" content="next/">', '<meta name="pa-design-new" content="./">')
    .replace(/(<meta charset="UTF-8">)/i, '$1\n<meta name="robots" content="noindex">')
    .replace(/href="next\/" data-design-link/g, 'href="./" data-design-link');

page = page
    .replace('data-base="../"', 'data-base=""')
    // ../images/… ../videos/… ../data/… ../js/… など（href・src・poster・data-○○ の中）
    .replace(/(=\s*")\.\.\/(?!\.)/g, "$1");

// トップから見て、読み込むファイルが全部あるか
const LOCAL = /\s(?:src|href|poster|data-src|data-src-small|data-video|data-photo)="([^"#:][^"]*)"/g;
const COPIES = [];
for (const dir of ["css", "js"]) {
    const from = path.join(NEXT, dir);
    if (!exists(from)) continue;
    for (const name of fs.readdirSync(from)) COPIES.push([path.join(from, name), path.join(ROOT, dir, name)]);
}
const willExist = new Set(COPIES.map(([, to]) => path.relative(ROOT, to).replace(/\\/g, "/")));
for (const [, url] of page.matchAll(LOCAL)) {
    const file = url.split(/[?#]/)[0];
    if (!file || /^[a-z][a-z0-9+.-]*:/i.test(file)) continue; // https: mailto: data: など、外の住所は対象外
    const target = file.endsWith("/") ? `${file}index.html` : file;
    if (!exists(path.join(ROOT, target)) && !willExist.has(target)) problems.push(`本番のトップから見つからないファイル: ${url}`);
}

// 今のトップにだけある古いファイル名と、ぶつからないか
for (const [from, to] of COPIES) {
    if (exists(to) && read(to) !== read(from) && !/next|motion|boot/.test(path.basename(to))) {
        problems.push(`同じ名前のファイルがすでにあります: ${path.relative(ROOT, to)}`);
    }
}

const LOOK = path.join(ROOT, "js", "look.js");
if (!exists(LOOK) || !read(LOOK).includes('const DEFAULT = "classic";')) problems.push('js/look.js に const DEFAULT = "classic"; がありません');

if (problems.length) {
    console.log("本番に切り替えられません:");
    problems.forEach((problem) => console.log(`  - ${problem}`));
    process.exit(1);
}

if (check) {
    console.log("本番に切り替えられる状態です（npm run launch で切り替え）");
    process.exit(0);
}

/* ---------- 3〜5. 書き込む ---------- */

fs.writeFileSync(path.join(ROOT, "classic.html"), classic);
fs.writeFileSync(path.join(ROOT, "index.html"), page);
for (const [from, to] of COPIES) fs.copyFileSync(from, to);
fs.writeFileSync(LOOK, read(LOOK).replace('const DEFAULT = "classic";', 'const DEFAULT = "new";'));

fs.writeFileSync(source, `<!DOCTYPE html>
<html lang="ja" data-launched="1">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=../">
<link rel="canonical" href="https://haru2401game.github.io/portfolio/">
<title>トップページへ移動しました｜長屋晴太 Portfolio</title>
</head>
<body>
<p>新しいデザインは、トップページになりました。<a href="../">トップページへ</a></p>
</body>
</html>
`);
for (const dir of ["css", "js"]) {
    const folder = path.join(NEXT, dir);
    if (exists(folder)) fs.rmSync(folder, { recursive: true });
}

// 今のデザイン用の自動テスト（2〜4）は、トップの中身が変わると合わなくなるので tests/classic/ にしまう
// （新デザインのテストは tests/cases/5-next.mjs。切り替えたあとはトップを確かめる）
const CLASSIC_TESTS = ["2-page.mjs", "3-a11y.mjs", "4-controls.mjs"];
const casesDir = path.join(ROOT, "tests", "cases");
const classicDir = path.join(ROOT, "tests", "classic");
for (const name of CLASSIC_TESTS) {
    const from = path.join(casesDir, name);
    if (!exists(from)) continue;
    fs.mkdirSync(classicDir, { recursive: true });
    fs.renameSync(from, path.join(classicDir, name));
}

console.log("新デザインをトップページに切り替えました。");
console.log("続けて  npm run assets  →  npm test  を実行してから push してください。");
console.log("アクセス解析（portfolio-analytics）の src/index.js の MAIN_DESIGN も \"new\" に変えて push してください（セクション一覧の並び順のため）。");
