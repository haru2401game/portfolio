/* ========================================
   Scroll Animation Common
======================================== */

document.documentElement.classList.add("js-enabled");

function observeShow(elements, callback = null) {

    if (!elements || elements.length === 0) {
        return;
    }

    if (!("IntersectionObserver" in window)) {
        elements.forEach((element) => {
            if (element) {
                element.classList.add("show");
                if (callback) callback(element);
            }
        });
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("show");

                if (callback) {
                    callback(entry.target);
                }

                observer.unobserve(entry.target);

            });

        },
        {
            threshold: 0.05
        }
    );

    elements.forEach((element) => {

        if (element) {
            observer.observe(element);
        }

    });

}


/* ========================================
   Hero Animation
======================================== */

const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

const heroVideo = document.querySelector(".hero-video");
if (heroVideo && !prefersReducedMotion) {
    heroVideo.play().catch(() => {});
}

window.addEventListener("DOMContentLoaded", () => {

    const heroText =
        document.querySelector(".hero-content");

    if (!heroText) {
        return;
    }

    setTimeout(() => {
        heroText.classList.add("is-visible");
    }, 300);

});


/* ========================================
   Achievements Animation
======================================== */

const achievementCards =
    document.querySelectorAll(".achievement-card");

achievementCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.08}s`;
});

observeShow(achievementCards, (card) => {
    const value = card.querySelector("h3[data-value]");
    if (value) animateCount(value);
});


/* ========================================
   About Animation
======================================== */

observeShow(
    document.querySelectorAll(".about-container")
);


/* ========================================
   What I Can Do Animation
======================================== */

const whatCanBoxes =
    document.querySelectorAll(".can-do-card");


whatCanBoxes.forEach((box, index) => {

    box.style.transitionDelay =
        `${index * 0.05}s`;

});


observeShow(whatCanBoxes);


/* ========================================
   Featured Video Playback
======================================== */

const featuredVideo =
    document.querySelector(".featured-video video");

if (featuredVideo && !prefersReducedMotion) {
    if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    featuredVideo.play().catch(() => {});
                } else {
                    featuredVideo.pause();
                }
            });
        }, { rootMargin: "200px 0px" });

        videoObserver.observe(featuredVideo);
    } else {
        featuredVideo.play().catch(() => {});
    }
}


/* ========================================
   Featured Works Animation
======================================== */

observeShow(
    document.querySelectorAll(
        ".featured-video, .featured-container"
    )
);


/* ========================================
   Other Works Animation
======================================== */

const workCards =
    document.querySelectorAll(".work-card");


workCards.forEach((card, index) => {

    card.style.transitionDelay =
        `${index * 0.01}s`;

});


observeShow(workCards);


/* ========================================
   Blog Introduction Animation
======================================== */

const blogIntroduction =
    document.querySelector(".blog-introduction");


observeShow(
    document.querySelectorAll(".blog-introduction"),
    (intro) => {
        const counter = intro.querySelector("#article-count[data-value]");
        if (counter) animateCount(counter);
        startTypewriter(intro.querySelector(".blog-message"));
    }
);


/* ========================================
   Timeline Animation
======================================== */

const timelineItems =
    document.querySelectorAll(".timeline-item");


timelineItems.forEach((item, index) => {

    item.style.transitionDelay =
        `${index * 0.05}s`;

});


observeShow(timelineItems);


/* ========================================
   Play Games Animation
======================================== */

const playCards =
    document.querySelectorAll(".play-card");


playCards.forEach((card, index) => {

    card.style.transitionDelay =
        `${index * 0.05}s`;

});


observeShow(playCards);


/* ========================================
   Contact Animation
======================================== */

const contactContainer =
    document.querySelector(".contact-container");


if (contactContainer) {

    observeShow(
        document.querySelectorAll(".contact-container")
    );

}


const snsCards =
    document.querySelectorAll(".sns-card");


snsCards.forEach((card, index) => {

    card.style.transitionDelay =
        `${index * 0.05}s`;

});


observeShow(snsCards);


/* ========================================
   Blog Data
======================================== */

const articleCounter =
    document.getElementById("article-count");


const blogCount =
    document.getElementById("blogCount");


const latestArticles =
    document.getElementById("latestArticles");

function safeWebUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.href
            : "";
    } catch {
        return "";
    }
}


fetch("data/blog.json")

    .then((response) => {

        if (!response.ok) {

            throw new Error(
                "blog.json の読み込みに失敗しました。"
            );

        }

        return response.json();

    })

    .then((data) => {

        /* --------------------------------
           Article Count
        -------------------------------- */

        if (articleCounter) {

            setBlogCount(articleCounter, data.articleCount);

        }


        /* --------------------------------
           Achievements Blog Count
        -------------------------------- */

        if (blogCount) {

            setStat(blogCount, data.articleCount);

        }


        /* --------------------------------
           Latest Articles
        -------------------------------- */

        if (!latestArticles) {
            return;
        }


        latestArticles.querySelectorAll(".article-card").forEach((card) => card.remove());


        if (
            !data.articles ||
            !Array.isArray(data.articles)
        ) {

            console.warn(
                "blog.json に articles が存在しません。"
            );

            return;

        }


        data.articles.forEach((article, index) => {

            const articleCard =
                document.createElement("article");

            articleCard.className =
                "article-card";


            const title = String(article.title || "");
            const imageUrl = safeWebUrl(article.thumbnail);
            const articleUrl = safeWebUrl(article.url);

            const image = document.createElement("img");
            if (imageUrl) image.src = imageUrl;
            image.alt = title;
            image.loading = "lazy";

            const content = document.createElement("div");
            content.className = "article-content";

            const date = document.createElement("p");
            date.className = "article-date";
            date.textContent = String(article.date || "");

            const heading = document.createElement("h3");
            heading.textContent = title;

            const summary = document.createElement("p");
            summary.className = "article-summary";
            summary.textContent = String(article.summary || "");

            content.append(date, heading, summary);

            if (articleUrl) {
                const link = document.createElement("a");
                link.href = articleUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "記事を読む →";
                content.append(link);
            }

            const badges = document.createElement("div");
            badges.className = "article-badges";
            badges.setAttribute("aria-hidden", "true");

            if (index === 0) {
                const fresh = document.createElement("span");
                fresh.className = "is-new";
                fresh.textContent = "NEW!";
                badges.append(fresh);
            }

            const issue = title.match(/#(\d+)/);
            if (issue) {
                const log = document.createElement("span");
                log.textContent = `LOG #${issue[1]}`;
                badges.append(log);
            }

            articleCard.append(image, badges, content);


            latestArticles.appendChild(
                articleCard
            );

        });


        /* --------------------------------
           Generated Article Animation
        -------------------------------- */

        const articleCards =
            latestArticles.querySelectorAll(
                ".article-card"
            );


        articleCards.forEach((card, index) => {

            card.style.transitionDelay =
                `${index * 0.05}s`;

        });


        observeShow(articleCards);

    })

    .catch((error) => {

        console.error(
            "Blog Data Error:",
            error
        );

    });


