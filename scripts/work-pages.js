/* ========================================
   work-pages.js：作品ごとのページ（works/○○/index.html）と sitemap.xml を作る

   ・作品ごとに、画像・説明・ジャンル・制作時期・人数・担当・技術・受賞・遊べるリンクを載せたページを作る
   ・Google の検索結果に出す（作品名や「Unity 2D格闘ゲーム」などで探した人にも見つけてもらう）
   ・X・Discord・LINE などにリンクを貼ると、その作品の画像とタイトルのカードが出る
   ・ページから本体のポートフォリオ（…/portfolio/#work=○○）へは、大きなボタンで案内する

   使い方（portfolio フォルダで）
     npm run assets           … CSS・JS のバージョン番号と一緒に、ページを作り直す（push の前に1回）
     npm run pages            … ページだけ作り直す
     npm run pages -- --check … 古くないか確かめるだけ（自動テストが使う）

   ・Other Works の作品は data/works.js から、Main Works の2本は下の MAIN_WORKS から作る
   ・受賞は data/timeline.js の受賞（quest: "award"）の文に「作品名」があれば、自動で載る
   ・リンク名（○○）の作り方は js/works.js の idOf と同じ（変えるときは両方そろえる）
   ・data/works.js から消した作品のページは、自動で消す
   ・作ったページは直接書き換えない（次に作り直したときに消えるため）
======================================== */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "works");
const SITE = "https://haru2401game.github.io/portfolio/";
const ANALYTICS = "https://portfolio-analytics.haru2401game.workers.dev";
const check = process.argv.includes("--check");

// Main Works（index.html に直接書いてある2本）。タブの id が tab-○○ になっている
const MAIN_WORKS = [
    {
        id: "shishito",
        title: "ししとう",
        image: "images/index/Hero/poster.webp",
        size: [703, 397],
        alt: "ししとうのタイトル画面",
        genre: "2D格闘ゲーム",
        period: "2026/07 ~ 制作中",
        team: "5人チーム",
        member: 5,
        role: "リードプログラマー（プレイヤーシステム・統合）",
        tech: ["Unity", "C#", "Visual Studio", "GitHub"],
        description: "手足（四肢）を回して闘う2D格闘ゲーム。学生チーム対抗ゲームジャムで生まれ、東京ゲームショウ2026 インディーゲームコーナーに出展しました。リードプログラマーとして、ゲームの中心になるプレイヤーシステムを担当しています。",
        award: "東京ゲームショウ2026 インディーゲームコーナー出展・IGDA日本 スカラーシップ",
        play: "https://unityroom.com/games/shishito",
        main: true,
    },
    {
        id: "falien",
        title: "Falien",
        image: "images/index/otherworks/Falien.webp",
        size: [1280, 720],
        alt: "Falienのタイトル画面",
        genre: "2Dアクションゲーム（1〜2人プレイ）",
        period: "2026/09（IGCCゲームジャム・約1週間）",
        team: "7人（6か国の国際チーム）",
        member: 7,
        role: "ジェネラリスト（総合管理・タイトルシーン・統合・ローカライズ）",
        tech: ["Unity", "C#", "GitHub"],
        description: "宇宙人の足を付け替えて研究所から脱出する2Dアクション。6か国・7人の国際チームで約1週間で制作し、IGCCゲームジャムでグランプリを受賞しました。",
        award: "IGCCゲームジャム グランプリ",
        main: true,
    },
];

// js/works.js の idOf と同じ
const idOf = (work) => String(work.id || work.en?.title || work.title || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeTitle = (text) => String(text || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();

const escape = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// JSON-LD の中に </script> が入らないようにする
const jsonLd = (data) => JSON.stringify(data, null, 4).replace(/</g, "\\u003c");

// 改行コード（Windows の CRLF と GitHub の LF）の違いで番号が変わらないようにする（version-assets.js と同じ）
const hashOf = (file) => {
    const text = fs.readFileSync(path.join(ROOT, file)).toString("utf8").replace(/\r\n/g, "\n");
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
};

const load = (file, key) => {
    const window = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), { window, console: { warn() {}, log() {} } });
    return Array.isArray(window[key]) ? window[key] : [];
};

