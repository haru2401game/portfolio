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

/* Motion switch: remembers the visitor's choice, defaults to OFF for reduced-motion users */
const MOTION_STORAGE_KEY = "portfolio-motion";

function motionOff() {
    return document.documentElement.classList.contains("motion-off");
}

(() => {
    let saved = null;
    try {
        saved = localStorage.getItem(MOTION_STORAGE_KEY);
    } catch {
        saved = null;
    }
    const off = saved ? saved === "off" : prefersReducedMotion;
    document.documentElement.classList.toggle("motion-off", off);
})();

const heroVideo = document.querySelector(".hero-video");
if (heroVideo && !motionOff()) {
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
    const value = card.querySelector(".achievement-value[data-value]");
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

if (featuredVideo && !motionOff()) {
    if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !motionOff()) {
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


/* blog.json is the live source. When it cannot be fetched (e.g. index.html
   opened directly from the folder via file://), fall back to data/blog.js,
   a script copy of the same data (window.BLOG_DATA). */
fetch("data/blog.json")

    .then((response) => {

        if (!response.ok) {

            throw new Error(
                "blog.json の読み込みに失敗しました。"
            );

        }

        return response.json();

    })

    .catch((error) => {

        if (window.BLOG_DATA) return window.BLOG_DATA;
        throw error;

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

    /* profile.json が読めないとき（ファイルを直接開いた場合など）も、
       ページ内から数えられる数字は表示する */
    .catch((error) => {

        console.warn("Profile Data Error:", error);
        return {};

    })

    .then((data) => {

        /* --------------------------------
           Game Works
        -------------------------------- */

        if (gameCount) {

            /* Other Works cards + Main Works titles */
            setStat(gameCount,
                document.querySelectorAll(".work-card").length +
                document.querySelectorAll(".featured-container[data-work]").length);

        }


        /* --------------------------------
           Awards
        -------------------------------- */

        if (awardCount) {

            /* Awards are counted from the timeline (quests marked data-quest="award"),
               so adding an award there updates this number automatically.
               profile.json is only used if the timeline has no award entries. */
            const awardQuests =
                document.querySelectorAll('.timeline-item[data-quest="award"]').length;

            setStat(awardCount, awardQuests || data.awardCount);

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

            /* Counted from the timeline: quests whose title mentions an internship */
            const internQuests = Array.from(
                document.querySelectorAll(".timeline-item h3")
            ).filter((title) => /インターン|intern/i.test(title.textContent)).length;

            setStat(internCount, internQuests || data.internCount);

        }


        /* --------------------------------
           Years Developing
        -------------------------------- */

        if (careerCount) {

            /* Counted from the first timeline date (e.g. 2025.04) to today, rounded up:
               1年目, 2年目 ... と自動で増える */
            const dates = Array.from(document.querySelectorAll(".timeline-date"))
                .map((date) => date.textContent.trim().match(/^(\d{4})\.(\d{1,2})/))
                .filter(Boolean)
                .map(([, year, month]) => Number(year) * 12 + Number(month) - 1);

            let years = data.careerCount;
            if (dates.length) {
                const now = new Date();
                const months = now.getFullYear() * 12 + now.getMonth() - Math.min(...dates);
                years = Math.max(1, Math.ceil((months + 1) / 12));
            }

            setStat(careerCount, years);

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

    if (motionOff() || target === 0) {
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

    /* Award-winning works are found automatically from the timeline:
       an award quest (data-quest="award") that names a work in 「」 marks that card as RARE. */
    const normalizeTitle = (text) => text.toLowerCase().replace(/[\s　]/g, "");
    const awardsByTitle = new Map();

    document.querySelectorAll('.timeline-item[data-quest="award"]').forEach((quest) => {
        const title = (quest.querySelector("h3")?.textContent || "").replace(/[\[\]\s]/g, "");
        const body = (quest.querySelector("p")?.textContent || "").replace(/\s+/g, "");
        const pattern = /[A-Za-z0-9]*グランプリ|クラス内1位|総合1位|[一-龠ァ-ヶーA-Za-z0-9]{1,6}?賞/g;
        const label = [...`${title} ${body}`.matchAll(pattern)]
            .map((match) => match[0])
            .find((text) => text !== "受賞") || "AWARD";
        const date = (quest.querySelector(".timeline-date")?.textContent || "").trim();

        for (const [, name] of body.matchAll(/「([^」]+)」/g)) {
            awardsByTitle.set(normalizeTitle(name), { label, date });
        }
    });

    /* Main Works can be award winners too (used by the status screen) */
    document.querySelectorAll(".featured-container[data-work]").forEach((work) => {
        const award = awardsByTitle.get(normalizeTitle(work.dataset.work));
        if (award) work.dataset.award = award.label;
    });

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

        const award = awardsByTitle.get(normalizeTitle(readText(card, "h3")));

        if (award) {
            card.classList.add("is-rare");
            card.dataset.award = award.label;

            const rare = document.createElement("span");
            rare.className = "is-award";
            rare.textContent = "★ RARE";
            badges.prepend(rare);

            const ribbon = document.createElement("p");
            ribbon.className = "award-ribbon";
            ribbon.innerHTML = '<i class="fa-solid fa-trophy" aria-hidden="true"></i>';
            ribbon.append(document.createTextNode(award.label));
            card.querySelector(".work-content")?.prepend(ribbon);

            const shine = document.createElement("span");
            shine.className = "rare-shine";
            shine.setAttribute("aria-hidden", "true");
            card.append(shine);
        }

        card.append(badges);
    });

    const filters = [
        { label: "すべて", test: () => true },
        { label: "★ 受賞作", test: (card) => card.classList.contains("is-rare") },
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

    /* Collapsible drawer: closed by default, opened with a big stage-select button */
    const worksSection = document.getElementById("other-works");

    const drawer = document.createElement("div");
    drawer.className = "works-drawer";
    drawer.id = "works-drawer";

    const drawerInner = document.createElement("div");
    drawerInner.className = "works-drawer-inner";

    bar.before(drawer);
    drawer.append(drawerInner);
    drawerInner.append(bar, worksList);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "works-toggle";
    toggle.setAttribute("aria-controls", "works-drawer");

    const toggleLabel = document.createElement("span");
    toggleLabel.className = "works-toggle-label";
    toggleLabel.textContent = "SELECT STAGE";

    const toggleText = document.createElement("span");
    toggleText.className = "works-toggle-text";

    const thumbs = document.createElement("span");
    thumbs.className = "works-toggle-thumbs";
    thumbs.setAttribute("aria-hidden", "true");
    [0, 1, 2, 3].map((i) => cards[Math.floor((i * total) / 4)]).filter(Boolean).forEach((card) => {
        const source = card.querySelector("img");
        if (!source) return;
        const thumb = document.createElement("img");
        thumb.src = source.getAttribute("src");
        thumb.alt = "";
        thumb.loading = "lazy";
        thumbs.append(thumb);
    });

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "works-toggle-icon";
    toggleIcon.setAttribute("aria-hidden", "true");
    toggleIcon.textContent = "▼";

    toggle.append(toggleLabel, toggleText, thumbs, toggleIcon);
    drawer.before(toggle);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "works-close";
    closeButton.textContent = "▲ 作品一覧を閉じる";
    drawerInner.append(closeButton);

    const setWorksOpen = (open, { scroll = false } = {}) => {
        drawer.classList.toggle("is-open", open);
        drawer.classList.remove("is-settled");
        toggle.setAttribute("aria-expanded", String(open));
        toggleText.textContent = open ? "作品一覧を閉じる" : `全${total}作品を見る`;
        drawer.inert = !open;

        if (open && prefersReducedMotion) {
            drawer.classList.add("is-settled");
        }

        if (!open && scroll && worksSection) {
            worksSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
    };

    drawer.addEventListener("transitionend", (event) => {
        if (event.target === drawer && drawer.classList.contains("is-open")) {
            drawer.classList.add("is-settled");
        }
    });

    toggle.addEventListener("click", () => {
        setWorksOpen(!drawer.classList.contains("is-open"));
    });

    closeButton.addEventListener("click", () => {
        setWorksOpen(false, { scroll: true });
    });

    /* Links that point at the works section (e.g. the hero's "すべての作品") open the drawer */
    document.querySelectorAll('a[href="#other-works"]').forEach((link) => {
        link.addEventListener("click", () => {
            if (buttons[0].getAttribute("aria-pressed") !== "true") buttons[0].click();
            setWorksOpen(true);
        });
    });

    setWorksOpen(location.hash === "#other-works");
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

    if (motionOff() || !("IntersectionObserver" in window)) {
        typed.textContent = fullText;
        blogMessage.classList.add("is-done");
    }
}

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
    { host: ".can-do-category:nth-child(2 of .can-do-category) .can-do-card:nth-child(2)", file: "Openji.png", x: "62%", w: 56, delay: 5.5 },
    { host: ".featured-info", file: "Ojisand.png", x: "82%", w: 76, delay: 3 },
    { host: ".works-toggle", file: "Penzou.png", x: "84%", w: 72, delay: 6.5 },
    { host: ".latest-articles-wrap", file: "Penny.png", x: "84%", w: 80, delay: 2.5 },
    { host: '.timeline-item[data-quest="now"] .timeline-content', file: "Chrono_0.png", side: true, y: "18%", w: 64, delay: 0.5 },
    { host: ".play-container", file: "Machopen.png", x: "6%", w: 80, delay: 6 },
    { host: ".mail-card", file: "Player.png", x: "88%", w: 64, delay: 3.5 },
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


/* ========================================
   Motion Switch (header)
======================================== */

const motionToggle = document.querySelector(".motion-toggle");

function syncMotionToggle() {
    if (!motionToggle) return;
    const on = !motionOff();
    motionToggle.setAttribute("aria-checked", String(on));
    const state = motionToggle.querySelector(".motion-toggle-state");
    if (state) state.textContent = on ? "ON" : "OFF";
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
}

if (motionToggle) {
    syncMotionToggle();

    motionToggle.addEventListener("click", () => {
        const turnOff = !motionOff();
        document.documentElement.classList.toggle("motion-off", turnOff);

        try {
            localStorage.setItem(MOTION_STORAGE_KEY, turnOff ? "off" : "on");
        } catch {
            /* storage unavailable: the switch still works for this visit */
        }

        [heroVideo, featuredVideo].forEach((video) => {
            if (!video) return;
            if (turnOff) {
                video.pause();
            } else if (isInViewport(video)) {
                video.play().catch(() => {});
            }
        });

        syncMotionToggle();
    });
}

/* ========================================
   Mail: copy address
======================================== */

document.querySelectorAll(".mail-copy").forEach((button) => {
    const label = button.querySelector("span");
    const original = label ? label.textContent : "";

    button.addEventListener("click", async () => {
        const text = button.dataset.copy || "";
        let copied = false;

        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch {
            const field = document.createElement("textarea");
            field.value = text;
            field.setAttribute("readonly", "");
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.append(field);
            field.select();
            try {
                copied = document.execCommand("copy");
            } catch {
                copied = false;
            }
            field.remove();
        }

        if (label) label.textContent = copied ? "コピーしました！" : "コピーできませんでした";
        button.classList.toggle("is-copied", copied);

        setTimeout(() => {
            if (label) label.textContent = original;
            button.classList.remove("is-copied");
        }, 2000);
    });
});


/* ========================================
   Timeline: show the latest 3 quests, fold the rest
======================================== */

(() => {
    const container = document.querySelector(".timeline-container");
    if (!container) return;

    const items = Array.from(container.querySelectorAll(".timeline-item"));
    const VISIBLE = 3;
    if (items.length <= VISIBLE) return;

    const older = items.slice(0, items.length - VISIBLE);

    const drawer = document.createElement("div");
    drawer.className = "quest-drawer";
    drawer.id = "quest-drawer";

    const inner = document.createElement("div");
    inner.className = "quest-drawer-inner";

    older[0].before(drawer);
    drawer.append(inner);
    inner.append(...older);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "quest-toggle";
    toggle.setAttribute("aria-controls", "quest-drawer");

    const icon = document.createElement("span");
    icon.className = "quest-toggle-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▲";

    const text = document.createElement("span");
    text.className = "quest-toggle-text";

    const count = document.createElement("span");
    count.className = "quest-toggle-count";
    count.textContent = `QUEST 01–${String(older.length).padStart(2, "0")}`;

    toggle.append(icon, text, count);
    container.before(toggle);

    const timelineSection = document.getElementById("timeline");

    const setOpen = (open) => {
        drawer.classList.toggle("is-open", open);
        drawer.classList.remove("is-settled");
        drawer.inert = !open;
        toggle.setAttribute("aria-expanded", String(open));
        text.textContent = open
            ? "これまでのクエストを閉じる"
            : `これまでのクエストを見る（${older.length}件）`;

        if (open && prefersReducedMotion) drawer.classList.add("is-settled");
        if (!open && timelineSection && timelineSection.getBoundingClientRect().top < 0) {
            timelineSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        }
    };

    drawer.addEventListener("transitionend", (event) => {
        if (event.target === drawer && drawer.classList.contains("is-open")) {
            drawer.classList.add("is-settled");
        }
    });

    toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));
    setOpen(false);
})();


/* ========================================
   Photo viewer (Main Works gallery)
======================================== */

(() => {
    const photos = document.querySelectorAll(".tech-photo, .timeline-photo");
    if (!photos.length || typeof HTMLDialogElement !== "function") return;

    const viewer = document.createElement("dialog");
    viewer.className = "photo-viewer";
    viewer.setAttribute("aria-label", "写真の拡大表示");

    const figure = document.createElement("figure");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "photo-viewer-close";
    close.setAttribute("aria-label", "閉じる");
    close.textContent = "×";

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

    /* Clicking the dark backdrop (outside the photo) closes the viewer */
    viewer.addEventListener("click", (event) => {
        if (event.target === viewer) viewer.close();
    });
})();

/* ========================================
   3D Challenge Progress
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
    const count = progress.querySelector("[data-challenge-count]");
    const next = progress.querySelector("[data-challenge-next]");

    count.textContent = done;
    bar.setAttribute("aria-valuenow", done);
    bar.setAttribute("aria-valuetext", `${total}本中${done}本完成`);
    bar.style.setProperty("--challenge-total", total);

    for (let i = 1; i <= total; i += 1) {
        const pip = document.createElement("span");
        pip.className = "challenge-pip";
        if (i <= done) pip.classList.add("is-done");
        if (i === done + 1) pip.classList.add("is-next");
        pip.style.setProperty("--i", i);
        bar.append(pip);
    }

    if (done >= total) {
        progress.classList.add("is-complete");
        next.textContent = "COMPLETE! 10本制作達成";
    } else {
        next.textContent = `NEXT ▶ 3D CHALLENGE #${String(done + 1).padStart(2, "0")} 制作中`;
    }

    observeShow([progress]);
})();

/* ========================================
   Status screen (What I Can Do)
   作品カードから自動で集計する：使った技術・担当した役割・制作人数
======================================== */

(() => {
    const host = document.querySelector(".status-screen");
    const cards = Array.from(document.querySelectorAll(".work-card"));
    if (!host || !cards.length) return;

    const text = (card, selector) => (card.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();

    /* All works = Other Works cards + Main Works titles (data-* on .featured-container) */
    const works = [
        ...cards.map((card) => ({
            tech: text(card, ".work-tech"),
            role: text(card, ".work-role"),
            member: parseInt(text(card, ".work-member"), 10) || 1,
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
        ["DxLib", /dxlib/i],
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
    const awards = document.querySelectorAll('.timeline-item[data-quest="award"]').length;
    const rare = count((work) => work.rare);

    const firstDate = Array.from(document.querySelectorAll(".timeline-date"))
        .map((date) => date.textContent.trim().match(/^(\d{4})\.(\d{1,2})/))
        .filter(Boolean)
        .map(([, y, m]) => Number(y) * 12 + Number(m) - 1)
        .sort((a, b) => a - b)[0];
    const now = new Date();
    const level = firstDate === undefined ? 1 : Math.max(1, Math.ceil((now.getFullYear() * 12 + now.getMonth() - firstDate + 1) / 12));

    const make = (tag, className, content) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content !== undefined) element.textContent = content;
        return element;
    };

    /* Profile panel */
    const profile = make("div", "status-profile");
    profile.append(
        make("span", "status-tag", "STATUS"),
        make("p", "status-name", "HARUTA NAGAYA"),
        make("p", "status-class", "CLASS：ゲームプログラマー志望")
    );
    const params = make("dl", "status-params");
    [
        ["LV", level, "開発歴（年目）"],
        ["WORKS", works.length, "制作した作品"],
        ["SOLO", solo, "個人制作"],
        ["TEAM", works.length - solo, "チーム制作"],
        ["AWARDS", awards, "受賞"],
        ["RARE", rare, "受賞作品"],
    ].forEach(([key, value, note]) => {
        const row = make("div", "status-param");
        const dt = make("dt", "", key);
        dt.title = note;
        row.append(dt, make("dd", "", String(value)));
        params.append(row);
    });
    profile.append(params);

    /* EXP bars */
    const expPanel = (title, note, items, tone) => {
        const panel = make("div", `status-exp is-${tone}`);
        const head = make("p", "status-exp-head");
        head.append(make("span", "", title), make("small", "", note));
        panel.append(head);
        const list = make("ul", "exp-list");
        const max = Math.max(...items.map((item) => item.value), 1);
        items.filter((item) => item.value > 0).forEach((item, index) => {
            const li = make("li");
            li.style.setProperty("--fill", (item.value / max).toFixed(3));
            li.style.setProperty("--i", index);
            const label = make("span", "exp-label", item.label);
            const bar = make("span", "exp-bar");
            bar.append(make("span", "exp-fill"));
            const value = make("span", "exp-value");
            value.append(make("b", "", `Lv.${item.value}`));
            li.append(label, bar, value);
            li.setAttribute("aria-label", `${item.label}：${item.value}作品`);
            list.append(li);
        });
        panel.append(list);
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
   Ending (credits)
======================================== */

(() => {
    const ending = document.querySelector(".ending");
    if (!ending) return;

    const roll = ending.querySelector(".credits-roll");
    const stats = ending.querySelector("[data-ending-stats]");

    if (stats) {
        const works = document.querySelectorAll(".work-card").length +
            document.querySelectorAll(".featured-container[data-work]").length;
        const awards = document.querySelectorAll('.timeline-item[data-quest="award"]').length;
        const quests = document.querySelectorAll(".timeline-item").length;
        stats.textContent = `WORKS ${works} ／ QUESTS ${quests} ／ AWARDS ${awards}`;
    }

    /* Cast: the characters that appeared on this page */
    const cast = ending.querySelector("[data-ending-cast]");
    if (cast) {
        const names = new Set(
            Array.from(document.querySelectorAll('img[src*="images/character/"]'))
                .map((img) => (img.getAttribute("src") || "").split("/").pop().replace(/(_\d+)?\.png$/i, ""))
        );
        cast.textContent = names.size ? [...names].sort().join(" ／ ") : "Penny ／ Penko ／ Koutei";
    }

    /* Loop the credits once they come into view (static list when motion is off) */
    if (roll && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => roll.classList.toggle("is-rolling", entry.isIntersecting));
        }, { threshold: 0.2 });
        observer.observe(ending);
    }

    observeShow([ending]);
})();

/* ========================================
   Main Works: title select (tabs)
======================================== */

(() => {
    const tabs = Array.from(document.querySelectorAll(".main-tab"));
    if (tabs.length < 2) return;

    const select = (tab, focus = false) => {
        tabs.forEach((other) => {
            const selected = other === tab;
            other.setAttribute("aria-selected", String(selected));
            other.tabIndex = selected ? 0 : -1;
            const panel = document.getElementById(other.getAttribute("aria-controls"));
            if (panel) {
                panel.hidden = !selected;
                if (!selected) panel.querySelectorAll("video").forEach((video) => video.pause());
            }
        });
        if (focus) tab.focus();

        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        panel?.querySelectorAll(".featured-video, .featured-container").forEach((element) => element.classList.add("show"));
        panel?.classList.remove("is-switching");
        void panel?.offsetWidth;
        panel?.classList.add("is-switching");
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => select(tab));
        tab.addEventListener("keydown", (event) => {
            let next = null;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = tabs[(index + 1) % tabs.length];
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = tabs[(index - 1 + tabs.length) % tabs.length];
            if (event.key === "Home") next = tabs[0];
            if (event.key === "End") next = tabs[tabs.length - 1];
            if (next) {
                event.preventDefault();
                select(next, true);
            }
        });
    });
})();

/* ========================================
   Mobile compact layout
   - 横スワイプのリストに「いま何枚目か」のドットを付ける
   - 技術の見どころは「課題」だけ見せて、解決・結果はタップで開く
   （見た目の切り替えは CSS の @media (max-width: 768px) 側。PC では何も変わらない）
======================================== */

(() => {
    const SWIPE_LISTS = ".can-do-list, .latest-articles, .tech-photos";
    const smoothScroll = () => !document.documentElement.classList.contains("motion-off")
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const itemsOf = (list) => Array.from(list.children).filter((child) => !child.classList.contains("peeker"));

    const setupSwipe = (list) => {
        const items = itemsOf(list);
        let dots = list.nextElementSibling;
        if (!dots || !dots.classList.contains("swipe-dots")) {
            dots = document.createElement("div");
            dots.className = "swipe-dots";
            list.after(dots);
            list.addEventListener("scroll", () => {
                cancelAnimationFrame(list._swipeFrame);
                list._swipeFrame = requestAnimationFrame(() => update(list));
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
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "swipe-dot";
            dot.setAttribute("aria-label", `${index + 1}枚目を表示（全${items.length}枚）`);
            dot.addEventListener("click", () => {
                const left = item.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
                    - parseFloat(getComputedStyle(list).scrollPaddingLeft || 0);
                list.scrollTo({ left, behavior: smoothScroll() ? "smooth" : "auto" });
            });
            return dot;
        }));
        update(list);
    };

    const update = (list) => {
        const dots = list.nextElementSibling;
        if (!dots || !dots.classList.contains("swipe-dots")) return;
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

    document.querySelectorAll(SWIPE_LISTS).forEach(setupSwipe);

    // ブログの最新記事は読み込み後に追加されるので、そのたびにドットを作り直す
    const articles = document.getElementById("latestArticles");
    if (articles && "MutationObserver" in window) {
        new MutationObserver(() => setupSwipe(articles)).observe(articles, { childList: true });
    }

    /* 技術の見どころ：解決・結果を折りたたむ */
    document.querySelectorAll(".tech-steps").forEach((steps, index) => {
        if (steps.children.length < 2) return;
        steps.id ||= `tech-steps-${index + 1}`;
        steps.classList.add("is-folded");

        const rest = Array.from(steps.children).slice(1)
            .map((step) => step.querySelector(".tech-step-label")?.textContent.trim())
            .filter(Boolean)
            .join("・") || "続き";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "tech-steps-toggle";
        toggle.setAttribute("aria-controls", steps.id);
        toggle.setAttribute("aria-expanded", "false");

        const label = document.createElement("span");
        const icon = document.createElement("i");
        icon.setAttribute("aria-hidden", "true");
        toggle.append(label, icon);

        // ページ内の文章を使うので innerHTML ではなく textContent で入れる
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
                steps.closest(".tech-highlight")?.scrollIntoView({ block: "nearest", behavior: smoothScroll() ? "smooth" : "auto" });
            }
        });

        render();
        steps.after(toggle);
    });
})();

/* ========================================
   Other Works: 作品の詳細ポップアップ
   - カードの画像・タイトルなどを押すと開く（「詳細を見る」は今まで通り note へ）
   - 中身はカードの内容をそのまま使うので、作品を追加しても書き足しは不要
   - ◀ ▶ で前後の作品へ（絞り込み中は、表示中の作品だけを順番に）
======================================== */

(() => {
    const list = document.querySelector(".works-list");
    if (!list || typeof HTMLDialogElement !== "function") return;

    const cards = Array.from(list.querySelectorAll(".work-card"));
    if (!cards.length) return;

    const text = (root, selector) => (root.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();
    const smooth = () => !document.documentElement.classList.contains("motion-off")
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- ポップアップの骨組み ---------- */

    const viewer = document.createElement("dialog");
    viewer.className = "work-viewer";
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
    let current = null;

    const visibleCards = () => cards.filter((card) => !card.hidden);

    const render = (card) => {
        current = card;
        const image = card.querySelector("img:not(.card-pop)");
        const stage = text(card, ".stage-badges span:not(.is-award):not(.is-team):not(.is-wip)");
        const shown = visibleCards();
        const position = shown.indexOf(card);

        part("stage").textContent = stage || "STAGE";
        part("count").textContent = shown.length > 1 ? `${position + 1} / ${shown.length}` : "";

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

        part("title").textContent = text(card, "h3");
        part("genre").textContent = text(card, ".work-genre");
        part("desc").textContent = text(card, ".work-description");
        part("date").textContent = text(card, ".work-period");
        part("team").textContent = text(card, ".work-member");
        part("role").textContent = text(card, ".work-role");

        part("tools").replaceChildren(...text(card, ".work-tech").split(/\s+/).filter(Boolean).map((tool) => {
            const item = document.createElement("li");
            item.textContent = tool;
            return item;
        }));

        const source = card.querySelector("a.work-link, a[href]");
        const link = part("link");
        link.hidden = !source;
        if (source) link.href = source.href;

        viewer.querySelectorAll("[data-step]").forEach((button) => {
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
        document.dispatchEvent(new CustomEvent("work-viewer:open", { detail: { title: text(card, "h3") } }));
    };

    const step = (direction) => {
        const shown = visibleCards();
        if (shown.length < 2 || !current) return;
        const index = shown.indexOf(current);
        const next = shown[(index + direction + shown.length) % shown.length];
        render(next);
        document.dispatchEvent(new CustomEvent("work-viewer:open", { detail: { title: text(next, "h3") } }));
    };

    /* ---------- 開く：カード（「詳細を見る」以外）を押したとき ---------- */

    cards.forEach((card) => {
        const image = card.querySelector("img");
        if (image && !image.closest(".work-thumb")) {
            const thumb = document.createElement("button");
            thumb.type = "button";
            thumb.className = "work-thumb";
            thumb.setAttribute("aria-label", `${text(card, "h3")} の詳細を開く`);
            image.before(thumb);
            thumb.append(image);
            const hint = document.createElement("span");
            hint.className = "work-thumb-hint";
            hint.setAttribute("aria-hidden", "true");
            hint.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>くわしく見る';
            thumb.append(hint);
        }

        card.classList.add("has-viewer");
        card.addEventListener("click", (event) => {
            if (event.target.closest("a")) return;
            open(card);
        });
    });

    /* ---------- 閉じる・前後へ ---------- */

    viewer.querySelector(".work-viewer-close").addEventListener("click", () => viewer.close());
    viewer.querySelectorAll("[data-step]").forEach((button) => {
        button.addEventListener("click", () => step(Number(button.dataset.step)));
    });
    viewer.addEventListener("click", (event) => {
        if (event.target === viewer) viewer.close();
    });
    viewer.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "ArrowRight") step(1);
    });

    /* スマホ：左右にスワイプしても前後の作品へ */
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

    /* 閉じたら、元のカードが見える位置に戻す */
    viewer.addEventListener("close", () => {
        if (!current) return;
        current.querySelector(".work-thumb")?.focus({ preventScroll: true });
        current.scrollIntoView({ block: "nearest", behavior: smooth() ? "smooth" : "auto" });
    });
})();

/* ========================================
   Quick Guide（30秒でわかる まとめ）
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

