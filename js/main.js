/* ========================================
   Scroll Animation Common
======================================== */

function observeShow(elements, callback = null){

    if(elements.length === 0) return;


    const observer = new IntersectionObserver(
        (entries)=>{

            entries.forEach(entry=>{

                if(entry.isIntersecting){

                    entry.target.classList.add("show");


                    if(callback){
                        callback(entry.target);
                    }


                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold:0.2
        }
    );


    elements.forEach(element=>{

        observer.observe(element);

    });

}



/* ========================================
   Hero Animation
======================================== */


window.addEventListener("load",()=>{


    const heroText =
        document.querySelector(".hero-content");


    if(heroText){


        heroText.style.opacity="0";

        heroText.style.transform =
            "translate(-50%, calc(-50% + 30px))";


        setTimeout(()=>{


            heroText.style.transition =
                "opacity 1.2s ease, transform 1.2s ease";


            heroText.style.opacity="1";


            heroText.style.transform =
                "translate(-50%, -50%)";


        },300);


    }


});





/* ========================================
   About Animation
======================================== */


observeShow(
    document.querySelectorAll(".about-container")
);





/* ========================================
   Skills Animation
======================================== */


observeShow(
    document.querySelectorAll(".skill-box"),
    (box)=>{


        const bar =
            box.querySelector(".skill-level-bar");


        if(bar){

            setTimeout(()=>{


                bar.style.width =
                    bar.dataset.level + "%";


            },500);


        }


    }
);





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


workCards.forEach((card,index)=>{

    card.style.transitionDelay =
        `${index * 0.15}s`;

});


observeShow(workCards);





/* ========================================
   Blog Animation
======================================== */


const blogObserverElements =
    document.querySelectorAll(
        ".blog-introduction, .article-card"
    );


blogObserverElements.forEach((element,index)=>{

    element.style.transitionDelay =
        `${index * 0.15}s`;

});


observeShow(blogObserverElements);


/* ========================================
   Timeline Animation
======================================== */


const timelineItems =
    document.querySelectorAll(
        ".timeline-item"
    );


timelineItems.forEach((item,index)=>{

    item.style.transitionDelay =
        `${index * 0.1}s`;

});


observeShow(timelineItems);


/* ========================================
   Blog Data
======================================== */


const articleCounter =
    document.getElementById("article-count");



fetch("data/blog.json")

.then(response=>{


    if(!response.ok){

        throw new Error(
            "blog.json の読み込みに失敗しました。"
        );

    }


    return response.json();


})


.then(data=>{


    //-----------------------------------
    // 記事数
    //-----------------------------------

    if(articleCounter){

        articleCounter.textContent =
            data.articleCount + "+";

    }



    //-----------------------------------
    // 最新記事生成
    //-----------------------------------

    const container =
        document.getElementById(
            "latestArticles"
        );


    if(!container) return;



    container.innerHTML="";



    data.articles.forEach(article=>{


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
    // 生成後カードを監視
    //-----------------------------------


    const cards =
        document.querySelectorAll(
            ".article-card"
        );


    cards.forEach((card,index)=>{


        card.style.transitionDelay =
            `${index * 0.15}s`;


    });


    observeShow(cards);



})


.catch(error=>{


    console.error(error);


});

/* ========================================
   Contact Animation
======================================== */


const contactElements =
    document.querySelectorAll(
        ".contact-container, .sns-card"
    );



contactElements.forEach((element,index)=>{


    element.style.transitionDelay =
        `${index * 0.1}s`;


});



observeShow(contactElements);