// 受賞：経歴の受賞の文に「作品名」があれば、その文を載せる
const awards = new Map();
for (const item of load("data/timeline.js", "TIMELINE")) {
    if (item.quest !== "award") continue;
    const lines = (Array.isArray(item.text) ? item.text : [item.text]).map(String);
    const sentence = lines.filter((line) => !/^「[^」]+」$/.test(line.trim())).join("・");
    for (const [, name] of lines.join(" ").matchAll(/「([^」]+)」/g)) awards.set(normalizeTitle(name), sentence);
}

const fromData = (work) => {
    const members = Number(work.member) || 1;
    return {
        id: idOf(work),
        title: work.title,
        image: work.image,
        size: work.size,
        alt: work.alt,
        genre: work.genre,
        period: work.period,
        team: members > 1 ? `${members}人チーム` : "個人制作",
        member: members,
        role: work.role,
        tech: work.tech,
        description: work.description,
        point: work.point || "",
        award: awards.get(normalizeTitle(work.title)) || "",
        play: /^https:\/\//i.test(String(work.play || "")) ? String(work.play).trim() : "",
        note: /^https:\/\//i.test(String(work.link || "")) ? String(work.link).trim() : "",
        preview: work.preview || "",
    };
};

const works = [...MAIN_WORKS, ...load("data/works.js", "WORKS").map(fromData)].filter((work) => work.id);

const playLabel = (url) => {
    let host = "";
    try {
        host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
        host = "";
    }
    return host.endsWith("unityroom.com") ? "▶ unityroom で遊ぶ" : host.endsWith("itch.io") ? "▶ itch.io で遊ぶ" : "▶ ブラウザで遊ぶ";
};

const assets = {
    css: `css/work-page.css?v=${hashOf("css/work-page.css")}`,
    page: `js/work-page.js?v=${hashOf("js/work-page.js")}`,
    analytics: `js/analytics.js?v=${hashOf("js/analytics.js")}`,
};

