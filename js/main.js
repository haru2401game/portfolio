/* ========================================
   main.js：ポートフォリオの基本の動き

   ・ページの数字や作品情報は、できるだけ HTML から自動で数える
     （作品・経歴を追加すれば、数字やバッジも自動で増える）
   ・遊びの仕掛け（図鑑・トロフィーなど）は play.js、アクセス解析は analytics.js
======================================== */

/* ========================================
   共通の道具
======================================== */

const root = document.documentElement;
root.classList.add("js-enabled");

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

// ブラウザへの保存（プライベートモードなどで使えなくても止まらないように）
const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* 保存できなくても、この訪問のあいだは動く */
        }
    },
};

// JSON で保存・読み出し（play.js の図鑑・トロフィーなどでも使う）
function jsonStore(area) {
    return {
        get(key, fallback) {
            try {
                return JSON.parse(area().getItem(key)) ?? fallback;
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                area().setItem(key, JSON.stringify(value));
            } catch {
                /* 保存できなくても動く */
            }
        },
    };
}
const localData = jsonStore(() => localStorage);
const sessionData = jsonStore(() => sessionStorage);

// アニメーションの強さ（設定画面で選ぶ。<html> のクラスで判断する）
//   なし（motion-off）：すべて止める ／ 軽量（motion-lite）：常に動いている飾りだけ止める
const motionOff = () => root.classList.contains("motion-off");
const liteMotion = () => motionOff() || root.classList.contains("motion-lite");
const reduceMotion = () => motionOff();
const scrollBehavior = () => (reduceMotion() ? "auto" : "smooth");

// 隠し要素などの出来事をアクセス解析（analytics.js）とトロフィー（play.js）に知らせる
const emitPlayEvent = (name) => document.dispatchEvent(new CustomEvent("play:event", { detail: { name } }));

const textOf = (parent, selector) => (parent.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();

function make(tag, className = "", text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

// 飾りの要素（読み上げソフトには読ませない）
function decor(element) {
    element.setAttribute("aria-hidden", "true");
    return element;
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
}

// 背景の暗いところを押したら閉じる（写真・作品のポップアップ共通）
function closeOnBackdrop(dialog) {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
}

/* ---------- ページから数える数字（Achievements・ステータス・エンディングで共通） ---------- */

// 作品数 = Other Works のカード + Main Works の作品
const countWorks = () =>
    document.querySelectorAll(".work-card").length + document.querySelectorAll(".featured-container[data-work]").length;

// 受賞数 = 経歴で data-quest="award" が付いたもの
const countAwards = () => document.querySelectorAll('.timeline-item[data-quest="award"]').length;

// 開発歴（年目）= 経歴のいちばん古い日付（例 2025.04）から今日まで、切り上げ
function careerYears() {
    const months = Array.from(document.querySelectorAll(".timeline-date"))
        .map((date) => date.textContent.trim().match(/^(\d{4})\.(\d{1,2})/))
        .filter(Boolean)
        .map(([, year, month]) => Number(year) * 12 + Number(month) - 1);
    if (!months.length) return null;
    const now = new Date();
    const elapsed = now.getFullYear() * 12 + now.getMonth() - Math.min(...months);
    return Math.max(1, Math.ceil((elapsed + 1) / 12));
}

/* ---------- スクロールで表示（.show を付ける） ---------- */

function observeShow(elements, callback = null) {
    const list = Array.from(elements || []).filter(Boolean);
    if (!list.length) return;

    if (!("IntersectionObserver" in window)) {
        list.forEach((element) => {
            element.classList.add("show");
            callback?.(element);
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("show");
            callback?.(entry.target);
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.05 });

    list.forEach((element) => observer.observe(element));
}

// 並んだカードを少しずつ時間差で表示する
function revealInOrder(elements, step, callback) {
    if (step) {
        elements.forEach((element, index) => {
            element.style.transitionDelay = `${index * step}s`;
        });
    }
    observeShow(elements, callback);
}

// 開け閉めする引き出し（Other Works・これまでのクエスト共通）
function bindDrawer(drawer, toggle) {
    drawer.addEventListener("transitionend", (event) => {
        if (event.target === drawer && drawer.classList.contains("is-open")) {
            drawer.classList.add("is-settled");
        }
    });

    return (open) => {
        drawer.classList.toggle("is-open", open);
        drawer.classList.remove("is-settled");
        drawer.inert = !open;
        toggle.setAttribute("aria-expanded", String(open));
        if (open && prefersReducedMotion) drawer.classList.add("is-settled");
    };
}

/* ========================================
   設定（OPTIONS）：アニメーションの強さ・音量・言語
   ・保存先は localStorage の pa-settings（見ている人のブラウザだけ）
   ・アニメーションと言語は、settings-boot.js がページを描く前に <html> へ反映している
======================================== */

const SETTINGS_KEY = "pa-settings";
const MOTION_LEVELS = ["default", "lite", "none"];
const DEFAULT_VOLUME = 70;

const defaultSettings = () => ({
    motion: prefersReducedMotion ? "none" : "default",
    volume: DEFAULT_VOLUME,
    muted: false,
    sfx: "off",
    lang: "ja",
});

const settings = (() => {
    const saved = localData.get(SETTINGS_KEY, {}) || {};
    const volume = Number(saved.volume);
    return {
        // 保存が無いときは settings-boot.js が決めたクラス（以前の MOTION OFF・端末の設定）に合わせる
        motion: MOTION_LEVELS.includes(saved.motion) ? saved.motion : motionOff() ? "none" : "default",
        volume: Number.isFinite(volume) ? Math.min(100, Math.max(0, Math.round(volume))) : DEFAULT_VOLUME,
        muted: saved.muted === true,
        // 効果音は、急に音が鳴らないように最初は OFF
        sfx: saved.sfx === "on" ? "on" : "off",
        lang: saved.lang === "en" ? "en" : "ja",
    };
})();

const saveSettings = () => localData.set(SETTINGS_KEY, settings);

// 動画の音量（作品の動画は、作ったときと設定を変えたときにこれを通す）
function applyVolume(video) {
    if (!video || video.classList.contains("hero-video")) return;
    video.volume = settings.volume / 100;
    video.muted = settings.muted || settings.volume === 0;
}

/* ========================================
   トップ（ヒーロー）
======================================== */

const heroVideo = document.querySelector(".hero-video");
// 通信量を抑える設定（データセーバー）の人には、動画を流さず画像のままにする
const saveData = Boolean(navigator.connection?.saveData);
if (heroVideo) {
    // スマホなど画面が小さいときは、軽い動画（480p）を使う
    if (heroVideo.dataset.srcSmall && window.matchMedia("(max-width: 768px)").matches) {
        heroVideo.src = heroVideo.dataset.srcSmall;
    }
    if (!motionOff() && !saveData) heroVideo.play().catch(() => {});
}

// トップの動画を止める・流すボタン（ずっと動いているものは、見る人が止められるように）
let heroPausedByUser = false;
const heroScreen = heroVideo?.closest(".hero-screen");
if (heroScreen && !saveData) {
    const pause = make("button", "hero-pause");
    pause.type = "button";
    const icon = decor(make("span", "hero-pause-icon"));
    pause.append(icon);
    const sync = () => {
        pause.setAttribute("aria-pressed", String(heroPausedByUser));
        pause.setAttribute("aria-label", heroPausedByUser ? "背景の動画を再生" : "背景の動画を一時停止");
        icon.textContent = heroPausedByUser ? "▶" : "❚❚";
    };
    pause.addEventListener("click", () => {
        heroPausedByUser = !heroPausedByUser;
        if (heroPausedByUser) heroVideo.pause();
        else heroVideo.play().catch(() => {});
        sync();
    });
    sync();
    heroScreen.append(pause);
}

window.addEventListener("DOMContentLoaded", () => {
    const heroText = document.querySelector(".hero-content");
    if (heroText) setTimeout(() => heroText.classList.add("is-visible"), 300);
});

/* ========================================
   スクロールで表示するもの
======================================== */

revealInOrder(document.querySelectorAll(".achievement-card"), 0.08, (card) => {
    const value = card.querySelector(".achievement-value[data-value]");
    if (value) animateCount(value);
});
revealInOrder(document.querySelectorAll(".about-container"));
revealInOrder(document.querySelectorAll(".can-do-card"), 0.05);
revealInOrder(document.querySelectorAll(".featured-video, .featured-container"));
revealInOrder(document.querySelectorAll(".work-card"), 0.01);
revealInOrder(document.querySelectorAll(".blog-introduction"), 0, (intro) => {
    const counter = intro.querySelector("#article-count[data-value]");
    if (counter) animateCount(counter);
    startTypewriter(intro.querySelector(".blog-message"));
});
revealInOrder(document.querySelectorAll(".timeline-item"), 0.05);
revealInOrder(document.querySelectorAll(".play-card"), 0.05);
revealInOrder(document.querySelectorAll(".contact-container"));
revealInOrder(document.querySelectorAll(".sns-card"), 0.05);

/* ========================================
   Main Works の動画：最初は画像。押したら動画に入れ替えて再生する
   （ページを開いただけでは動画を読み込まないので、スマホの通信量が少なくて済む）
======================================== */

document.querySelectorAll(".featured-video[data-video]").forEach((box) => {
    const button = box.querySelector(".movie-play");
    if (!button) return;

    button.addEventListener("click", () => {
        const poster = button.querySelector("img");
        const video = make("video");
        video.src = box.dataset.video;
        video.poster = poster?.currentSrc || poster?.src || "";
        video.controls = true;
        video.playsInline = true;
        video.preload = "auto";
        applyVolume(video);
        // 音声のない短いプレイ映像はくり返し再生する
        if (box.hasAttribute("data-loop")) {
            video.loop = true;
            video.muted = true;
        }
        video.setAttribute("aria-label", `${box.dataset.title || ""}の映像`);

        button.replaceWith(video);
        box.classList.add("is-playing");
        video.play().catch(() => {});
        video.focus({ preventScroll: true });
    });
});

// アニメーションを「なし」にしたとき・戻したときのトップの動画
function syncVideos(off) {
    if (!heroVideo || saveData) return;
    if (off || heroPausedByUser) heroVideo.pause();
    else if (isInViewport(heroVideo)) heroVideo.play().catch(() => {});
}

/* ========================================
   数字のカウントアップと EXP ゲージ
======================================== */

function nextMilestone(value) {
    if (value < 5) return 5;
    if (value < 10) return 10;
    if (value < 50) return (Math.floor(value / 10) + 1) * 10;
    if (value < 100) return (Math.floor(value / 25) + 1) * 25;
    return (Math.floor(value / 50) + 1) * 50;
}

function animateCount(element) {
    const target = Number(element.dataset.value);
    if (!Number.isFinite(target)) return;

    const suffix = element.dataset.suffix || "";
    if (motionOff() || target === 0) {
        element.textContent = target + suffix;
        return;
    }

    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased) + suffix;
        if (progress >= 1) element.classList.add("is-counted");
        else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// 「次の目標」までのゲージ（Achievements と Blog で共通）
function makeExpMeter(className, nextClassName, number) {
    const meter = decor(make("div", className));
    const gauge = make("div", "stat-gauge");
    gauge.append(make("span"));
    meter.append(gauge, make("span", nextClassName));
    updateExpMeter(meter, nextClassName, number);
    return meter;
}

function updateExpMeter(meter, nextClassName, number) {
    const milestone = nextMilestone(number);
    meter.style.setProperty("--fill", (number / milestone).toFixed(3));
    meter.querySelector(`.${nextClassName}`).textContent = `NEXT ${milestone}`;
}

// Achievements の数字を入れる（カードが表示されたらカウントアップ）
function setStat(element, value) {
    const number = Number(value);
    if (!element || !Number.isFinite(number)) return;

    element.dataset.value = number;

    const card = element.closest(".achievement-card");
    // 目標のない数字（インターン・開発歴）は、ゲージ（NEXT ○）を付けない
    if (card && !card.hasAttribute("data-no-meter")) {
        const meter = card.querySelector(".stat-meter");
        if (meter) updateExpMeter(meter, "stat-next", number);
        else card.append(makeExpMeter("stat-meter", "stat-next", number));
    }

    if (!card || card.classList.contains("show")) animateCount(element);
    else element.textContent = "0";
}

// Blog の記事数（「270+」の形）
function setBlogCount(element, value) {
    const number = Number(value);
    if (!element || !Number.isFinite(number)) return;

    element.dataset.value = number;
    element.dataset.suffix = "+";

    const stat = element.closest(".blog-stat");
    if (stat && !stat.querySelector(".blog-exp")) stat.append(makeExpMeter("blog-exp", "blog-exp-next", number));

    const intro = element.closest(".blog-introduction");
    if (!intro || intro.classList.contains("show")) animateCount(element);
    else element.textContent = "0+";
}

/* ========================================
   データの読み込み（blog.json / profile.json）
======================================== */

function loadJson(url, fallback) {
    return fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`${url} の読み込みに失敗しました。`);
            return response.json();
        })
        .catch((error) => {
            if (fallback !== undefined) return fallback;
            throw error;
        });
}

function safeWebUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

/* ---------- Blog：最新記事 ---------- */

const latestArticles = document.getElementById("latestArticles");

function buildArticleCard(article, index) {
    const title = String(article.title || "");
    const imageUrl = safeWebUrl(article.thumbnail);
    const articleUrl = safeWebUrl(article.url);

    const card = make("article", "article-card");

    // 画像が無い・読み込めないときは HARU GAMES のロゴを代わりに出す
    const image = make("img");
    const useFallback = () => {
        image.classList.add("is-fallback");
        image.src = "images/index/Blog/icon.webp";
    };
    image.addEventListener("error", useFallback, { once: true });
    if (imageUrl) image.src = imageUrl;
    else useFallback();
    image.alt = title;
    image.loading = "lazy";

    const content = make("div", "article-content");
    content.append(make("p", "article-date", String(article.date || "")), make("h3", "", title));
    // 抜き出しの先頭は毎回同じあいさつなので外す。残りが無ければ紹介文は出さない
    const summary = String(article.summary || "")
        .replace(/続きをみる.*$/, "")
        .replace(/^\s*「?はじめに」?\s*/, "")
        .replace(/^こんにちは[！!]?.*?はるです[！!。]?\s*/, "")
        .trim();
    if (summary.length >= 10) content.append(make("p", "article-summary", summary));

    if (articleUrl) {
        const link = make("a", "", "記事を読む →");
        link.href = articleUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        content.append(link);
    }

    const badges = decor(make("div", "article-badges"));
    if (index === 0) badges.append(make("span", "is-new", "NEW!"));
    const issue = title.match(/#(\d+)/);
    if (issue) badges.append(make("span", "", `LOG #${issue[1]}`));

    card.append(image, badges, content);
    return card;
}

// blog.json が本体。読めないとき（file:// で開いた場合など）は data/blog.js の写しを使う
loadJson("data/blog.json", window.BLOG_DATA)
    .then((data) => {
        if (!data) throw new Error("blog.json を読み込めませんでした。");

        setBlogCount(document.getElementById("article-count"), data.articleCount);
        setStat(document.getElementById("blogCount"), data.articleCount);

        if (!latestArticles) return;
        latestArticles.querySelectorAll(".article-card").forEach((card) => card.remove());

        if (!Array.isArray(data.articles)) {
            console.warn("blog.json に articles が存在しません。");
            return;
        }

        const cards = data.articles.map(buildArticleCard);
        latestArticles.append(...cards);

        // 記事カードは後から作られるので、ここで動き・キャラ・表示をまとめて設定する
        cards.forEach((card, index) => {
            card.style.setProperty("--idle-delay", `${-index * 0.45}s`);
            card.append(makeSprite(ARTICLE_POP_CAST[index % ARTICLE_POP_CAST.length], "card-pop"));
        });
        revealInOrder(cards, 0.05);
        document.dispatchEvent(new CustomEvent("articles:rendered"));
    })
    .catch((error) => console.error("Blog Data Error:", error));

/* ---------- Achievements（profile.json は、ページから数えられないものだけに使う） ---------- */

loadJson("data/profile.json", {})
    .then((data) => {
        const stat = (id, value) => setStat(document.getElementById(id), value);

        stat("gameCount", countWorks());

        // 受賞は経歴から数える（経歴に受賞がないときだけ profile.json）
        stat("awardCount", countAwards() || data.awardCount);

        stat("eventCount", data.eventCount);

        // インターンは、経歴のタイトルに「インターン」が入っているものを数える
        const interns = Array.from(document.querySelectorAll(".timeline-item h3"))
            .filter((title) => /インターン|intern/i.test(title.textContent)).length;
        stat("internCount", interns || data.internCount);

        stat("careerCount", careerYears() ?? data.careerCount);
    })
    .catch((error) => console.error("Profile Data Error:", error));

/* ========================================
   ハンバーガーメニュー
======================================== */

(() => {
    const hamburger = document.querySelector(".hamburger");
    const headerNav = document.querySelector(".header-nav");
    if (!hamburger || !headerNav) return;

    const setMenuOpen = (isOpen) => {
        hamburger.classList.toggle("active", isOpen);
        headerNav.classList.toggle("active", isOpen);
        document.body.classList.toggle("menu-open", isOpen);
        hamburger.setAttribute("aria-expanded", String(isOpen));
        hamburger.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
    };

    hamburger.addEventListener("click", () => setMenuOpen(!headerNav.classList.contains("active")));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && headerNav.classList.contains("active")) {
            setMenuOpen(false);
            hamburger.focus();
        }
    });

    document.querySelectorAll(".header-nav a, .header-logo").forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
    });
})();

/* ========================================
   Achievements を見たらトロフィー（play.js）
======================================== */

(() => {
    const section = document.getElementById("achievements");
    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setTimeout(() => window.PlayTrophy?.unlock("achievements"), 900);
    }, { threshold: 0.45 });

    observer.observe(section);
})();

