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

observeShow(achievementCards);


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

            blogCount.textContent =
                data.articleCount;

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

            gameCount.textContent =
                document.querySelectorAll(
                    ".work-card"
                ).length;

        }


        /* --------------------------------
           Awards
        -------------------------------- */

        if (awardCount) {

            awardCount.textContent =
                data.awardCount;

        }


        /* --------------------------------
           Events
        -------------------------------- */

        if (eventCount) {

            eventCount.textContent =
                data.eventCount;

        }


        /* --------------------------------
           Internship
        -------------------------------- */

        if (internCount) {

            internCount.textContent =
                data.internCount;

        }


        /* --------------------------------
           Years Developing
        -------------------------------- */

        if (careerCount) {

            careerCount.textContent =
                data.careerCount;

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