/* ========================================
   Profile Data
======================================== */

const gameCount =
    document.getElementById("gameCount");


const awardCount =
    document.getElementById("awardCount");


const eventCount =
    document.getElementById("eventCount");


const internCount =
    document.getElementById("internCount");


const careerCount =
    document.getElementById("careerCount");


fetch("data/profile.json")

    .then((response) => {

        if (!response.ok) {

            throw new Error(
                "profile.json の読み込みに失敗しました。"
            );

        }

        return response.json();

    })

    .then((data) => {

        /* --------------------------------
           Game Works
        -------------------------------- */

        if (gameCount) {

            setStat(gameCount, document.querySelectorAll(
                    ".work-card"
                ).length);

        }


        /* --------------------------------
           Awards
        -------------------------------- */

        if (awardCount) {

            setStat(awardCount, data.awardCount);

        }


        /* --------------------------------
           Events
        -------------------------------- */

        if (eventCount) {

            setStat(eventCount, data.eventCount);

        }


        /* --------------------------------
           Internship
        -------------------------------- */

        if (internCount) {

            setStat(internCount, data.internCount);

        }


        /* --------------------------------
           Years Developing
        -------------------------------- */

        if (careerCount) {

            setStat(careerCount, data.careerCount);

        }

    })

    .catch((error) => {

        console.error(
            "Profile Data Error:",
            error
        );

    });


/* ========================================
   Hamburger Menu
======================================== */

const hamburger =
    document.querySelector(".hamburger");


const headerNav =
    document.querySelector(".header-nav");


const navLinks =
    document.querySelectorAll(".header-nav a");


if (hamburger && headerNav) {

    const setMenuOpen = (isOpen) => {
        hamburger.classList.toggle("active", isOpen);
        headerNav.classList.toggle("active", isOpen);
        document.body.classList.toggle("menu-open", isOpen);
        hamburger.setAttribute("aria-expanded", String(isOpen));
        hamburger.setAttribute(
            "aria-label",
            isOpen ? "メニューを閉じる" : "メニューを開く"
        );
    };

    hamburger.addEventListener(
        "click",
        () => {
            setMenuOpen(!headerNav.classList.contains("active"));
        }
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && headerNav.classList.contains("active")) {
            setMenuOpen(false);
            hamburger.focus();
        }
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
    });

    const headerLogo = document.querySelector(".header-logo");
    if (headerLogo) {
        headerLogo.addEventListener("click", () => setMenuOpen(false));
    }

}