/* ========================================
   Other Works：ステージ選択（バッジ・受賞作・絞り込み・引き出し）
======================================== */

(() => {
    const worksList = document.querySelector(".works-list");
    if (!worksList) return;

    const cards = Array.from(worksList.querySelectorAll(".work-card"));
    const total = cards.length;

    /* 受賞作は経歴から自動で見つける：
       受賞の経歴（data-quest="award"）の本文に「」で作品名があれば、そのカードを RARE にする */
    const normalizeTitle = (text) => text.toLowerCase().replace(/[\s　]/g, "");
    const awardsByTitle = new Map();

    document.querySelectorAll('.timeline-item[data-quest="award"]').forEach((quest) => {
        const title = (quest.querySelector("h3")?.textContent || "").replace(/[\[\]\s]/g, "");
        const body = (quest.querySelector("p")?.textContent || "").replace(/\s+/g, "");
        const pattern = /[A-Za-z0-9]*グランプリ|クラス内1位|総合1位|[一-龠ァ-ヶーA-Za-z0-9]{1,6}?賞/g;
        const label = [...`${title} ${body}`.matchAll(pattern)]
            .map((match) => match[0])
            .find((text) => text !== "受賞") || "AWARD";
        const date = textOf(quest, ".timeline-date");

        for (const [, name] of body.matchAll(/「([^」]+)」/g)) {
            awardsByTitle.set(normalizeTitle(name), { label, date });
        }
    });

    // Main Works も受賞作になれる（ステータス画面で使う）
    document.querySelectorAll(".featured-container[data-work]").forEach((work) => {
        const award = awardsByTitle.get(normalizeTitle(work.dataset.work));
        if (award) work.dataset.award = award.label;
    });

    cards.forEach((card, index) => {
        const tech = textOf(card, ".work-tech");
        const genre = textOf(card, ".work-genre");
        const member = parseInt(textOf(card, ".work-member"), 10) || 1;
        const role = textOf(card, ".work-role");

        card.dataset.unity = String(/unity/i.test(tech));
        card.dataset.cpp = String(/c\+\+|directx/i.test(tech));
        card.dataset.threeD = String(/3D/.test(genre));
        card.dataset.team = String(member > 1);

        const badges = decor(make("div", "stage-badges"));
        badges.append(make("span", "", `STAGE ${String(total - index).padStart(2, "0")}`));
        if (member > 1) badges.append(make("span", "is-team", `TEAM ×${member}`));
        if (role.includes("未完成")) badges.append(make("span", "is-wip", "WIP"));

        const award = awardsByTitle.get(normalizeTitle(textOf(card, "h3")));
        if (award) {
            card.classList.add("is-rare");
            card.dataset.award = award.label;
            badges.prepend(make("span", "is-award", "★ RARE"));

            const ribbon = make("p", "award-ribbon");
            ribbon.innerHTML = '<i class="fa-solid fa-trophy" aria-hidden="true"></i>';
            ribbon.append(document.createTextNode(award.label));
            card.querySelector(".work-content")?.prepend(ribbon);

            const shine = decor(make("span", "rare-shine"));
            card.append(shine);
        }

        card.append(badges);
    });

    /* ---------- 絞り込み ---------- */

    const filters = [
        { label: "すべて", test: () => true },
        { label: "★ 受賞作", test: (card) => card.classList.contains("is-rare") },
        { label: "Unity", test: (card) => card.dataset.unity === "true" },
        { label: "C++ / DirectX", test: (card) => card.dataset.cpp === "true" },
        { label: "3D", test: (card) => card.dataset.threeD === "true" },
        { label: "チーム制作", test: (card) => card.dataset.team === "true" },
        { label: "個人制作", test: (card) => card.dataset.team !== "true" },
    ];

    const bar = make("div", "stage-filter");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "作品の絞り込み");
    bar.append(make("span", "stage-filter-label", "SELECT STAGE"));

    const buttons = filters.map((filter, index) => {
        const button = make("button");
        button.type = "button";
        button.setAttribute("aria-pressed", String(index === 0));
        button.append(make("span", "", filter.label), make("b", "", String(cards.filter(filter.test).length)));

        button.addEventListener("click", () => {
            buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
            worksList.classList.toggle("is-filtered", index !== 0);

            cards.forEach((card) => {
                const match = filter.test(card);
                card.hidden = !match;
                card.classList.remove("stage-pop");
                if (match && !prefersReducedMotion) {
                    void card.offsetWidth;
                    card.classList.add("stage-pop");
                }
            });
        });

        bar.append(button);
        return button;
    });

    worksList.before(bar);

    /* ---------- 引き出し（最初は閉じていて、大きなボタンで開く） ---------- */

    const worksSection = document.getElementById("other-works");
    const drawer = make("div", "works-drawer");
    drawer.id = "works-drawer";
    const drawerInner = make("div", "works-drawer-inner");

    bar.before(drawer);
    drawer.append(drawerInner);
    drawerInner.append(bar, worksList);

    const toggle = make("button", "works-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "works-drawer");

    const toggleText = make("span", "works-toggle-text");
    const thumbs = decor(make("span", "works-toggle-thumbs"));
    // カードの画像の小さな写し（ボタンの中のサムネイル用）
    const thumbOf = (card) => {
        const source = card.querySelector("img");
        if (!source) return null;
        const thumb = make("img");
        thumb.src = source.getAttribute("src");
        thumb.alt = "";
        thumb.width = Number(source.getAttribute("width")) || 16;
        thumb.height = Number(source.getAttribute("height")) || 9;
        thumb.loading = "lazy";
        return thumb;
    };
    [0, 1, 2, 3].map((i) => cards[Math.floor((i * total) / 4)]).filter(Boolean).forEach((card) => {
        const thumb = thumbOf(card);
        if (thumb) thumbs.append(thumb);
    });
    const toggleIcon = decor(make("span", "works-toggle-icon", "▼"));

    toggle.append(make("span", "works-toggle-label", "SELECT STAGE"), toggleText, thumbs, toggleIcon);
    drawer.before(toggle);

    const closeButton = make("button", "works-close", "▲ 作品一覧を閉じる");
    closeButton.type = "button";
    drawerInner.append(closeButton);

    /* ---------- 受賞作のピックアップ（一覧を閉じていても見える） ---------- */

    const rareCards = cards.filter((card) => card.classList.contains("is-rare"));
    const pickup = make("div", "works-pickup");
    if (rareCards.length) {
        const head = make("p", "works-pickup-head");
        head.append(make("span", "works-pickup-label", "★ PICK UP"), make("span", "", "受賞した作品"));
        const list = make("ul", "works-pickup-list");

        rareCards.forEach((card) => {
            const item = make("li");
            const button = make("button", "works-pickup-card");
            button.type = "button";
            button.setAttribute("aria-label", `${textOf(card, "h3")} の詳細を開く`);

            const thumb = thumbOf(card);
            if (thumb) button.append(thumb);
            const text = make("span", "works-pickup-text");
            text.append(
                make("span", "works-pickup-award", `★ ${card.dataset.award || "AWARD"}`),
                make("span", "works-pickup-title", textOf(card, "h3")),
                make("span", "works-pickup-genre", textOf(card, ".work-genre"))
            );
            button.append(text);
            // 一覧の中の本物のカードを押したのと同じ動き（詳細のポップアップ）にする
            button.addEventListener("click", () => card.dispatchEvent(new MouseEvent("click", { bubbles: true })));

            item.append(button);
            list.append(item);
        });

        list.style.setProperty("--pickup-count", String(Math.min(rareCards.length, 4)));
        pickup.append(head, list);
        toggle.before(pickup);
    }

    const setDrawer = bindDrawer(drawer, toggle);
    const setWorksOpen = (open, { scroll = false } = {}) => {
        setDrawer(open);
        // 一覧を開いたら、ピックアップは一覧と重複するので隠す
        pickup.hidden = open;
        toggleText.textContent = open ? "作品一覧を閉じる" : `全${total}作品を見る`;
        if (!open && scroll && worksSection) worksSection.scrollIntoView({ behavior: scrollBehavior() });
    };

    toggle.addEventListener("click", () => setWorksOpen(!drawer.classList.contains("is-open")));
    closeButton.addEventListener("click", () => setWorksOpen(false, { scroll: true }));

    // 作品一覧へのリンク（トップの「すべての作品」など）は、引き出しを開いてから移動
    document.querySelectorAll('a[href="#other-works"]').forEach((link) => {
        link.addEventListener("click", () => {
            if (buttons[0].getAttribute("aria-pressed") !== "true") buttons[0].click();
            setWorksOpen(true);
        });
    });

    setWorksOpen(location.hash === "#other-works");

    const workCount = document.getElementById("workCount");
    if (workCount) workCount.textContent = total;
})();

/* ========================================
   Blog：RPG風のメッセージウィンドウ（説明文が1文字ずつ出る）
======================================== */