const pageOf = (work, index) => {
    const url = `${SITE}works/${work.id}/`;
    const image = `${SITE}${work.image}`;
    const [width, height] = Array.isArray(work.size) && work.size.length === 2 ? work.size : [1280, 720];
    // 技術：data/works.js は半角スペース区切り。MAIN_WORKS は「Visual Studio」のように空白を含むので配列で書く
    const tech = Array.isArray(work.tech) ? work.tech : String(work.tech || "").split(/\s+/).filter(Boolean);
    const title = `${work.title}（${work.genre}）｜長屋晴太のポートフォリオ`;
    const cardTitle = `${work.title}｜長屋晴太のポートフォリオ`;
    // 文の終わりに「。」などがなければ付ける（説明とポイントがつながって読みにくくならないように）
    const sentence = (text) => (text && !/[。．.！!？?」]$/.test(text.trim()) ? `${text.trim()}。` : text || "");
    const summary = [
        sentence(work.description),
        work.point || "",
        `${work.genre}・${work.team}・${work.period}。担当：${work.role}。`,
        work.award ? `${work.award}。` : "",
        "ゲームプログラマー志望・長屋晴太の作品。",
    ].join(" ").replace(/\s+/g, " ").trim();
    const prev = works[(index - 1 + works.length) % works.length];
    const next = works[(index + 1) % works.length];
    const portfolio = `../../#work=${work.id}`;

    const badges = [
        work.award ? '<span class="is-award">★ AWARD</span>' : "",
        work.member > 1 ? `<span class="is-team">TEAM ×${Number(work.member)}</span>` : "",
        work.play ? '<span class="is-play">▶ PLAYABLE</span>' : "",
    ].join("");

    const data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "VideoGame",
                "@id": `${url}#game`,
                name: work.title,
                url,
                image,
                description: work.description,
                genre: work.genre,
                ...(work.play ? { gamePlatform: "Web browser", sameAs: work.play } : {}),
                author: { "@type": "Person", "@id": `${SITE}#person`, name: "長屋晴太", url: SITE },
                isPartOf: { "@type": "WebSite", "@id": `${SITE}#website`, name: "長屋晴太 Portfolio", url: SITE },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "長屋晴太 Portfolio", item: SITE },
                    { "@type": "ListItem", position: 2, name: work.title, item: url },
                ],
            },
        ],
    };

    return `<!DOCTYPE html>
<!-- scripts/work-pages.js が自動で作ったページ（直接書き換えない。data/works.js を直して npm run assets） -->
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self' ${ANALYTICS}; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${escape(title)}</title>
<meta name="description" content="${escape(summary)}">
<meta name="author" content="長屋晴太（Nagaya Haruta）">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="${escape(url)}">

<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="長屋晴太 Portfolio">
<meta property="og:title" content="${escape(cardTitle)}">
<meta property="og:description" content="${escape(summary)}">
<meta property="og:url" content="${escape(url)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:width" content="${Number(width)}">
<meta property="og:image:height" content="${Number(height)}">
<meta property="og:image:alt" content="${escape(work.alt)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@haru2401game">
<meta name="twitter:title" content="${escape(cardTitle)}">
<meta name="twitter:description" content="${escape(summary)}">
<meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:image:alt" content="${escape(work.alt)}">

<link rel="icon" type="image/png" sizes="32x32" href="../../images/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="../../images/apple-touch-icon.png">
<link rel="stylesheet" href="../../${assets.css}">
<script type="application/ld+json">
${jsonLd(data)}
</script>
</head>
<body>
<a class="wp-skip" href="#main">本文へスキップ</a>

<header class="wp-header">
    <a class="wp-brand" href="../../">
        <img src="../../images/favicon.webp" width="128" height="128" alt="">
        <span>HARUTA NAGAYA<small>GAME PROGRAMMER PORTFOLIO</small></span>
    </a>
    <a class="wp-back" href="../../">ポートフォリオのトップへ</a>
</header>

<main id="main" class="wp-main">
    <ol class="wp-crumbs">
        <li><a href="../../">長屋晴太 Portfolio</a></li>
        <li><a href="../../#${work.main ? "featured-works" : "other-works"}">${work.main ? "Main Works" : "Other Works"}</a></li>
        <li aria-current="page">${escape(work.title)}</li>
    </ol>

    <article class="wp-card${work.award ? " is-rare" : ""}">
        <figure class="wp-media">
            <div class="wp-badges" aria-hidden="true">${badges}</div>
            <img src="../../${escape(work.image)}" width="${Number(width)}" height="${Number(height)}" alt="${escape(work.alt)}" fetchpriority="high">
${work.preview ? `            <video data-src="../../${escape(work.preview)}" muted loop playsinline preload="none" aria-hidden="true" hidden></video>\n` : ""}        </figure>

        <div class="wp-info">
            <p class="wp-kicker">GAME WORKS ／ 長屋晴太の作品</p>
            <h1>${escape(work.title)}</h1>
            <p class="wp-genre">${escape(work.genre)}</p>
${work.award ? `            <p class="wp-award">🏆 ${escape(work.award)}</p>\n` : ""}            <p class="wp-desc">${escape(work.description)}</p>
${work.point ? `            <div class="wp-point">\n                <p class="wp-point-label">TECH POINT（技術のポイント）</p>\n                <p>${escape(work.point)}</p>\n            </div>\n` : ""}
            <dl class="wp-stats">
                <div><dt>DATE（制作時期）</dt><dd>${escape(work.period)}</dd></div>
                <div><dt>TEAM（人数）</dt><dd>${escape(work.team)}</dd></div>
                <div class="is-wide"><dt>ROLE（担当）</dt><dd>${escape(work.role)}</dd></div>
                <div class="is-wide"><dt>TOOLS（使った技術）</dt><dd>${tech.map(escape).join(" ／ ")}</dd></div>
            </dl>

            <div class="wp-actions">
${work.play ? `                <a class="wp-button is-play featured-play" href="${escape(work.play)}" target="_blank" rel="noopener noreferrer" data-title="${escape(work.title)}">${playLabel(work.play)}</a>\n` : ""}${work.note ? `                <a class="wp-button is-note" href="${escape(work.note)}" target="_blank" rel="noopener noreferrer">noteで制作記録を読む</a>\n` : ""}                <a class="wp-button is-portfolio" href="${portfolio}">ポートフォリオでこの作品を見る</a>
            </div>
        </div>
    </article>

    <nav class="wp-pager" aria-label="ほかの作品">
        <a class="is-prev" href="../${escape(prev.id)}/"><small>← 前の作品</small><b>${escape(prev.title)}</b></a>
        <a class="is-next" href="../${escape(next.id)}/"><small>次の作品 →</small><b>${escape(next.title)}</b></a>
    </nav>

    <section class="wp-author" aria-labelledby="author-title">
        <div>
            <h2 id="author-title">作った人：長屋晴太（はる）</h2>
            <p>ゲームプログラマー志望（2028年卒）。Unity・C#・C++ でゲームを作っています。IGCCゲームジャム グランプリ「Falien」、東京ゲームショウ2026出展「ししとう」など、${works.length}作品をゲームのように遊べるポートフォリオにまとめています。</p>
        </div>
        <a class="wp-button is-portfolio" href="../../">ポートフォリオを見る ▶</a>
    </section>
</main>

<footer class="wp-footer">© 2026 HARUTA NAGAYA</footer>

<script src="../../${assets.analytics}"></script>
<script src="../../${assets.page}"></script>
</body>
</html>
`;
};

