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
   ・スクリーンショット：images/works/○○/shot-1.webp 〜 shot-3.webp があれば「SCREENSHOTS」として並べる（○○ はリンク名）
   ・関連作品：使った技術・2D/3D・チームかどうかが近い作品を3つ、自動で選んで並べる
   ・学んだこと：data/works.js に learned を書いた作品だけ「LEARNED（学んだこと）」を出す
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
        // ここから下は代表作だけ（トップの「技術の見どころ」と同じ内容）
        movie: { src: "videos/index/Shishito.mp4", poster: "images/index/Hero/poster.webp", label: "プレイ映像（15秒・音声あり）" },
        lead: "リードプログラマー・チームリーダーとして、ゲームの中心になるプレイヤーシステムを担当しました。",
        points: [
            {
                title: "四肢を回してキャラクターを操作するプレイヤーシステム",
                problem: "実装初期は Transform の Rotation で四肢を回していましたが、地面を押す力が足りず、画面の動きが小さく、キャラクターの動きも激しくなりませんでした。",
                solution: "回転の仕組みを Rigidbody の AddForce で特定の方向に力を加える方式に変更。回した手足で壁や床を強く押せるようになり、画面とキャラクターの激しい動きを表現できました。",
                result: "手足を回すたびにキャラクターが大きく暴れる、見ていても笑える格闘ゲームになりました。ゲームジャムでは多くの方に笑ってもらえ、その後、東京ゲームショウ2026にも出展しました。",
            },
        ],
        teamDetail: "5人（プログラマー3・プランナー1・デザイナー1）※初期メンバー",
        implemented: ["プレイヤーシステム", "ロゴシーン", "タイトルシーン", "モードセレクト", "キャラクター選択", "リザルト", "プロジェクト統合"],
        workflow: ["メンバーごとにブランチを作成", "1つのタスクが完了した段階で main ブランチへコミット", "適宜プロジェクトを統合"],
        results: ["「学生チーム対抗ゲームジャム」で制作し、多くの方に笑ってもらえた", "IGDA日本 スカラーシップ合格", "東京ゲームショウ2026 インディーゲームコーナーに出展"],
        photos: [
            ["images/index/FeaturedWorks/gallery/gamejam.webp", "学生チーム対抗ゲームジャムで、チームで「ししとう」を制作している様子", "ゲームジャムでの制作風景"],
            ["images/index/FeaturedWorks/gallery/tgs2026.webp", "東京ゲームショウ2026のIGDA日本ブースで、「ししとう」のチラシを持つチームメンバー", "TGS 2026 出展"],
        ],
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
        movie: { src: "videos/index/Falien.mp4", poster: "images/index/otherworks/Falien.webp", label: "プレイ映像（2分54秒・音声あり）" },
        lead: "ジェネラリスト（総合管理）として、タイトルシーンの制作、各シーンの結合、3言語のローカライズを担当しました。",
        points: [
            {
                title: "パーツを分けて動かすタイトルシーン",
                problem: "タイトル画面を1枚絵で作ると、背景もキャラクターも一緒に固定され、画面に動きを付けることができませんでした。",
                solution: "背景の集中線とキャラクターを1枚絵から切り離し、それぞれ別のUIとして配置。パーツごとにアニメーションを付けられるようにしました。",
                result: "背景とキャラクターが別々に動く、ゲームを始める前からゲームの勢いが伝わるタイトル画面になりました。",
            },
            {
                title: "自作フォントを使った3言語のローカライズ",
                problem: "国際チームのため日本語・英語・フランス語に対応したかったものの、既存のフォントでは言語によって対応していない文字がありました。",
                solution: "チームメンバーが自作したフォントを使い、3言語に対応するローカライズ処理を実装。翻訳で長くなる文章も、画面上で自然に見えるように調整しました。",
                result: "ゲームの雰囲気に合ったフォントのまま、日本語・英語・フランス語の3言語で遊べるゲームになりました。",
            },
        ],
        teamDetail: "7人・6か国（日本・タイ・台湾・フィンランド・フランス・シンガポール）",
        implemented: ["タイトルシーン", "各シーンの結合", "ローカライズ（日・英・仏）"],
        workflow: ["英語でのやりとりを、画像・動画・プレイ映像で補って共有", "進捗・完了した作業・次の作業を GitHub と Discord で共有", "「何を作らないか」を決め、まず遊べる形を優先"],
        quote: ["ゲームジャムの目的をよく理解している。PV動画やプレイ映像など、見ている人が笑えるゲームデザインですごく良い。", "IGCC 表彰式での講評より"],
        photos: [
            ["images/index/FeaturedWorks/falien/team.webp", "IGCCの会場で、「Falien」の展示ブースの前でポーズをとるチームメンバー", "チームでのブース展示"],
            ["images/index/FeaturedWorks/falien/exhibit.webp", "IGCCの会場で、「Falien」をノートPCで展示している様子", "会場での展示"],
        ],
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
        learned: String(work.learned || "").trim(),
    };
};

const works = [...MAIN_WORKS, ...load("data/works.js", "WORKS").map(fromData)].filter((work) => work.id);

// スクリーンショット（images/works/○○/shot-1.webp 〜 shot-3.webp。あるものだけ）
const shotsOf = (work) => [1, 2, 3].map((n) => `images/works/${work.id}/shot-${n}.webp`).filter((file) => fs.existsSync(path.join(ROOT, file)));