(() => {
    const message = document.querySelector(".blog-intro-content > p");
    if (!message) return;

    const fullText = message.textContent.replace(/\s+/g, " ").trim();
    message.classList.add("blog-message");
    message.dataset.text = fullText;

    const srText = make("span", "sr-only", fullText);
    const typed = decor(make("span", "blog-message-text"));
    const cursor = decor(make("span", "blog-message-cursor", "▼"));
    message.replaceChildren(srText, typed, cursor);

    if (motionOff() || !("IntersectionObserver" in window)) {
        typed.textContent = fullText;
        message.classList.add("is-done");
    }
})();

function startTypewriter(message) {
    if (!message || message.dataset.started) return;
    message.dataset.started = "1";

    const typed = message.querySelector(".blog-message-text");
    const text = message.dataset.text || "";

    if (motionOff()) {
        typed.textContent = text;
        message.classList.add("is-done");
        return;
    }

    let index = 0;
    const timer = setInterval(() => {
        index += 1;
        typed.textContent = text.slice(0, index);
        if (index >= text.length) {
            clearInterval(timer);
            message.classList.add("is-done");
        }
    }, 38);
}

/* ========================================
   背景の飾り（どのセクションにも、ゆっくり漂う記号）
======================================== */

(() => {
    const shapes = ["✦", "●", "▲", "■", "✚", "◆", "★", "●"];
    const colors = ["#00a3e0", "#ff5a5f", "#ffb300", "#22c55e", "#8b5cf6", "#ff7a1a"];
    const spots = [[4, 14], [93, 10], [7, 82], [90, 76], [48, 4], [97, 44], [2, 48], [62, 94]];

    document.querySelectorAll("section").forEach((section, sectionIndex) => {
        const layer = decor(make("div", "ambient"));

        const count = section.classList.contains("hero") ? 8 : 6;
        for (let i = 0; i < count; i += 1) {
            const [x, y] = spots[i];
            const seed = (sectionIndex * 7 + i * 3) % 10;
            const shape = make("i", "", shapes[(sectionIndex + i) % shapes.length]);
            shape.style.left = `${x}%`;
            shape.style.top = `${y}%`;
            shape.style.setProperty("--c", colors[(sectionIndex + i) % colors.length]);
            shape.style.setProperty("--s", `${14 + seed * 2}px`);
            shape.style.setProperty("--d", `${6 + seed * 0.7}s`);
            shape.style.setProperty("--delay", `${-seed * 0.9}s`);
            shape.style.setProperty("--r", `${seed % 2 ? 24 : -24}deg`);
            layer.append(shape);
        }

        section.append(layer);
    });

    // 並んだカードが同じタイミングで揺れないように、少しずつずらす
    document.querySelectorAll(".achievement-list, .can-do-list, .play-container, .sns-list, .latest-articles").forEach((list) => {
        Array.from(list.children).forEach((item, index) => {
            item.style.setProperty("--idle-delay", `${-index * 0.45}s`);
        });
    });

    // 画面の外にあるセクションの動きは止める
    if ("IntersectionObserver" in window) {
        const idleObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting));
        }, { rootMargin: "120px 0px" });
        document.querySelectorAll("section, footer").forEach((section) => idleObserver.observe(section));
    }
})();

/* ========================================
   キャラクター：のぞく・漂う・飛び出す
======================================== */

const CHARACTER_PATH = "images/character/";
const ARTICLE_POP_CAST = ["Openji.png", "Penzou.png", "Clone_0.png"];

function makeSprite(file, className) {
    const img = make("img", className);
    img.src = CHARACTER_PATH + file;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    return img;
}

(() => {
    /* 1. のぞく：箱のふちからときどき顔を出す */
    const peekers = [
        { host: ".hero-screen", file: "Koutei.png", x: "72%", w: 84, delay: 2 },
        { host: ".about-container", file: "Pensand.png", x: "8%", w: 92, delay: 1 },
        { host: ".status-header", file: "Penko.png", x: "38%", w: 72, delay: 4 },
        { host: ".can-do-category:nth-child(2 of .can-do-category) .can-do-card:nth-child(2)", file: "Openji.png", x: "62%", w: 56, delay: 5.5 },
        { host: ".featured-info", file: "Ojisand.png", x: "82%", w: 76, delay: 3 },
        { host: ".works-toggle", file: "Penzou.png", x: "84%", w: 72, delay: 6.5 },
        { host: ".latest-articles-wrap", file: "Penny.png", x: "84%", w: 80, delay: 2.5 },
        { host: '.timeline-item[data-quest="now"] .timeline-content', file: "Chrono_0.png", side: true, y: "18%", w: 64, delay: 0.5 },
        { host: ".play-container", file: "Machopen.png", x: "6%", w: 80, delay: 6 },
        { host: ".mail-card", file: "Player.png", x: "88%", w: 64, delay: 3.5 },
        { host: "footer", file: "Clone_0.png", x: "46%", w: 64, delay: 7.5 },
    ];

    peekers.forEach((config) => {
        const host = document.querySelector(config.host);
        if (!host) return;

        const frame = decor(make("div", "peeker"));
        frame.style.setProperty("--peek-x", config.x);
        frame.style.setProperty("--peek-w", `${config.w}px`);
        frame.style.setProperty("--peek-delay", `${config.delay}s`);
        if (config.side) {
            frame.classList.add("is-side");
            frame.style.setProperty("--peek-y", config.y);
        }

        frame.append(makeSprite(config.file, "peeker-sprite"));
        host.classList.add("has-peeker");
        host.append(frame);
    });

    /* 2. 漂う：宇宙に浮かんでいるように背景を横切る */
    const drifters = [
        { section: ".hero", file: "Fish.png", y: "72%", w: 64, d: 34, delay: -6 },
        { section: ".hero", file: "Openji.png", y: "14%", w: 60, d: 52, delay: -36, reverse: true },
        { section: ".about", file: "RedFish.png", y: "82%", w: 56, d: 40, delay: -12, reverse: true },
        { section: ".achievements", file: "Clone_0.png", y: "18%", w: 70, d: 42, delay: -20, reverse: true },
        { section: ".what-i-can-do", file: "Penzou.png", y: "46%", w: 64, d: 48, delay: -8 },
        { section: ".featured-works", file: "Boss.png", y: "62%", w: 120, d: 58, delay: -14 },
        { section: ".other-works", file: "RedFish.png", y: "36%", w: 60, d: 38, delay: -4, reverse: true },
        { section: ".other-works", file: "Fish.png", y: "78%", w: 52, d: 46, delay: -28 },
        { section: ".other-works", file: "Koutei.png", y: "56%", w: 66, d: 60, delay: -44 },
        { section: ".blog", file: "Penko.png", y: "12%", w: 64, d: 50, delay: -30 },
        { section: ".timeline", file: "Clone_0.png", y: "40%", w: 64, d: 44, delay: -10, reverse: true },
        { section: ".timeline", file: "Pensand.png", y: "76%", w: 60, d: 54, delay: -32 },
        { section: ".play-games", file: "Ojisand.png", y: "70%", w: 60, d: 40, delay: -16, reverse: true },
        { section: ".contact", file: "RedFish.png", y: "70%", w: 56, d: 36, delay: -18 },
    ];

    drifters.forEach((config) => {
        const layer = document.querySelector(`${config.section} > .ambient`);
        if (!layer) return;

        const sprite = makeSprite(config.file, "drifter");
        sprite.style.top = config.y;
        sprite.style.setProperty("--drift-w", `${config.w}px`);
        sprite.style.setProperty("--drift-d", `${config.d}s`);
        sprite.style.setProperty("--drift-delay", `${config.delay}s`);
        if (config.reverse) sprite.classList.add("is-reverse");
        layer.append(sprite);
    });

    /* 3. 飛び出す：カードにマウスを乗せるとキャラが顔を出す（ブログ記事は読み込み後に追加） */
    const popCast = {
        ".play-card": ["Pensand.png", "Penko.png", "Machopen.png"],
        ".sns-card": ["Koutei.png", "RedFish.png", "Chrono_0.png", "Ojisand.png", "Fish.png"],
    };

    Object.entries(popCast).forEach(([selector, cast]) => {
        document.querySelectorAll(selector).forEach((card, index) => {
            card.append(makeSprite(cast[index % cast.length], "card-pop"));
        });
    });
})();

/* ========================================
   設定画面（OPTIONS）：ゲームのオプション画面のように、ヘッダーの ⚙ から開く
   ・アニメーション：デフォルト ／ 軽量 ／ なし
   ・音量：作品の動画と効果音の音量・ミュート
   ・効果音：ボタンやトロフィーの音（ON / OFF。鳴らすのは sfx.js）
   ・言語：日本語 ／ English（訳は data/i18n-en.js、切り替えは i18n.js）
======================================== */

const settingsButton = document.querySelector(".settings-button");

const MOTION_NOTES = {
    default: "すべての演出を表示します",
    lite: "常に動いている飾りを止めて、軽くします",
    none: "アニメーションをすべて止めます",
};

function setMotion(level) {
    if (!MOTION_LEVELS.includes(level)) return;
    settings.motion = level;
    root.classList.toggle("motion-off", level === "none");
    root.classList.toggle("motion-lite", level === "lite");
    saveSettings();
    syncVideos(level === "none");
}

