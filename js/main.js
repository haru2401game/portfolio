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
    document.querySelectorAll(".blog-introduction")
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

            articleCounter.textContent =
                `${data.articleCount}+`;

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


        latestArticles.replaceChildren();


        if (
            !data.articles ||
            !Array.isArray(data.articles)
        ) {

            console.warn(
                "blog.json に articles が存在しません。"
            );

            return;

        }


        data.articles.forEach((article) => {

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

            articleCard.append(image, content);


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
        element.textContent = target;
        return;
    }

    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased);
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