/* ========================================
   Game UI: Achievements Status Screen
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

    if (prefersReducedMotion || target === 0) {
        element.textContent = target + (element.dataset.suffix || "");
        return;
    }

    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased) + (element.dataset.suffix || "");
        if (progress >= 1) element.classList.add("is-counted");
        if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function setStat(element, value) {
    if (!element) return;

    const number = Number(value);
    if (!Number.isFinite(number)) return;

    element.dataset.value = number;

    const card = element.closest(".achievement-card");

    if (card) {
        let meter = card.querySelector(".stat-meter");

        if (!meter) {
            meter = document.createElement("div");
            meter.className = "stat-meter";
            meter.setAttribute("aria-hidden", "true");

            const gauge = document.createElement("div");
            gauge.className = "stat-gauge";
            gauge.append(document.createElement("span"));

            const next = document.createElement("span");
            next.className = "stat-next";

            meter.append(gauge, next);
            card.append(meter);
        }

        const milestone = nextMilestone(number);
        meter.style.setProperty("--fill", (number / milestone).toFixed(3));
        meter.querySelector(".stat-next").textContent = `NEXT ${milestone}`;
    }

    if (!card || card.classList.contains("show")) {
        animateCount(element);
    } else {
        element.textContent = "0";
    }
}

function showAchievementToast() {
    try {
        if (sessionStorage.getItem("achievement-toast") === "1") return;
        sessionStorage.setItem("achievement-toast", "1");
    } catch {
        /* storage unavailable: show the toast anyway */
    }

    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.setAttribute("role", "status");

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.innerHTML = '<i class="fa-solid fa-trophy" aria-hidden="true"></i>';

    const text = document.createElement("span");
    text.className = "toast-text";
    const label = document.createElement("small");
    label.textContent = "ACHIEVEMENT UNLOCKED";
    const message = document.createElement("strong");
    message.textContent = "制作実績をチェックした";
    text.append(label, message);

    toast.append(icon, text);
    document.body.append(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("is-visible"));
    });

    setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => toast.remove(), 600);
    }, 4200);
}

const achievementsSection = document.getElementById("achievements");

if (achievementsSection && "IntersectionObserver" in window) {
    const toastObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            toastObserver.disconnect();
            setTimeout(showAchievementToast, 900);
        }
    }, { threshold: 0.45 });

    toastObserver.observe(achievementsSection);
}


/* ========================================
   Game UI: Other Works Stage Select
======================================== */

const worksList = document.querySelector(".works-list");