function setVolume(volume, muted = settings.muted) {
    settings.volume = Math.min(100, Math.max(0, Math.round(volume)));
    settings.muted = muted;
    saveSettings();
    document.querySelectorAll("video").forEach(applyVolume);
}

function setSfx(value) {
    settings.sfx = value === "on" ? "on" : "off";
    saveSettings();
}

function setLanguage(lang) {
    settings.lang = lang === "en" ? "en" : "ja";
    saveSettings();
    window.I18n?.setLang(settings.lang);
}

(() => {
    if (!settingsButton || typeof HTMLDialogElement !== "function") return;

    const panel = make("dialog", "settings-panel");
    panel.setAttribute("aria-labelledby", "settings-title");
    panel.innerHTML = `
        <div class="settings-head">
            <span class="settings-head-icon" aria-hidden="true">⚙</span>
            <h2 id="settings-title">OPTIONS</h2>
            <span class="settings-head-sub">設定</span>
            <button type="button" class="settings-close" aria-label="閉じる">×</button>
        </div>
        <div class="settings-body">
            <div class="settings-row">
                <h3 class="settings-label" id="settings-motion">アニメーション</h3>
                <div class="settings-choices" role="radiogroup" aria-labelledby="settings-motion" data-setting="motion">
                    <button type="button" role="radio" data-value="default">デフォルト</button>
                    <button type="button" role="radio" data-value="lite">軽量</button>
                    <button type="button" role="radio" data-value="none">なし</button>
                </div>
                <p class="settings-note" data-note="motion"></p>
            </div>
            <div class="settings-row">
                <h3 class="settings-label" id="settings-volume">音量</h3>
                <div class="settings-volume">
                    <button type="button" class="settings-mute" aria-pressed="false" aria-label="ミュート">
                        <span aria-hidden="true">🔊</span>
                    </button>
                    <input type="range" min="0" max="100" step="5" aria-labelledby="settings-volume">
                    <output class="settings-volume-value" aria-hidden="true"></output>
                </div>
                <p class="settings-note">作品紹介の動画と効果音の音量です</p>
            </div>
            <div class="settings-row">
                <h3 class="settings-label" id="settings-sfx">効果音</h3>
                <div class="settings-choices" role="radiogroup" aria-labelledby="settings-sfx" data-setting="sfx">
                    <button type="button" role="radio" data-value="on">ON</button>
                    <button type="button" role="radio" data-value="off">OFF</button>
                </div>
                <p class="settings-note">ボタンを押したときやトロフィーを解除したときに、短い音が鳴ります</p>
            </div>
            <div class="settings-row">
                <h3 class="settings-label" id="settings-lang" data-no-translate>言語 / Language</h3>
                <div class="settings-choices" role="radiogroup" aria-labelledby="settings-lang" data-setting="lang">
                    <button type="button" role="radio" data-value="ja" lang="ja" data-no-translate>日本語</button>
                    <button type="button" role="radio" data-value="en" lang="en">English</button>
                </div>
            </div>
        </div>
        <div class="settings-foot">
            <button type="button" class="settings-reset">初期設定に戻す</button>
            <button type="button" class="settings-done">OK</button>
        </div>`;
    document.body.append(panel);

    const groups = panel.querySelectorAll(".settings-choices");
    const motionNote = panel.querySelector('[data-note="motion"]');
    const range = panel.querySelector('input[type="range"]');
    const output = panel.querySelector(".settings-volume-value");
    const mute = panel.querySelector(".settings-mute");

    // 画面の表示を、今の設定に合わせる
    const render = () => {
        groups.forEach((group) => {
            const current = settings[group.dataset.setting];
            group.querySelectorAll("[role=radio]").forEach((option) => {
                const checked = option.dataset.value === current;
                option.setAttribute("aria-checked", String(checked));
                option.tabIndex = checked ? 0 : -1;
            });
        });
        motionNote.textContent = MOTION_NOTES[settings.motion];
        range.value = String(settings.volume);
        output.textContent = settings.muted ? "MUTE" : String(settings.volume);
        mute.setAttribute("aria-pressed", String(settings.muted));
        mute.querySelector("span").textContent = settings.muted || settings.volume === 0 ? "🔇" : "🔊";
        panel.classList.toggle("is-muted", settings.muted);
    };

    const choose = (group, option) => {
        const value = option.dataset.value;
        if (group.dataset.setting === "motion") setMotion(value);
        if (group.dataset.setting === "lang") setLanguage(value);
        if (group.dataset.setting === "sfx") setSfx(value);
        render();
        emitPlayEvent(`設定: ${group.dataset.setting}=${value}`);
    };

    // ラジオボタン：押す・左右キーで選ぶ（ゲームのメニューのように）
    groups.forEach((group) => {
        const options = Array.from(group.querySelectorAll("[role=radio]"));
        options.forEach((option) => option.addEventListener("click", () => choose(group, option)));
        group.addEventListener("keydown", (event) => {
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (!step) return;
            event.preventDefault();
            const index = options.indexOf(document.activeElement);
            const next = options[(index + step + options.length) % options.length];
            next.focus();
            choose(group, next);
        });
    });

    range.addEventListener("input", () => {
        setVolume(Number(range.value), Number(range.value) === 0 ? settings.muted : false);
        render();
    });
    range.addEventListener("change", () => emitPlayEvent(`設定: volume=${settings.volume}`));
    mute.addEventListener("click", () => {
        setVolume(settings.volume, !settings.muted);
        render();
    });

    panel.querySelector(".settings-reset").addEventListener("click", () => {
        const initial = defaultSettings();
        setMotion(initial.motion);
        setVolume(initial.volume, initial.muted);
        setSfx(initial.sfx);
        setLanguage(initial.lang);
        render();
    });
    panel.querySelectorAll(".settings-close, .settings-done").forEach((button) => button.addEventListener("click", () => panel.close()));
    closeOnBackdrop(panel);
    panel.addEventListener("close", () => settingsButton.focus());

    settingsButton.addEventListener("click", () => {
        render();
        panel.showModal();
        panel.querySelector('[role=radio][aria-checked="true"]')?.focus();
        emitPlayEvent("設定を開いた");
    });
})();