const outdated = [];
const write = (file, text, label) => {
    const now = fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
    if (now === text) return;
    outdated.push(label);
    if (!check) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
    }
};

// 作る・直す
const wanted = new Set();
works.forEach((work, index) => {
    wanted.add(work.id);
    write(path.join(OUT, work.id, "index.html"), pageOf(work, index), `works/${work.id}/`);
});

// data/works.js から消えた作品のページを消す
if (fs.existsSync(OUT)) {
    for (const name of fs.readdirSync(OUT)) {
        if (wanted.has(name) || !fs.statSync(path.join(OUT, name)).isDirectory()) continue;
        outdated.push(`works/${name}/（消す）`);
        if (!check) fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
    }
}

// sitemap.xml：トップ（更新日はそのまま）＋作品ごとのページ
const sitemapFile = path.join(ROOT, "sitemap.xml");
const oldSitemap = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, "utf8") : "";
const topModified = (oldSitemap.match(new RegExp(`<loc>${SITE.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}</loc>\\s*<lastmod>([^<]+)</lastmod>`)) || [])[1] || "";
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 検索エンジン向けのページ一覧（scripts/work-pages.js が作る。トップの更新日 lastmod は、大きく更新したら書き換える） -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${SITE}</loc>${topModified ? `\n        <lastmod>${topModified}</lastmod>` : ""}
    </url>
${works.map((work) => `    <url>\n        <loc>${SITE}works/${work.id}/</loc>\n    </url>`).join("\n")}
</urlset>
`;
write(sitemapFile, sitemap, "sitemap.xml");

if (check) {
    if (outdated.length) {
        console.log(`作品ごとのページが古くなっています: ${outdated.slice(0, 5).join(", ")}${outdated.length > 5 ? ` ほか${outdated.length - 5}件` : ""}`);
        console.log("portfolio フォルダで  npm run assets  を実行してください");
        process.exit(1);
    }
    console.log(`作品ごとのページは最新です（${wanted.size}ページ）`);
} else {
    console.log(outdated.length ? `作品ごとのページを更新しました（${outdated.length}件）` : `作品ごとのページは最新です（変更なし・${wanted.size}ページ）`);
}
