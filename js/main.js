/* ========================================
   Scroll Animation Common
======================================== */

function observeShow(elements, callback = null) {

    if (!elements || elements.length === 0) {
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
            threshold: 0.2
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

window.addEventListener("load", () => {

    const heroText =
        document.querySelector(".hero-content");

    if (!heroText) {
        return;
    }

    heroText.style.opacity = "0";

    heroText.style.transform =
        "translate(-50%, calc(-50% + 30px))";

    setTimeout(() => {

        heroText.style.transition =
            "opacity 1.2s ease, transform 1.2s ease";

        heroText.style.opacity = "1";

        heroText.style.transform =
            "translate(-50%, -50%)";

    }, 300);

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
    document.querySelectorAll(".what-can-box");


whatCanBoxes.forEach((box, index) => {

    box.style.transitionDelay =
        `${index * 0.1}s`;

});


observeShow(whatCanBoxes);


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
        `${index * 0.15}s`;

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
        `${index * 0.1}s`;

});


observeShow(timelineItems);


/* ========================================
   Play Games Animation
======================================== */

const playCards =
    document.querySelectorAll(".play-card");


playCards.forEach((card, index) => {

    card.style.transitionDelay =
        `${index * 0.15}s`;

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
        `${index * 0.1}s`;

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


        latestArticles.innerHTML = "";


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


            articleCard.innerHTML = `

                <img
                    src="${article.thumbnail}"
                    alt="${article.title}"
                    loading="lazy">

                <div class="article-content">

                    <p class="article-date">
                        ${article.date}
                    </p>

                    <h3>
                        ${article.title}
                    </h3>

                    <p class="article-summary">
                        ${article.summary}
                    </p>

                    <a
                        href="${article.url}"
                        target="_blank"
                        rel="noopener noreferrer">

                        記事を読む →

                    </a>

                </div>

            `;


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
                `${index * 0.15}s`;

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

    hamburger.addEventListener(
        "click",
        () => {

            hamburger.classList.toggle(
                "active"
            );

            headerNav.classList.toggle(
                "active"
            );

            document.body.classList.toggle(
                "menu-open"
            );

        }
    );

}


/* ========================================
   Header Navigation
======================================== */

navLinks.forEach((link) => {

    link.addEventListener(
        "click",
        () => {

            if (hamburger) {

                hamburger.classList.remove(
                    "active"
                );

            }

            if (headerNav) {

                headerNav.classList.remove(
                    "active"
                );

            }

            document.body.classList.remove(
                "menu-open"
            );

        }
    );

});


/* ========================================
   Header Logo
======================================== */

const headerLogo =
    document.querySelector(".header-logo");


if (headerLogo) {

    headerLogo.addEventListener(
        "click",
        () => {

            if (hamburger) {

                hamburger.classList.remove(
                    "active"
                );

            }

            if (headerNav) {

                headerNav.classList.remove(
                    "active"
                );

            }

            document.body.classList.remove(
                "menu-open"
            );

        }
    );

}