if (worksList) {
    const cards = Array.from(worksList.querySelectorAll(".work-card"));
    const total = cards.length;

    const readText = (card, selector) =>
        (card.querySelector(selector)?.textContent || "").trim();

    cards.forEach((card, index) => {
        const tech = readText(card, ".work-tech");
        const genre = readText(card, ".work-genre");
        const member = parseInt(readText(card, ".work-member"), 10) || 1;
        const role = readText(card, ".work-role");

        card.dataset.unity = String(/unity/i.test(tech));
        card.dataset.cpp = String(/directx|dxlib/i.test(tech));
        card.dataset.threeD = String(/3D/.test(genre));
        card.dataset.team = String(member > 1);

        const badges = document.createElement("div");
        badges.className = "stage-badges";
        badges.setAttribute("aria-hidden", "true");

        const stage = document.createElement("span");
        stage.textContent = `STAGE ${String(total - index).padStart(2, "0")}`;
        badges.append(stage);

        if (member > 1) {
            const team = document.createElement("span");
            team.className = "is-team";
            team.textContent = `TEAM ×${member}`;
            badges.append(team);
        }

        if (role.includes("未完成")) {
            const wip = document.createElement("span");
            wip.className = "is-wip";
            wip.textContent = "WIP";
            badges.append(wip);
        }

        card.append(badges);
    });

    const filters = [
        { label: "すべて", test: () => true },
        { label: "Unity", test: (card) => card.dataset.unity === "true" },
        { label: "C++ / DirectX・DxLib", test: (card) => card.dataset.cpp === "true" },
        { label: "3D", test: (card) => card.dataset.threeD === "true" },
        { label: "チーム制作", test: (card) => card.dataset.team === "true" },
        { label: "個人制作", test: (card) => card.dataset.team !== "true" }
    ];

    const bar = document.createElement("div");
    bar.className = "stage-filter";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "作品の絞り込み");

    const barLabel = document.createElement("span");
    barLabel.className = "stage-filter-label";
    barLabel.textContent = "SELECT STAGE";
    bar.append(barLabel);

    const buttons = filters.map((filter, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-pressed", String(index === 0));

        const name = document.createElement("span");
        name.textContent = filter.label;

        const count = document.createElement("b");
        count.textContent = cards.filter(filter.test).length;

        button.append(name, count);

        button.addEventListener("click", () => {
            buttons.forEach((other) =>
                other.setAttribute("aria-pressed", String(other === button))
            );

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
}


/* ========================================
   Other Works Count
======================================== */

const workCount = document.getElementById("workCount");

if (workCount) {
    workCount.textContent = document.querySelectorAll(".work-card").length;
}


/* ========================================
   Game UI: Blog (message window + EXP)
======================================== */

function setBlogCount(element, value) {
    const number = Number(value);
    if (!element || !Number.isFinite(number)) return;

    element.dataset.value = number;
    element.dataset.suffix = "+";

    const stat = element.closest(".blog-stat");
    if (stat && !stat.querySelector(".blog-exp")) {
        const milestone = nextMilestone(number);
        const meter = document.createElement("div");
        meter.className = "blog-exp";
        meter.setAttribute("aria-hidden", "true");
        meter.style.setProperty("--fill", (number / milestone).toFixed(3));

        const gauge = document.createElement("div");
        gauge.className = "stat-gauge";
        gauge.append(document.createElement("span"));

        const next = document.createElement("span");
        next.className = "blog-exp-next";
        next.textContent = `NEXT ${milestone}`;

        meter.append(gauge, next);
        stat.append(meter);
    }

    const intro = element.closest(".blog-introduction");
    if (!intro || intro.classList.contains("show")) {
        animateCount(element);
    } else {
        element.textContent = "0+";
    }
}

/* RPG-style message window: the description types itself out */
const blogMessage = document.querySelector(".blog-intro-content > p");

if (blogMessage) {
    const fullText = blogMessage.textContent.replace(/\s+/g, " ").trim();
    blogMessage.classList.add("blog-message");
    blogMessage.replaceChildren();

    const srText = document.createElement("span");
    srText.className = "sr-only";
    srText.textContent = fullText;

    const typed = document.createElement("span");
    typed.className = "blog-message-text";
    typed.setAttribute("aria-hidden", "true");

    const cursor = document.createElement("span");
    cursor.className = "blog-message-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.textContent = "▼";

    blogMessage.append(srText, typed, cursor);
    blogMessage.dataset.text = fullText;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        typed.textContent = fullText;
        blogMessage.classList.add("is-done");
    }
}

function startTypewriter(message) {
    if (!message || message.dataset.started) return;
    message.dataset.started = "1";

    const typed = message.querySelector(".blog-message-text");
    const text = message.dataset.text || "";

    if (prefersReducedMotion) {
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
   Ambient Motion: the page is always alive
======================================== */

/* Floating game motifs drifting behind every section */
const ambientShapes = ["✦", "●", "▲", "■", "✚", "◆", "★", "●"];
const ambientColors = ["#00a3e0", "#ff5a5f", "#ffb300", "#22c55e", "#8b5cf6", "#ff7a1a"];
const ambientSpots = [
    [4, 14], [93, 10], [7, 82], [90, 76], [48, 4], [97, 44], [2, 48], [62, 94]
];

document.querySelectorAll("section").forEach((section, sectionIndex) => {
    const layer = document.createElement("div");
    layer.className = "ambient";
    layer.setAttribute("aria-hidden", "true");

    const count = section.classList.contains("hero") ? 8 : 6;

    for (let i = 0; i < count; i += 1) {
        const shape = document.createElement("i");
        const [x, y] = ambientSpots[i];
        const seed = (sectionIndex * 7 + i * 3) % 10;

        shape.textContent = ambientShapes[(sectionIndex + i) % ambientShapes.length];
        shape.style.left = `${x}%`;
        shape.style.top = `${y}%`;
        shape.style.setProperty("--c", ambientColors[(sectionIndex + i) % ambientColors.length]);
        shape.style.setProperty("--s", `${14 + seed * 2}px`);
        shape.style.setProperty("--d", `${6 + seed * 0.7}s`);
        shape.style.setProperty("--delay", `${-seed * 0.9}s`);
        shape.style.setProperty("--r", `${seed % 2 ? 24 : -24}deg`);

        layer.append(shape);
    }

    section.append(layer);
});

/* Stagger idle motion so repeated items never move in lockstep */
[".achievement-list", ".can-do-list", ".play-container", ".sns-list", ".latest-articles"].forEach((selector) => {
    document.querySelectorAll(selector).forEach((list) => {
        Array.from(list.children).forEach((item, index) => {
            item.style.setProperty("--idle-delay", `${-index * 0.45}s`);
        });
    });
});

const latestArticlesList = document.getElementById("latestArticles");
if (latestArticlesList && "MutationObserver" in window) {
    new MutationObserver(() => {
        Array.from(latestArticlesList.querySelectorAll(".article-card")).forEach((item, index) => {
            item.style.setProperty("--idle-delay", `${-index * 0.45}s`);
        });
    }).observe(latestArticlesList, { childList: true });
}

/* Pause idle motion for sections that are off screen */
if ("IntersectionObserver" in window) {
    const idleObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
        });
    }, { rootMargin: "120px 0px" });

    document.querySelectorAll("section, footer").forEach((section) => {
        idleObserver.observe(section);
    });
}


