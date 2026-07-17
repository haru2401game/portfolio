/* ========================================
   Hero Animation
======================================== */


window.addEventListener("load", () => {


    const heroText = document.querySelector(".hero-content");


    if(heroText){

        heroText.style.opacity = "0";
        heroText.style.transform =
            "translate(-50%, calc(-50% + 30px))";


        setTimeout(() => {


            heroText.style.transition =
                "opacity 1.2s ease, transform 1.2s ease";


            heroText.style.opacity = "1";

            heroText.style.transform =
                "translate(-50%, -50%)";


        },300);


    }


});

/* ========================================
   About Scroll Animation
======================================== */


const aboutSection = document.querySelector(".about-container");


if(aboutSection){


    const aboutObserver = new IntersectionObserver(
        (entries)=>{


            entries.forEach((entry)=>{


                if(entry.isIntersecting){


                    aboutSection.classList.add("show");


                    aboutObserver.unobserve(entry.target);


                }


            });


        },
        {
            threshold:0.2
        }


    );


    aboutObserver.observe(aboutSection);


}

/* ========================================
   Skills Scroll Animation
======================================== */


const skillBoxes = document.querySelectorAll(".skill-box");


if(skillBoxes.length > 0){


    const skillObserver = new IntersectionObserver(

        (entries)=>{


            entries.forEach((entry)=>{


                if(entry.isIntersecting){


                    const box = entry.target;


                    box.classList.add("show");



                    const bar =
                        box.querySelector(".skill-level-bar");



                    if(bar){


                        setTimeout(()=>{


                            if(bar.classList.contains("cpp")){

                                bar.style.width="85%";

                            }


                            else if(bar.classList.contains("csharp")){

                                bar.style.width="90%";

                            }


                            else if(bar.classList.contains("unity")){

                                bar.style.width="90%";

                            }


                            else if(bar.classList.contains("directxtk")){

                                bar.style.width="75%";

                            }


                            else if(bar.classList.contains("dxlib")){

                                bar.style.width="70%";

                            }


                            else if(bar.classList.contains("visualstudio")){

                                bar.style.width="85%";

                            }


                            else if(bar.classList.contains("vscode")){

                                bar.style.width="75%";

                            }


                        },500);


                    }



                    skillObserver.unobserve(entry.target);


                }


            });


        },

        {
            threshold:0.2
        }


    );



    skillBoxes.forEach((box)=>{


        skillObserver.observe(box);


    });


}

/* ========================================
   Featured Works Animation
======================================== */


const featuredElements = document.querySelectorAll(
    ".featured-video, .featured-container"
);



if(featuredElements.length > 0){


    const featuredObserver = new IntersectionObserver(

        (entries)=>{


            entries.forEach((entry)=>{


                if(entry.isIntersecting){


                    entry.target.classList.add("show");


                    featuredObserver.unobserve(entry.target);


                }


            });


        },

        {
            threshold:0.2
        }

    );



    featuredElements.forEach((element)=>{


        element.classList.add("hidden");


        featuredObserver.observe(element);


    });


}

/* ========================================
   Other Works Animation
======================================== */


const workCards = document.querySelectorAll(".work-card");



if(workCards.length > 0){


    const workObserver = new IntersectionObserver(


        (entries)=>{


            entries.forEach((entry)=>{


                if(entry.isIntersecting){


                    const card = entry.target;



                    card.classList.add("show");



                    workObserver.unobserve(card);


                }


            });


        },


        {
            threshold:0.2
        }


    );




    workCards.forEach((card,index)=>{


        card.style.transitionDelay = `${index * 0.15}s`;

        card.classList.add("hidden");


        workObserver.observe(card);


    });


}

/* ========================================
   Blog Animation
======================================== */

const blogIntro = document.querySelector(".blog-introduction");

const blogObserver = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");

        }

    });

}, {
    threshold: 0.2
});

if (blogIntro) {

    blogObserver.observe(blogIntro);

}



/* ========================================
   Blog
======================================== */

const articleCounter = document.getElementById("article-count");

fetch("data/blog.json")

.then(response => {

    if (!response.ok) {

        throw new Error("blog.json の読み込みに失敗しました。");

    }

    return response.json();

})

.then(data => {

    //-----------------------------------
    // 記事数
    //-----------------------------------

    if (articleCounter) {

        articleCounter.textContent =
            data.articleCount + "+";

    }



    //-----------------------------------
    // 最新記事
    //-----------------------------------

    const container =
        document.getElementById("latestArticles");

    container.innerHTML = "";



    data.articles.forEach(article => {

        container.innerHTML += `

        <article class="article-card">

            <img
                src="${article.thumbnail}"
                alt="${article.title}">

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
                    target="_blank">

                    記事を読む →

                </a>

            </div>

        </article>

        `;

    });



    //-----------------------------------
    // カードをアニメーション対象に追加
    //-----------------------------------

    const cards =
        document.querySelectorAll(".article-card");

    cards.forEach((card, index) => {

        blogObserver.observe(card);

        card.style.transitionDelay =
            `${index * 0.15}s`;

    });

})

.catch(error => {

    console.error(error);

});