// 関連作品：技術・2D/3D・チームかどうかが近いものから3つ（同じくらいなら、制作時期が近いもの）
const techSet = (work) => new Set((Array.isArray(work.tech) ? work.tech : String(work.tech || "").split(/\s+/)).map((t) => t.toLowerCase()).filter((t) => t && t !== "github" && !t.startsWith("visual")));
const dimOf = (work) => (/3D/.test(work.genre) ? "3d" : "2d");
const periodNum = (work) => Number(String(work.period).replace(/[^0-9]/g, "").slice(0, 6)) || 0;
const relatedOf = (work) => {
    const mine = techSet(work);
    return works
        .filter((other) => other.id !== work.id)
        .map((other) => {
            const shared = [...techSet(other)].filter((t) => mine.has(t)).length;
            const score = shared * 3 + (dimOf(other) === dimOf(work) ? 2 : 0) + ((other.member > 1) === (work.member > 1) ? 1 : 0) + (other.main ? 1 : 0);
            return { other, score, gap: Math.abs(periodNum(other) - periodNum(work)) };
        })
        .sort((a, b) => b.score - a.score || a.gap - b.gap)
        .slice(0, 3)
        .map(({ other }) => other);
};

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
    cssNew: `css/work-next.css?v=${hashOf("css/work-next.css")}`,
    look: `js/look.js?v=${hashOf("js/look.js")}`,
    page: `js/work-page.js?v=${hashOf("js/work-page.js")}`,
    analytics: `js/analytics.js?v=${hashOf("js/analytics.js")}`,
};

// 代表作の「技術の見どころ」・プレイ映像・写真、全作品のスクリーンショット・学んだこと
const sectionsOf = (work) => {
    const out = [];
    if (work.movie) {
        out.push(`
    <section class="wp-section wp-movie" aria-labelledby="movie-title">
        <h2 class="wp-h2" id="movie-title"><span>MOVIE</span>${escape(work.movie.label)}</h2>
        <video controls preload="none" playsinline poster="../../${escape(work.movie.poster)}" src="../../${escape(work.movie.src)}" aria-label="${escape(work.title)}のプレイ映像"></video>
    </section>`);
    }
    if (work.points) {
        const points = work.points.map((point, i) => `
            <article class="wp-dev-point">
                <h3><span>POINT ${String(i + 1).padStart(2, "0")}</span>${escape(point.title)}</h3>
                <div class="wp-psr">
                    <div><b>課題</b><p>${escape(point.problem)}</p></div>
                    <div><b>解決</b><p>${escape(point.solution)}</p></div>
                    <div><b>結果</b><p>${escape(point.result)}</p></div>
                </div>
            </article>`).join("");
        const list = (items) => `<ul class="wp-list">${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`;
        out.push(`
    <section class="wp-section wp-dev" aria-labelledby="dev-title">
        <h2 class="wp-h2" id="dev-title"><span>DEVELOPMENT</span>技術の見どころ</h2>
        <p class="wp-lead">${escape(work.lead)}</p>${points}
        <div class="wp-team">
            <div>
                <h3 class="wp-h3">TEAM ／ チーム構成と担当</h3>
                <p>${escape(work.teamDetail)}</p>
                <h3 class="wp-h3">自分で実装した部分</h3>
                <ul class="wp-tags">${work.implemented.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
            </div>
            <div>
                <h3 class="wp-h3">TOOLS &amp; WORKFLOW ／ チーム開発</h3>
                ${list(work.workflow)}
${work.results ? `                <h3 class="wp-h3">RESULTS ／ 成果</h3>\n                ${list(work.results)}\n` : ""}${work.quote ? `                <blockquote class="wp-quote"><p>${escape(work.quote[0])}</p><cite>${escape(work.quote[1])}</cite></blockquote>\n` : ""}            </div>
        </div>
        <ul class="wp-photos">${work.photos.map(([src, alt, caption]) => `<li><figure><img src="../../${escape(src)}" alt="${escape(alt)}" loading="lazy"><figcaption>${escape(caption)}</figcaption></figure></li>`).join("")}</ul>
    </section>`);
    }
    const shots = shotsOf(work);
    if (shots.length) {
        out.push(`
    <section class="wp-section wp-shots" aria-labelledby="shots-title">
        <h2 class="wp-h2" id="shots-title"><span>SCREENSHOTS</span>ゲーム画面</h2>
        <ul class="wp-shot-list">${shots.map((src, i) => `<li><a href="../../${escape(src)}" target="_blank" rel="noopener"><img src="../../${escape(src)}" alt="${escape(work.title)}のゲーム画面 ${i + 1}" loading="lazy"></a></li>`).join("")}</ul>
    </section>`);
    }
    if (work.learned) {
        out.push(`
    <section class="wp-section wp-learned" aria-labelledby="learned-title">
        <h2 class="wp-h2" id="learned-title"><span>LEARNED</span>この作品で学んだこと</h2>
        <p>${escape(work.learned)}</p>
    </section>`);
    }
    return out.join("\n");
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
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self' ${ANALYTICS}; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests">
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
<script src="../../${assets.look}"></script>
<link rel="stylesheet" href="../../${assets.css}">
<link rel="stylesheet" href="../../${assets.cssNew}">
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
${sectionsOf(work)}
    <nav class="wp-pager" aria-label="ほかの作品">
        <a class="is-prev" href="../${escape(prev.id)}/"><small>← 前の作品</small><b>${escape(prev.title)}</b></a>
        <a class="is-next" href="../${escape(next.id)}/"><small>次の作品 →</small><b>${escape(next.title)}</b></a>
    </nav>

    <section class="wp-section wp-related" aria-labelledby="related-title">
        <h2 class="wp-h2" id="related-title"><span>RELATED</span>関連する作品</h2>
        <ul class="wp-related-list">
${relatedOf(work).map((other) => `            <li><a href="../${escape(other.id)}/"><img src="../../${escape(other.image)}" width="320" height="180" alt="" loading="lazy"><span><small>${escape(other.genre)}</small><b>${escape(other.title)}</b></span></a></li>`).join("\n")}
        </ul>
    </section>

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
