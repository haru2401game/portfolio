/* ========================================
   motion.js：動きの仕掛け（落ち着いたデザイン用）

   ・動きは「ゆっくり・小さく」。目立たせるためではなく、読む順番が分かるように使う
   ・進み具合の細い線／トップの映像がスクロールで少し寄る／写真のゆるやかなパララックス
   ・Timeline の線がスクロールに合わせてのびる／作品カードが順に表示される
   ・説明文は「くわしく読む」で開く（最初は短く見せる）
   設定のアニメーション「なし」で全部、「軽量」でスクロール連動の動きが止まる（boot.js / next.js が <html> にクラスを付ける）
======================================== */

(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const root = document.documentElement;
    const calm = () => root.classList.contains("motion-off");
    const light = () => calm() || root.classList.contains("motion-lite");
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    /* ---------- 説明は「くわしく読む」で開く ---------- */

    const addToggle = (container, label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "more-toggle";
        button.textContent = label;
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", () => {
            const open = !container.classList.contains("is-open");
            container.classList.toggle("is-open", open);
            button.setAttribute("aria-expanded", String(open));
            button.textContent = open ? "閉じる" : label;
        });
        container.append(button);
    };
    $$(".hl").forEach((hl) => addToggle(hl, "くわしく読む"));
    $$(".skill-col").forEach((col) => addToggle(col, "説明を見る"));

    /* ---------- スクロール連動 ---------- */

    const progress = $("[data-progress]");
    const hero = $(".hero");
    const heroFrame = $(".hero-frame");
    const parallax = [
        [$(".about-photo img"), -0.04],
        [$(".web-img img"), -0.05],
    ].filter(([node]) => node);
    const tlTrack = $("[data-timeline]");

    let ticking = false;
    const update = () => {
        ticking = false;
        const y = scrollY;

        if (progress) {
            const max = document.documentElement.scrollHeight - innerHeight;
            progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
        }

        // Timeline：画面の6割の高さまで来たところまで、線をのばす
        if (tlTrack) {
            if (calm()) tlTrack.style.setProperty("--tl-fill", "100%");
            else {
                const rect = tlTrack.getBoundingClientRect();
                if (rect.bottom > -200 && rect.top < innerHeight + 200) {
                    const fill = clamp((innerHeight * 0.6 - rect.top) / (rect.height || 1), 0, 1);
                    tlTrack.style.setProperty("--tl-fill", `${(fill * 100).toFixed(1)}%`);
                }
            }
        }

        if (light()) {
            if (heroFrame) heroFrame.style.transform = "";
            parallax.forEach(([node]) => (node.style.translate = ""));
            return;
        }

        // トップ：スクロールすると、映像の枠がほんの少し小さくなって奥へ下がる
        if (hero && heroFrame) {
            const p = clamp(y / (hero.offsetHeight || 1), 0, 1);
            heroFrame.style.transform = `translate3d(0, ${(p * 24).toFixed(1)}px, 0) scale(${(1 - p * 0.04).toFixed(4)})`;
        }

        parallax.forEach(([node, rate]) => {
            const rect = node.parentElement.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > innerHeight + 200) return;
            node.style.translate = `0 ${((rect.top + rect.height / 2 - innerHeight / 2) * rate).toFixed(1)}px`;
        });
    };
    const request = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    };
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    // 設定を変えたとき（なし・軽量）にも、見た目を合わせる
    new MutationObserver(request).observe(root, { attributes: true, attributeFilter: ["class"] });
    update();

    /* ---------- Timeline：出来事が順に表示される ---------- */

    const tlItems = $$(".tl-item");
    if (calm() || !("IntersectionObserver" in window)) {
        tlItems.forEach((item) => item.classList.add("is-reached"));
    } else {
        const tlObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-reached");
                tlObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -12% 0px" });
        tlItems.forEach((item) => tlObserver.observe(item));
    }

    /* ---------- 作品カード：画面に入ったものから順に表示 ---------- */

    const workItems = $$(".works-grid li");
    if ("IntersectionObserver" in window && workItems.length && !calm()) {
        workItems.forEach((item) => item.classList.add("is-wait"));
        const workObserver = new IntersectionObserver((entries) => {
            entries
                .filter((entry) => entry.isIntersecting)
                .forEach((entry, i) => {
                    entry.target.style.setProperty("--d", `${i * 60}ms`);
                    entry.target.classList.add("is-show");
                    workObserver.unobserve(entry.target);
                });
        }, { rootMargin: "0px 0px -6% 0px" });
        workItems.forEach((item) => workObserver.observe(item));
        // 「すべての作品を見る」で開いたカードや、絞り込み後のカードは、すぐ見えるように
        $$("[data-filter], .works-more").forEach((button) => button.addEventListener("click", () => workItems.forEach((item) => item.classList.add("is-show"))));
    }
})();

/* ========================================
   おしゃれな見せ方（新デザインだけの動き。クラシックの「弾む・光る」とは分ける）
   ・見出し：英字が下からせり上がる → 赤い線が左から引かれる → 日本語がそっと出る
   ・写真：幕が開くように横から現れて、少し引いた位置に落ち着く
   ・アニメーション「なし」のときは何もしない（最初から全部見える）
======================================== */
(() => {
    const root = document.documentElement;
    if (root.classList.contains("motion-off") || !("IntersectionObserver" in window)) return;
    const targets = Array.from(document.querySelectorAll(
        ".sec-title-row, .stage-tab-img, .movie, .about-photo, .web-img, .tl-photo, .article-img, .photo, .q-work, .blog-intro, .next-bar, .next-stage"
    ));
    targets.forEach((node) => node.classList.add("fx"));
    root.classList.add("fx-ready");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("fx-in");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -10% 0px" });
    targets.forEach((node) => observer.observe(node));
    // 速くスクロールして通り過ぎたものも、取り残さずに見せる（画面より上にあるものは出しておく）
    let checking = false;
    addEventListener("scroll", () => {
        if (checking) return;
        checking = true;
        setTimeout(() => {
            checking = false;
            targets.forEach((node) => {
                if (node.classList.contains("fx-in")) return;
                const rect = node.getBoundingClientRect();
                if (rect.height && rect.top < innerHeight * 0.9) {
                    node.classList.add("fx-in");
                    observer.unobserve(node);
                }
            });
        }, 200);
    }, { passive: true });
    // 「なし」に切り替えたら、まだ出ていないものもすぐ見せる
    new MutationObserver(() => {
        if (root.classList.contains("motion-off")) targets.forEach((node) => node.classList.add("fx-in"));
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