/* ========================================
   Characters: peek, drift and pop
======================================== */

const CHARACTER_PATH = "images/character/";

function makeSprite(file, className) {
    const img = document.createElement("img");
    img.src = CHARACTER_PATH + file;
    img.alt = "";
    img.className = className;
    img.decoding = "async";
    img.loading = "lazy";
    img.setAttribute("aria-hidden", "true");
    img.draggable = false;
    return img;
}

/* 1. Peek: a character rises from behind a box edge now and then */
const peekers = [
    { host: ".hero-screen", file: "Koutei.png", x: "72%", w: 84, delay: 2 },
    { host: ".about-container", file: "Pensand.png", x: "8%", w: 92, delay: 1 },
    { host: ".status-header", file: "Penko.png", x: "38%", w: 72, delay: 4 },
    { host: ".can-do-category:nth-child(3) .can-do-card:nth-child(2)", file: "Openji.png", x: "62%", w: 56, delay: 5.5 },
    { host: ".featured-info", file: "Ojisand.png", x: "82%", w: 76, delay: 3 },
    { host: ".works-list", file: "Penzou.png", x: "90%", w: 72, delay: 6.5 },
    { host: ".latest-articles", file: "Penny.png", x: "84%", w: 80, delay: 2.5 },
    { host: '.timeline-item[data-quest="now"] .timeline-content', file: "Chrono_0.png", side: true, y: "18%", w: 64, delay: 0.5 },
    { host: ".play-container", file: "Machopen.png", x: "6%", w: 80, delay: 6 },
    { host: ".sns-list", file: "Player.png", x: "88%", w: 64, delay: 3.5 },
    { host: "footer", file: "Clone_0.png", x: "46%", w: 64, delay: 7.5 }
];

peekers.forEach((config) => {
    const host = document.querySelector(config.host);
    if (!host) return;

    const window_ = document.createElement("div");
    window_.className = "peeker";
    window_.setAttribute("aria-hidden", "true");
    window_.style.setProperty("--peek-x", config.x);
    window_.style.setProperty("--peek-w", `${config.w}px`);
    window_.style.setProperty("--peek-delay", `${config.delay}s`);
    if (config.side) {
        window_.classList.add("is-side");
        window_.style.setProperty("--peek-y", config.y);
    }

    window_.append(makeSprite(config.file, "peeker-sprite"));
    host.classList.add("has-peeker");
    host.append(window_);
});

/* 2. Drift: characters float across the background like they're in space */
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
    { section: ".contact", file: "RedFish.png", y: "70%", w: 56, d: 36, delay: -18 }
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

/* 3. Pop: hovering a card makes a character jump out of it */
const popCast = {
    ".play-card": ["Pensand.png", "Penko.png", "Machopen.png"],
    ".sns-card": ["Koutei.png", "RedFish.png", "Chrono_0.png", "Ojisand.png", "Fish.png"]
};

Object.entries(popCast).forEach(([selector, cast]) => {
    document.querySelectorAll(selector).forEach((card, index) => {
        card.append(makeSprite(cast[index % cast.length], "card-pop"));
    });
});


/* Blog article cards are created after blog.json loads, so give them pops when they arrive */
const articlePopCast = ["Openji.png", "Penzou.png", "Clone_0.png"];
const articleList = document.getElementById("latestArticles");

if (articleList && "MutationObserver" in window) {
    new MutationObserver(() => {
        articleList.querySelectorAll(".article-card").forEach((card, index) => {
            if (card.querySelector(".card-pop")) return;
            card.append(makeSprite(articlePopCast[index % articlePopCast.length], "card-pop"));
        });
    }).observe(articleList, { childList: true });
}