// 初めて来た人に、⚙ で設定（英語表示など）を変えられることを一度だけ吹き出しで知らせる
(() => {
    const HINT_KEY = "pa-hint-options";
    const header = document.querySelector(".header");
    if (!settingsButton || !header || storage.get(HINT_KEY) || storage.get(SETTINGS_KEY)) return;

    const hint = make("div", "settings-hint");
    hint.setAttribute("role", "status");
    const message = make("span");
    message.append("アニメーションの強さ・音量・言語を", make("br"), "ここで変えられます");
    hint.append(make("b", "", "⚙ OPTIONS ／ English"), message);
    const close = make("button", "settings-hint-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "お知らせを閉じる");
    hint.append(close);

    let timer = 0;
    let done = false;
    const hide = () => {
        done = true;
        clearTimeout(timer);
        hint.classList.remove("is-shown");
        setTimeout(() => hint.remove(), 300);
        window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
        if (window.scrollY > 400) hide();
    };

    setTimeout(() => {
        if (done) return;
        storage.set(HINT_KEY, "1");
        const buttonBox = settingsButton.getBoundingClientRect();
        const headerBox = header.getBoundingClientRect();
        const center = buttonBox.left + buttonBox.width / 2;
        const width = Math.min(300, window.innerWidth - 24);
        const left = Math.max(12, Math.min(center - width / 2, window.innerWidth - width - 12));
        hint.style.setProperty("--hint-left", `${left - headerBox.left}px`);
        hint.style.setProperty("--hint-width", `${width}px`);
        hint.style.setProperty("--hint-arrow", `${center - left}px`);
        header.append(hint);
        requestAnimationFrame(() => hint.classList.add("is-shown"));
        timer = setTimeout(hide, 9000);
        window.addEventListener("scroll", onScroll, { passive: true });
    }, 1800);

    close.addEventListener("click", hide);
    settingsButton.addEventListener("click", hide);
})();

/* ========================================
   メールアドレス：HTML には書かず、ここで組み立てて入れる
   （迷惑メール業者のプログラムに、ページから拾われにくくするため）
======================================== */

(() => {
    const address = ["haru2401game", "gmail.com"].join("@");
    document.querySelectorAll("[data-mail]").forEach((element) => {
        if (element.matches(".mail-copy")) {
            element.dataset.copy = address;
            return;
        }
        element.href = `mailto:${address}`;
        if (element.matches(".mail-address")) element.textContent = address;
    });
})();

/* ========================================
   連絡ボタン（画面の左下）
   ・30秒まとめを読み終えたあたりから表示し、Contact とエンディングが見えている間は隠す
   ・押すと Contact へ移動（メールの送信・アドレスのコピーはそこから）
======================================== */

(() => {
    const contact = document.getElementById("contact");
    const summary = document.getElementById("summary");
    if (!contact) return;

    const button = make("a", "quick-contact");
    button.href = "#contact";
    button.append(decor(make("span", "quick-contact-icon", "✉")), make("span", "quick-contact-text", "連絡する"));
    button.setAttribute("aria-label", "連絡する（メール・SNS の連絡先へ移動）");
    document.body.append(button);

    const hideZones = [contact, document.getElementById("ending")].filter(Boolean);
    let frame = 0;
    const update = () => {
        frame = 0;
        const start = summary ? summary.getBoundingClientRect().bottom : window.innerHeight;
        const inZone = hideZones.some((zone) => {
            const box = zone.getBoundingClientRect();
            return box.top < window.innerHeight * 0.85 && box.bottom > 0;
        });
        const menuOpen = document.body.classList.contains("menu-open");
        button.classList.toggle("is-shown", start < 0 && !inZone && !menuOpen);
    };
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // メニューを開いたら隠す
    new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    update();
})();

/* ========================================
   メールアドレスのコピー
======================================== */

document.querySelectorAll(".mail-copy").forEach((button) => {
    const label = button.querySelector("span");
    const original = label ? label.textContent : "";

    const copyFallback = (text) => {
        const field = make("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        try {
            return document.execCommand("copy");
        } catch {
            return false;
        } finally {
            field.remove();
        }
    };

    button.addEventListener("click", async () => {
        const text = button.dataset.copy || "";
        let copied = false;
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch {
            copied = copyFallback(text);
        }

        if (label) label.textContent = copied ? "コピーしました！" : "コピーできませんでした";
        button.classList.toggle("is-copied", copied);
        if (!copied) document.dispatchEvent(new CustomEvent("copy:failed"));

        setTimeout(() => {
            if (label) label.textContent = original;
            button.classList.remove("is-copied");
        }, 2000);
    });
});

/* ========================================
   Timeline：最新の3つだけ見せて、残りはたたむ
======================================== */

(() => {
    const container = document.querySelector(".timeline-container");
    if (!container) return;

    const items = Array.from(container.querySelectorAll(".timeline-item"));
    // 最初から見せる新しいクエストの数（スマホは画面が縦に長くなるので2つ）
    const VISIBLE = window.matchMedia("(max-width: 768px)").matches ? 2 : 3;
    if (items.length <= VISIBLE) return;

    const older = items.slice(0, items.length - VISIBLE);

    const drawer = make("div", "quest-drawer");
    drawer.id = "quest-drawer";
    const inner = make("div", "quest-drawer-inner");
    older[0].before(drawer);
    drawer.append(inner);
    inner.append(...older);

    const toggle = make("button", "quest-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-controls", "quest-drawer");
    const icon = decor(make("span", "quest-toggle-icon", "▲"));
    const text = make("span", "quest-toggle-text");
    toggle.append(icon, text, make("span", "quest-toggle-count", `QUEST 01–${String(older.length).padStart(2, "0")}`));
    container.before(toggle);

    const timelineSection = document.getElementById("timeline");
    const setDrawer = bindDrawer(drawer, toggle);

    const setOpen = (open, fromUser = true) => {
        setDrawer(open);
        text.textContent = open ? "これまでのクエストを閉じる" : `これまでのクエストを見る（${older.length}件）`;
        // 閉じたときに見出しが画面より上なら戻す（最初の表示では位置を測らない＝読み込みを止めない）
        if (fromUser && !open && timelineSection && timelineSection.getBoundingClientRect().top < 0) {
            timelineSection.scrollIntoView({ behavior: scrollBehavior() });
        }
    };

    toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));
    setOpen(false, false);
})();

/* ========================================
   写真の拡大表示（Main Works・Timeline）
======================================== */

(() => {
    const photos = document.querySelectorAll(".tech-photo, .timeline-photo");
    if (!photos.length || typeof HTMLDialogElement !== "function") return;

    const viewer = make("dialog", "photo-viewer");
    viewer.setAttribute("aria-label", "写真の拡大表示");

    const figure = make("figure");
    const image = make("img");
    image.alt = "";
    const caption = make("figcaption");
    const close = make("button", "photo-viewer-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "閉じる");

    figure.append(image, caption);
    viewer.append(close, figure);
    document.body.append(viewer);

    photos.forEach((button) => {
        button.addEventListener("click", () => {
            const source = button.querySelector("img");
            image.src = source.currentSrc || source.src;
            image.alt = source.alt;
            caption.textContent = button.dataset.caption || source.alt;
            viewer.showModal();
        });
    });

    close.addEventListener("click", () => viewer.close());
    closeOnBackdrop(viewer);
})();

/* ========================================
   3Dゲーム10本チャレンジの進み具合（Other Works のタイトルから数える）
======================================== */

(() => {
    const progress = document.querySelector(".challenge-progress");
    if (!progress) return;

    const total = Number(progress.dataset.challengeTotal) || 10;
    const numbers = new Set();
    document.querySelectorAll(".work-card h3").forEach((title) => {
        const match = title.textContent.match(/3D\s*CHALLENGE\s*#\s*(\d+)/i);
        if (match) numbers.add(Number(match[1]));
    });

    const done = Math.min(numbers.size, total);
    const bar = progress.querySelector(".challenge-bar");

    progress.querySelector("[data-challenge-count]").textContent = done;
    bar.setAttribute("aria-valuenow", done);
    bar.setAttribute("aria-valuetext", `${total}本中${done}本完成`);
    bar.style.setProperty("--challenge-total", total);

    for (let i = 1; i <= total; i += 1) {
        const pip = make("span", "challenge-pip");
        if (i <= done) pip.classList.add("is-done");
        if (i === done + 1) pip.classList.add("is-next");
        pip.style.setProperty("--i", i);
        bar.append(pip);
    }

    progress.classList.toggle("is-complete", done >= total);
    progress.querySelector("[data-challenge-next]").textContent = done >= total
        ? "COMPLETE! 10本制作達成"
        : `NEXT ▶ 3D CHALLENGE #${String(done + 1).padStart(2, "0")} 制作中`;

    observeShow([progress]);
})();

/* ========================================
   ステータス画面（What I Can Do）
   作品カードから自動で集計する：使った技術・担当した役割・制作人数
======================================== */

(() => {
    const host = document.querySelector(".status-screen");
    const cards = Array.from(document.querySelectorAll(".work-card"));
    if (!host || !cards.length) return;

    // 全作品 = Other Works のカード + Main Works（.featured-container の data-*）
    const works = [
        ...cards.map((card) => ({
            tech: textOf(card, ".work-tech"),
            role: textOf(card, ".work-role"),
            member: parseInt(textOf(card, ".work-member"), 10) || 1,
            rare: card.classList.contains("is-rare"),
        })),
        ...Array.from(document.querySelectorAll(".featured-container[data-work]")).map((work) => ({
            tech: work.dataset.tech || "",
            role: work.dataset.role || "",
            member: parseInt(work.dataset.member, 10) || 1,
            rare: Boolean(work.dataset.award),
        })),
    ];
    const count = (test) => works.filter(test).length;

    const tech = [
        ["Unity", /unity/i],
        ["C#", /c#/i],
        ["C++", /c\+\+/i],
        ["GitHub", /github/i],
        ["DirectX", /directx/i],
    ].map(([label, re]) => ({ label, value: count((work) => re.test(work.tech)) }));

    const role = [
        ["企画", (work) => /企画/.test(work.role)],
        ["プログラム", (work) => /プログラム|システム/.test(work.role)],
        ["チーム制作", (work) => work.member > 1],
        ["プロジェクト統合", (work) => /統合|総合管理/.test(work.role)],
        ["デザイン", (work) => /デザイン/.test(work.role)],
    ].map(([label, test]) => ({ label, value: count(test) }));

    const solo = count((work) => work.member === 1);

    /* プロフィール */
    const profile = make("div", "status-profile");
    profile.append(
        make("span", "status-tag", "STATUS"),
        make("p", "status-name", "HARUTA NAGAYA"),
        make("p", "status-class", "CLASS：ゲームプログラマー志望")
    );
    const params = make("dl", "status-params");
    [
        ["LV", careerYears() ?? 1, "開発歴（年目）"],
        ["WORKS", works.length, "制作した作品"],
        ["SOLO", solo, "個人制作"],
        ["TEAM", works.length - solo, "チーム制作"],
        ["AWARDS", countAwards(), "受賞"],
        ["RARE", count((work) => work.rare), "受賞作品"],
    ].forEach(([key, value, note]) => {
        const row = make("div", "status-param");
        const dt = make("dt", "", key);
        dt.title = note;
        row.append(dt, make("dd", "", String(value)));
        params.append(row);
    });
    profile.append(params);

    /* EXP バー */
    const expPanel = (title, note, items, tone) => {
        const panel = make("div", `status-exp is-${tone}`);
        const head = make("p", "status-exp-head");
        head.append(make("span", "", title), make("small", "", note));

        const list = make("ul", "exp-list");
        const max = Math.max(...items.map((item) => item.value), 1);
        items.filter((item) => item.value > 0).forEach((item, index) => {
            const li = make("li");
            li.style.setProperty("--fill", (item.value / max).toFixed(3));
            li.style.setProperty("--i", index);
            const expBar = make("span", "exp-bar");
            expBar.append(make("span", "exp-fill"));
            const value = make("span", "exp-value");
            value.append(make("b", "", `Lv.${item.value}`));
            li.append(make("span", "exp-label", item.label), expBar, value);
            li.setAttribute("aria-label", `${item.label}：${item.value}作品`);
            list.append(li);
        });

        panel.append(head, list);
        return panel;
    };

    host.append(
        profile,
        expPanel("SKILL EXP", "使った作品数", tech, "cyan"),
        expPanel("ROLE EXP", "担当した作品数", role, "red")
    );
    host.hidden = false;
    observeShow([host]);
})();

/* ========================================
   エンディング（クレジット）
   ※ CAST（キャラ一覧）は play.js が図鑑と一緒に表示する
======================================== */

(() => {
    const ending = document.querySelector(".ending");
    if (!ending) return;

    const stats = ending.querySelector("[data-ending-stats]");
    if (stats) {
        const quests = document.querySelectorAll(".timeline-item").length;
        stats.textContent = `WORKS ${countWorks()} ／ QUESTS ${quests} ／ AWARDS ${countAwards()}`;
    }

    // 画面に入ったらクレジットを流す（MOTION OFF のときは止まった一覧）
    const roll = ending.querySelector(".credits-roll");
    if (roll && "IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
            entries.forEach((entry) => roll.classList.toggle("is-rolling", entry.isIntersecting));
        }, { threshold: 0.2 }).observe(ending);
    }

    observeShow([ending]);
})();

/* ========================================
   Main Works：作品の切り替えタブ
======================================== */

(() => {
    const tabs = Array.from(document.querySelectorAll(".main-tab"));
    if (tabs.length < 2) return;

    const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));

    const select = (tab, focus = false) => {
        tabs.forEach((other) => {
            const selected = other === tab;
            other.setAttribute("aria-selected", String(selected));
            other.tabIndex = selected ? 0 : -1;
            const panel = panelOf(other);
            if (!panel) return;
            panel.hidden = !selected;
            if (!selected) panel.querySelectorAll("video").forEach((video) => video.pause());
        });
        if (focus) tab.focus();

        const panel = panelOf(tab);
        if (!panel) return;
        panel.querySelectorAll(".featured-video, .featured-container").forEach((element) => element.classList.add("show"));
        panel.classList.remove("is-switching");
        void panel.offsetWidth;
        panel.classList.add("is-switching");
    };

    const KEYS = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => select(tab));
        tab.addEventListener("keydown", (event) => {
            let next = null;
            if (event.key in KEYS) next = tabs[(index + KEYS[event.key] + tabs.length) % tabs.length];
            if (event.key === "Home") next = tabs[0];
            if (event.key === "End") next = tabs[tabs.length - 1];
            if (!next) return;
            event.preventDefault();
            select(next, true);
        });
    });
})();

/* ========================================
   スマホ向けのコンパクト表示
   - 横スワイプのリストに「いま何枚目か」のドットを付ける
   - 技術の見どころは「課題」だけ見せて、解決・結果はタップで開く
   （見た目の切り替えは CSS の @media (max-width: 768px) 側。PC では何も変わらない）
======================================== */

(() => {
    const itemsOf = (list) => Array.from(list.children).filter((child) => !child.classList.contains("peeker"));
    const dotsOf = (list) => (list.nextElementSibling?.classList.contains("swipe-dots") ? list.nextElementSibling : null);

    const update = (list) => {
        const dots = dotsOf(list);
        if (!dots) return;
        const items = itemsOf(list);
        const start = list.getBoundingClientRect().left;

        let current = 0;
        let best = Infinity;
        items.forEach((item, index) => {
            const distance = Math.abs(item.getBoundingClientRect().left - start);
            if (distance < best) {
                best = distance;
                current = index;
            }
        });
        // 最後まで送ったら最後のドットを点ける
        if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 4) current = items.length - 1;

        Array.from(dots.children).forEach((dot, index) => {
            dot.classList.toggle("is-current", index === current);
            dot.setAttribute("aria-current", index === current ? "true" : "false");
        });
    };

    const setupSwipe = (list) => {
        const items = itemsOf(list);
        let dots = dotsOf(list);
        if (!dots) {
            dots = make("div", "swipe-dots");
            list.after(dots);
            let frame = 0;
            list.addEventListener("scroll", () => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => update(list));
            }, { passive: true });
        }
        if (items.length < 2) {
            dots.replaceChildren();
            return;
        }

        const label = list.closest(".can-do-category")?.querySelector("h3")?.textContent.trim()
            || (list.matches(".latest-articles") ? "最新記事" : "写真");
        dots.setAttribute("role", "group");
        dots.setAttribute("aria-label", `${label}（横にスワイプで切り替え）`);
        dots.replaceChildren(...items.map((item, index) => {
            const dot = make("button", "swipe-dot");
            dot.type = "button";
            dot.setAttribute("aria-label", `${index + 1}枚目を表示（全${items.length}枚）`);
            dot.addEventListener("click", () => {
                const left = item.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
                    - parseFloat(getComputedStyle(list).scrollPaddingLeft || 0);
                list.scrollTo({ left, behavior: scrollBehavior() });
            });
            return dot;
        }));
        update(list);
    };

    document.querySelectorAll(".can-do-list, .latest-articles, .tech-photos").forEach(setupSwipe);

    // ブログの最新記事は読み込み後に作られるので、そのときにドットを作り直す
    document.addEventListener("articles:rendered", () => {
        if (latestArticles) setupSwipe(latestArticles);
    });

    /* 技術の見どころ：解決・結果を折りたたむ */
    document.querySelectorAll(".tech-steps").forEach((steps, index) => {
        if (steps.children.length < 2) return;
        steps.id ||= `tech-steps-${index + 1}`;
        steps.classList.add("is-folded");

        const rest = Array.from(steps.children).slice(1)
            .map((step) => step.querySelector(".tech-step-label")?.textContent.trim())
            .filter(Boolean)
            .join("・") || "続き";

        const toggle = make("button", "tech-steps-toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-controls", steps.id);
        const label = make("span");
        const icon = decor(make("i"));
        toggle.append(label, icon);

        const render = () => {
            const open = !steps.classList.contains("is-folded");
            toggle.setAttribute("aria-expanded", String(open));
            label.textContent = open ? "閉じる" : `${rest}を読む`;
            icon.className = `fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`;
        };

        toggle.addEventListener("click", () => {
            steps.classList.toggle("is-folded");
            render();
            if (steps.classList.contains("is-folded")) {
                steps.closest(".tech-highlight")?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
            }
        });

        render();
        steps.after(toggle);
    });

    /* スマホで長いところを折りたたむ（PC では何も変わらない）
       ・container の中の hide に当たる要素を、ボタンを押すまで隠す
       ・開いた回数はアクセス解析に「くわしく: ○○」として記録される */
    const foldOnMobile = (container, hide, before, name, labels) => {
        const targets = container ? Array.from(container.querySelectorAll(hide)) : [];
        if (!targets.length) return;
        container.classList.add("is-mobile-folded");
        targets.forEach((target) => target.setAttribute("data-mobile-fold", ""));
        container.id ||= `mobile-fold-${Math.random().toString(36).slice(2, 8)}`;

        const toggle = make("button", "tech-steps-toggle mobile-fold-toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-controls", container.id);
        const label = make("span");
        const icon = decor(make("i"));
        toggle.append(label, icon);

        const render = () => {
            const open = !container.classList.contains("is-mobile-folded");
            toggle.setAttribute("aria-expanded", String(open));
            label.textContent = open ? labels[1] : labels[0];
            icon.className = `fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`;
        };
        toggle.addEventListener("click", () => {
            container.classList.toggle("is-mobile-folded");
            render();
            if (container.classList.contains("is-mobile-folded")) {
                toggle.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
            } else {
                emitPlayEvent(`くわしく: ${name}`);
            }
        });
        render();
        (before ? container.querySelector(before) : null)?.before(toggle) ?? container.append(toggle);
    };

    // Main Works：チーム構成・開発環境は、押したら開く
    document.querySelectorAll(".featured-container[data-work]").forEach((work) => {
        foldOnMobile(work.querySelector(".tech-log"), ".tech-grid", ".tech-grid", `${work.dataset.work} チーム構成`,
            ["チーム構成と開発環境を見る", "チーム構成と開発環境を閉じる"]);
    });

    // What I Can Do：ステータス画面の EXP（使った技術・担当）は、押したら開く
    // （ステータス画面は JS で作るので、作り終わってから）
    const foldStatus = () => {
        const status = document.querySelector(".status-screen");
        if (!status || status.hidden || status.querySelector(".mobile-fold-toggle")) return;
        foldOnMobile(status, ".status-exp", null, "スキルEXP", ["技術・担当ごとのEXPを見る", "EXPを閉じる"]);
    };
    foldStatus();
    window.addEventListener("load", foldStatus);

    // What I Can Do：3つのスキルセットを、スマホではタブで1つずつ見せる
    const canDo = document.getElementById("what-i-can-do");
    const categories = canDo ? Array.from(canDo.querySelectorAll(".can-do-category")) : [];
    if (categories.length > 1) {
        const tabs = make("div", "can-do-tabs");
        tabs.setAttribute("role", "group");
        tabs.setAttribute("aria-label", "スキルセットの切り替え");
        const buttons = categories.map((category, index) => {
            const button = make("button", "", textOf(category, ".can-do-category-title h3"));
            button.type = "button";
            button.addEventListener("click", () => select(index));
            tabs.append(button);
            return button;
        });
        const select = (current) => {
            categories.forEach((category, index) => category.classList.toggle("is-mobile-current", index === current));
            buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === current)));
            // 切り替えたスキルセットの横スワイプを先頭に戻す
            categories[current].querySelector(".can-do-list")?.scrollTo({ left: 0 });
        };
        canDo.classList.add("has-mobile-tabs");
        categories[0].before(tabs);
        select(0);
    }
})();

/* ========================================
   Other Works：作品の詳細ポップアップ
   - カードの画像・タイトルなどを押すと開く（「詳細を見る」は今まで通り note へ）
   - 中身はカードの内容をそのまま使うので、作品を追加しても書き足しは不要
   - ◀ ▶ で前後の作品へ（絞り込み中は、表示中の作品だけを順番に）
======================================== */

(() => {
    const list = document.querySelector(".works-list");
    if (!list || typeof HTMLDialogElement !== "function") return;

    const cards = Array.from(list.querySelectorAll(".work-card"));
    if (!cards.length) return;

    /* ---------- ポップアップの骨組み ---------- */

    const viewer = make("dialog", "work-viewer");
    viewer.setAttribute("aria-labelledby", "work-viewer-title");
    viewer.innerHTML = `
        <div class="work-viewer-panel">
            <div class="work-viewer-bar">
                <span class="work-viewer-stage" data-wv="stage"></span>
                <span class="work-viewer-count" data-wv="count"></span>
                <button type="button" class="work-viewer-close" aria-label="閉じる">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>
            <div class="work-viewer-body">
                <div class="work-viewer-media">
                    <img data-wv="image" alt="">
                    <div class="work-viewer-badges" data-wv="badges"></div>
                </div>
                <div class="work-viewer-info">
                    <p class="work-viewer-award" data-wv="award" hidden>
                        <i class="fa-solid fa-trophy" aria-hidden="true"></i><span></span>
                    </p>
                    <h3 id="work-viewer-title" data-wv="title"></h3>
                    <p class="work-viewer-genre" data-wv="genre"></p>
                    <p class="work-viewer-desc" data-wv="desc"></p>
                    <dl class="work-viewer-stats">
                        <div><dt>DATE</dt><dd data-wv="date"></dd></div>
                        <div><dt>TEAM</dt><dd data-wv="team"></dd></div>
                        <div class="is-wide"><dt>ROLE</dt><dd data-wv="role"></dd></div>
                    </dl>
                    <p class="work-viewer-label">TOOLS</p>
                    <ul class="work-viewer-tools" data-wv="tools"></ul>
                    <a class="work-viewer-link" data-wv="link" target="_blank" rel="noopener noreferrer">
                        <span>noteで制作記録を読む</span>
                        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                    </a>
                </div>
            </div>
            <div class="work-viewer-nav">
                <button type="button" class="work-viewer-prev" data-step="-1">
                    <i class="fa-solid fa-caret-left" aria-hidden="true"></i><span>前の作品</span>
                </button>
                <button type="button" class="work-viewer-next" data-step="1">
                    <span>次の作品</span><i class="fa-solid fa-caret-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>`;
    document.body.append(viewer);

    const part = (name) => viewer.querySelector(`[data-wv="${name}"]`);
    const panel = viewer.querySelector(".work-viewer-panel");
    const stepButtons = viewer.querySelectorAll("[data-step]");
    const visibleCards = () => cards.filter((card) => !card.hidden);
    let current = null;

    const announce = (card) => {
        document.dispatchEvent(new CustomEvent("work-viewer:open", { detail: { title: textOf(card, "h3") } }));
    };

    const render = (card) => {
        current = card;
        const image = card.querySelector("img:not(.card-pop)");
        const stage = textOf(card, ".stage-badges span:not(.is-award):not(.is-team):not(.is-wip)");
        const shown = visibleCards();

        part("stage").textContent = stage || "STAGE";
        part("count").textContent = shown.length > 1 ? `${shown.indexOf(card) + 1} / ${shown.length}` : "";

        const img = part("image");
        img.src = image?.currentSrc || image?.src || "";
        img.alt = image?.alt || "";
        img.width = image?.width || 16;
        img.height = image?.height || 9;

        part("badges").replaceChildren(...Array.from(card.querySelectorAll(".stage-badges span"))
            .filter((badge) => badge.textContent.trim() !== stage)
            .map((badge) => badge.cloneNode(true)));

        const award = part("award");
        award.hidden = !card.dataset.award;
        award.querySelector("span").textContent = card.dataset.award || "";

        const fields = { title: "h3", genre: ".work-genre", desc: ".work-description", date: ".work-period", team: ".work-member", role: ".work-role" };
        Object.entries(fields).forEach(([name, selector]) => {
            part(name).textContent = textOf(card, selector);
        });

        part("tools").replaceChildren(...textOf(card, ".work-tech").split(/\s+/).filter(Boolean).map((tool) => make("li", "", tool)));

        const source = card.querySelector("a.work-link, a[href]");
        const link = part("link");
        link.hidden = !source;
        if (source) link.href = source.href;

        stepButtons.forEach((button) => {
            button.hidden = shown.length < 2;
        });

        viewer.classList.toggle("is-rare", card.classList.contains("is-rare"));
        panel.scrollTop = 0;
        panel.classList.remove("is-switching");
        void panel.offsetWidth;
        panel.classList.add("is-switching");
    };

    const open = (card) => {
        render(card);
        if (!viewer.open) viewer.showModal();
        announce(card);
    };

    const step = (direction) => {
        const shown = visibleCards();
        if (shown.length < 2 || !current) return;
        const next = shown[(shown.indexOf(current) + direction + shown.length) % shown.length];
        render(next);
        announce(next);
    };

    /* ---------- 開く：カード（「詳細を見る」以外）を押したとき ---------- */

    cards.forEach((card) => {
        const image = card.querySelector("img");
        if (image && !image.closest(".work-thumb")) {
            const thumb = make("button", "work-thumb");
            thumb.type = "button";
            thumb.setAttribute("aria-label", `${textOf(card, "h3")} をくわしく見る`);
            image.before(thumb);
            const hint = decor(make("span", "work-thumb-hint"));
            hint.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>くわしく見る';
            thumb.append(image, hint);
        }

        card.classList.add("has-viewer");
        card.addEventListener("click", (event) => {
            if (!event.target.closest("a")) open(card);
        });
    });

    /* ---------- 閉じる・前後へ ---------- */

    viewer.querySelector(".work-viewer-close").addEventListener("click", () => viewer.close());
    stepButtons.forEach((button) => button.addEventListener("click", () => step(Number(button.dataset.step))));
    closeOnBackdrop(viewer);
    viewer.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "ArrowRight") step(1);
    });

    // スマホ：左右にスワイプしても前後の作品へ
    let touchX = null;
    let touchY = null;
    viewer.addEventListener("touchstart", (event) => {
        touchX = event.touches[0].clientX;
        touchY = event.touches[0].clientY;
    }, { passive: true });
    viewer.addEventListener("touchend", (event) => {
        if (touchX === null) return;
        const dx = event.changedTouches[0].clientX - touchX;
        const dy = event.changedTouches[0].clientY - touchY;
        touchX = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    // 閉じたら、元のカードが見える位置に戻す
    viewer.addEventListener("close", () => {
        if (!current) return;
        current.querySelector(".work-thumb")?.focus({ preventScroll: true });
        current.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    });
})();

/* ========================================
   30秒でわかる まとめ（Quick Guide）
   - 実績の数字は Achievements で計算した値をそのまま写す
   - 代表作を押すと、Main Works の該当タブに切り替えてから移動する
======================================== */

(() => {
    const summary = document.getElementById("summary");
    if (!summary) return;

    summary.querySelectorAll("[data-summary-stat]").forEach((target) => {
        const source = document.getElementById(target.dataset.summaryStat);
        if (!source) return;
        const copy = () => {
            if (source.dataset.value !== undefined) target.textContent = source.dataset.value;
        };
        copy();
        if ("MutationObserver" in window) {
            new MutationObserver(copy).observe(source, { attributes: true, attributeFilter: ["data-value"] });
        }
    });

    summary.querySelectorAll("[data-summary-tab]").forEach((link) => {
        link.addEventListener("click", () => {
            const tab = document.getElementById(link.dataset.summaryTab);
            if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
        });
    });
})();
