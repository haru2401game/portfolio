/* ========================================
   motion.js：動きの仕掛け（新デザイン試作版 v2）

   ・起動演出／名前と見出しの1文字ずつのアニメーション／流れる帯
   ・カーソル／クリックの火花／カードの傾き／ボタンの吸いつき
   ・スクロール連動（進み具合のバー・パララックス・Timeline の横移動）
   ・説明文は「くわしく」で開く（最初は短く見せる）
   OPTIONS で「ひかえめ」にすると、ここの動きはすべて止まる
======================================== */

(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const desktop = matchMedia("(min-width: 961px)");
    const calm = () => root.classList.contains("is-calm") || (reduced.matches && !root.classList.contains("is-motion"));
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    /* ---------- 起動演出 ---------- */

    const boot = $("[data-boot]");
    if (boot && root.classList.contains("is-booting")) {
        const bar = $("[data-boot-bar]");
        const num = $("[data-boot-num]");
        const start = performance.now();
        const LENGTH = 1100;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            if (bar) bar.style.width = "100%";
            if (num) num.textContent = "100";
            boot.classList.add("is-leave");
            try {
                sessionStorage.setItem("next-booted", "1");
            } catch {
                /* 次も出るだけ */
            }
            setTimeout(() => root.classList.remove("is-booting"), 850);
        };
        const tick = (now) => {
            if (done) return;
            const t = clamp((now - start) / LENGTH, 0, 1);
            const eased = 1 - Math.pow(1 - t, 2);
            if (bar) bar.style.width = `${eased * 100}%`;
            if (num) num.textContent = String(Math.round(eased * 100));
            if (t < 1) requestAnimationFrame(tick);
            else setTimeout(finish, 120);
        };
        requestAnimationFrame(tick);
        boot.addEventListener("click", finish);
        addEventListener("keydown", finish, { once: true });
        setTimeout(finish, 3000); // 何があっても3秒で開ける
    }

    /* ---------- 文字を1文字ずつに分ける ---------- */

    const splitInto = (element, { mask = false } = {}) => {
        if (!element || element.dataset.splitDone) return;
        element.dataset.splitDone = "1";
        if (!element.hasAttribute("aria-label") && !element.closest("[aria-hidden='true']")) {
            element.setAttribute("aria-label", element.textContent.replace(/\s+/g, " ").trim());
        }
        let index = 0;
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent;
                    if (!text.trim()) return;
                    const fragment = document.createDocumentFragment();
                    text.split(/(\s+)/).forEach((word) => {
                        if (!word) return;
                        if (/^\s+$/.test(word)) {
                            fragment.append(document.createTextNode(" "));
                            return;
                        }
                        const holder = document.createElement("span");
                        holder.className = mask ? "split-mask" : "split-word";
                        holder.setAttribute("aria-hidden", "true");
                        Array.from(word).forEach((char) => {
                            const span = document.createElement("span");
                            span.className = "ch";
                            span.textContent = char;
                            span.style.setProperty("--i", String(index++));
                            holder.append(span);
                        });
                        fragment.append(holder);
                    });
                    child.replaceWith(fragment);
                } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
                    walk(child);
                }
            });
        };
        walk(element);
    };

    // トップの名前（落ちてきて弾む）
    $$(".hero-name-en > span").forEach((line, row) => {
        splitInto(line);
        $$(".ch", line).forEach((ch, i) => ch.style.setProperty("--i", String(i + row * 3)));
    });

    // 大きな見出し（下から出てくる）
    const splitTargets = $$(".display, .ending-title, .sec-title-ja, .web-title");
    splitTargets.forEach((heading) => {
        splitInto(heading, { mask: true });
        heading.setAttribute("data-split", "");
    });
    if ("IntersectionObserver" in window) {
        const splitObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-split-in");
                splitObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -10% 0px" });
        splitTargets.forEach((heading) => splitObserver.observe(heading));
    } else {
        splitTargets.forEach((heading) => heading.classList.add("is-split-in"));
    }

    /* ---------- 説明は「くわしく」で開く ---------- */

    const addToggle = (container, label, place) => {
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
        place(button);
    };
    $$(".hl").forEach((hl) => addToggle(hl, "くわしく読む", (button) => hl.append(button)));
    $$(".skill-col").forEach((col) => addToggle(col, "説明を見る", (button) => col.append(button)));

    /* ---------- 流れる帯（スクロールの速さで加速・向きが変わる） ---------- */

    const marquees = $$("[data-marquee]").map((band) => {
        const track = $(".marquee-track", band);
        // 帯が途切れないように、中身を2倍にしておく
        const original = Array.from(track.children);
        original.forEach((child) => track.append(child.cloneNode(true)));
        return { track, x: 0, dir: band.classList.contains("is-ink") ? 1 : -1 };
    });

    /* ---------- スクロール連動（バー・パララックス・トップ・Timeline） ---------- */

    const progress = $("[data-progress]");
    const hero = $(".hero");
    const heroBody = $(".hero-body");
    const heroMedia = $(".hero-media");
    const heroName = $(".hero-name-en");

    const parallax = [
        [$(".about-photo"), -0.06],
        [$(".quick"), 0.04],
        [$(".web-img img"), -0.08],
        [$(".status"), 0.03],
    ].filter(([node]) => node);
    parallax.forEach(([node]) => node.setAttribute("data-parallax", ""));

    // Timeline：パソコンでは、縦にスクロールすると横に進む
    const timeline = $("#timeline");
    const pin = $("[data-tl-pin]");
    const tlTrack = $("[data-timeline]");
    const tlHint = $(".tl-hint");
    let tlDistance = 0;
    const setupTimeline = () => {
        if (!timeline || !pin || !tlTrack) return;
        const use = desktop.matches && !calm();
        timeline.classList.toggle("is-pinned", use);
        if (!use) {
            timeline.style.height = "";
            tlTrack.style.transform = "";
            $$(".tl-item", tlTrack).forEach((item) => item.classList.add("is-reached"));
            if (tlHint) tlHint.textContent = "横にスクロールすると、いまの挑戦まで進めます";
            return;
        }
        tlDistance = Math.max(0, tlTrack.scrollWidth - innerWidth);
        const header = $("#hd")?.offsetHeight || 0;
        timeline.style.height = `${innerHeight - header + tlDistance + 80}px`;
        if (tlHint) tlHint.textContent = "そのまま下にスクロールすると、いまの挑戦まで進みます";
    };

    let lastY = scrollY;
    let velocity = 0;
    let pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const frame = (now) => {
        const y = scrollY;
        velocity = velocity * 0.9 + (y - lastY) * 0.1;
        lastY = y;
        const still = calm();

        // 進み具合のバー
        if (progress) {
            const max = document.documentElement.scrollHeight - innerHeight;
            progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
        }

        // 流れる帯
        marquees.forEach((band) => {
            if (still) {
                band.track.style.transform = "";
                return;
            }
            if (Math.abs(velocity) > 0.5) band.dir = Math.sign(velocity) * (band.track.parentElement.classList.contains("is-ink") ? 1 : -1);
            const speed = 0.9 + Math.min(10, Math.abs(velocity) * 0.35);
            const half = band.track.scrollWidth / 2;
            band.x = (band.x + band.dir * speed) % half;
            if (band.x > 0) band.x -= half;
            band.track.style.transform = `translate3d(${band.x}px, 0, 0)`;
        });

        if (!still) {
            // トップ：スクロールで映像が少し寄り、文字が上へ抜ける／マウスで奥行き
            if (hero && heroBody && heroMedia) {
                const h = hero.offsetHeight || 1;
                const p = clamp(y / h, 0, 1);
                pointer.x += (pointer.tx - pointer.x) * 0.08;
                pointer.y += (pointer.ty - pointer.y) * 0.08;
                heroMedia.style.transform = `translate3d(${pointer.x * -16}px, ${pointer.y * -10 + p * 60}px, 0) scale(${1 + p * 0.08})`;
                heroBody.style.transform = `translate3d(0, ${p * -80}px, 0)`;
                heroBody.style.opacity = String(1 - p * 0.9);
                if (heroName) heroName.style.transform = `translate3d(${pointer.x * 12}px, ${pointer.y * 8}px, 0)`;
            }

            // パララックス
            parallax.forEach(([node, rate]) => {
                const rect = node.getBoundingClientRect();
                if (rect.bottom < -200 || rect.top > innerHeight + 200) return;
                const offset = (rect.top + rect.height / 2 - innerHeight / 2) * rate;
                node.style.translate = `0 ${offset.toFixed(1)}px`;
            });

            // Timeline の横移動
            if (timeline?.classList.contains("is-pinned")) {
                const header = $("#hd")?.offsetHeight || 0;
                const rect = timeline.getBoundingClientRect();
                const span = timeline.offsetHeight - (innerHeight - header);
                const p = span > 0 ? clamp((header - rect.top) / span, 0, 1) : 0;
                tlTrack.style.transform = `translate3d(${-p * tlDistance}px, 0, 0)`;
                $$(".tl-item", tlTrack).forEach((item) => {
                    const r = item.getBoundingClientRect();
                    item.classList.toggle("is-reached", r.left < innerWidth * 0.82);
                });
            }
        } else {
            [heroMedia, heroBody, heroName].forEach((node) => node && (node.style.transform = ""));
            if (heroBody) heroBody.style.opacity = "";
            parallax.forEach(([node]) => (node.style.translate = ""));
        }

        requestAnimationFrame(frame);
    };

    hero?.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        pointer.tx = (event.clientX / innerWidth - 0.5) * 2;
        pointer.ty = (event.clientY / innerHeight - 0.5) * 2;
    });
    hero?.addEventListener("pointerleave", () => {
        pointer.tx = 0;
        pointer.ty = 0;
    });

    /* ---------- Other Works：カードが順番に出てくる ---------- */

    const workItems = $$(".works-grid li");
    const showWorks = (items) => {
        let order = 0;
        items.forEach((item) => {
            if (item.classList.contains("is-hidden")) return;
            item.style.setProperty("--d", `${(order++ % 8) * 60}ms`);
            item.classList.remove("is-show");
            item.classList.add("is-wait");
        });
        requestAnimationFrame(() => requestAnimationFrame(() => items.forEach((item) => item.classList.add("is-show"))));
    };
    if ("IntersectionObserver" in window && workItems.length) {
        workItems.forEach((item) => item.classList.add("is-wait"));
        const workObserver = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
            visible.forEach((item, i) => {
                item.style.setProperty("--d", `${i * 70}ms`);
                item.classList.add("is-show");
                workObserver.unobserve(item);
            });
        }, { rootMargin: "0px 0px -6% 0px" });
        workItems.forEach((item) => workObserver.observe(item));
        // 絞り込みを変えたら、カードを並べ直す演出
        $$("[data-filter]").forEach((button) => button.addEventListener("click", () => !calm() && showWorks(workItems)));
    }

    /* ---------- カードの傾き・ボタンの吸いつき（パソコン） ---------- */

    // スクロールしたら、覚えておいた位置を測り直す
    let scrollStamp = 0;
    addEventListener("scroll", () => scrollStamp++, { passive: true });
    const tiltTargets = $$(".work, .stage-tab, .tech-card, .play-card, .purpose");
    tiltTargets.forEach((card) => {
        card.classList.add("tilt");
        const surface = card.querySelector(".work-thumb, .stage-tab-img");
        if (surface) {
            const glare = document.createElement("span");
            glare.className = "tilt-glare";
            glare.setAttribute("aria-hidden", "true");
            surface.append(glare);
        }
        // 傾けると箱の位置がずれて、マウスとの位置関係が毎回変わる（=ぶるぶるする）ので、
        // 入ったときの位置を覚えておき、目標の角度へなめらかに近づける
        let rect = null;
        const state = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
        const strong = card.matches(".work, .stage-tab") ? 8 : 4;
        const render = () => {
            state.x += (state.tx - state.x) * 0.15;
            state.y += (state.ty - state.y) * 0.15;
            const settled = Math.abs(state.tx - state.x) < 0.002 && Math.abs(state.ty - state.y) < 0.002;
            if (settled && state.tx === 0 && state.ty === 0) {
                card.style.transform = "";
                card.classList.remove("is-tilting");
                state.raf = 0;
                return;
            }
            card.style.transform = `perspective(900px) rotateX(${(-state.y * strong).toFixed(2)}deg) rotateY(${(state.x * strong).toFixed(2)}deg) translateY(-6px)`;
            card.style.setProperty("--gx", `${(state.x + 0.5) * 100}%`);
            card.style.setProperty("--gy", `${(state.y + 0.5) * 100}%`);
            state.raf = requestAnimationFrame(render);
        };
        const kick = () => {
            if (!state.raf) state.raf = requestAnimationFrame(render);
        };
        card.addEventListener("pointerenter", (event) => {
            if (event.pointerType !== "mouse" || calm()) return;
            rect = { ...card.getBoundingClientRect().toJSON(), stamp: scrollStamp };
            card.classList.add("is-tilting");
        });
        card.addEventListener("pointermove", (event) => {
            if (event.pointerType !== "mouse" || calm()) return;
            if (!rect || rect.stamp !== scrollStamp) rect = { ...card.getBoundingClientRect().toJSON(), stamp: scrollStamp }; // スクロールした後は測り直す
            state.tx = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
            state.ty = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
            kick();
        });
        card.addEventListener("pointerleave", () => {
            rect = null;
            state.tx = 0;
            state.ty = 0;
            kick();
        });
    });

    // ボタンの吸いつき：同じく、入ったときの位置を基準にして、なめらかに追いかける
    $$(".btn, .hd-options, .round, .hd-contact").forEach((button) => {
        let rect = null;
        const state = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
        const render = () => {
            state.x += (state.tx - state.x) * 0.18;
            state.y += (state.ty - state.y) * 0.18;
            if (Math.abs(state.tx - state.x) < 0.05 && Math.abs(state.ty - state.y) < 0.05) {
                state.x = state.tx;
                state.y = state.ty;
            }
            button.style.translate = state.x || state.y ? `${state.x.toFixed(2)}px ${state.y.toFixed(2)}px` : "";
            state.raf = state.x === state.tx && state.y === state.ty ? 0 : requestAnimationFrame(render);
        };
        const kick = () => {
            if (!state.raf) state.raf = requestAnimationFrame(render);
        };
        button.addEventListener("pointerenter", (event) => {
            if (event.pointerType !== "mouse" || calm()) return;
            rect = { ...button.getBoundingClientRect().toJSON(), stamp: scrollStamp };
        });
        button.addEventListener("pointermove", (event) => {
            if (event.pointerType !== "mouse" || calm()) return;
            if (!rect || rect.stamp !== scrollStamp) rect = { ...button.getBoundingClientRect().toJSON(), stamp: scrollStamp };
            state.tx = clamp((event.clientX - rect.left - rect.width / 2) * 0.15, -5, 5);
            state.ty = clamp((event.clientY - rect.top - rect.height / 2) * 0.2, -4, 4);
            kick();
        });
        button.addEventListener("pointerleave", () => {
            rect = null;
            state.tx = 0;
            state.ty = 0;
            kick();
        });
    });

    /* ---------- カーソル（パソコン） ---------- */

    const ring = $("[data-cursor]");
    const ringLabel = $("[data-cursor-label]");
    const LABELS = [
        [".work", "OPEN"],
        [".stage-tab", "SELECT"],
        [".movie-play, [data-play], .play-card", "PLAY"],
        [".photo, .tl-photo", "ZOOM"],
        [".article", "READ"],
        [".web-card", "VISIT"],
    ];
    if (ring && finePointer.matches) {
        let cx = innerWidth / 2;
        let cy = innerHeight / 2;
        let rx = cx;
        let ry = cy;
        let active = false;
        const loop = () => {
            rx += (cx - rx) * 0.22;
            ry += (cy - ry) * 0.22;
            ring.style.translate = `${rx}px ${ry}px`;
            requestAnimationFrame(loop);
        };
        const update = (under) => {
            const on = !calm() && !document.querySelector("dialog[open]");
            root.classList.toggle("has-cursor", on);
            if (!under?.closest) return;
            const target = under.closest("a, button, input, label, [role='tab']");
            const label = LABELS.find(([selector]) => under.closest(selector));
            ring.classList.toggle("is-hover", Boolean(target) && !label);
            ring.classList.toggle("is-label", Boolean(label));
            if (ringLabel) ringLabel.textContent = label ? label[1] : "";
        };
        addEventListener("pointermove", (event) => {
            if (event.pointerType !== "mouse") return;
            cx = event.clientX;
            cy = event.clientY;
            if (!active) {
                active = true;
                rx = cx;
                ry = cy;
            }
            update(event.target);
        }, { passive: true });
        // スクロールでカーソルの下が変わったときも、表示を合わせる
        addEventListener("scroll", () => active && update(document.elementFromPoint(cx, cy)), { passive: true });
        addEventListener("pointerdown", () => ring.classList.add("is-down"));
        addEventListener("pointerup", () => ring.classList.remove("is-down"));
        document.addEventListener("pointerleave", () => ring.classList.add("is-hidden"));
        document.addEventListener("pointerenter", () => ring.classList.remove("is-hidden"));
        requestAnimationFrame(loop);
    }

    /* ---------- クリックの火花 ---------- */

    const sparks = $("[data-sparks]");
    addEventListener("pointerdown", (event) => {
        if (!sparks || calm()) return;
        const target = event.target.closest("a, button, .work");
        if (!target || target.closest("dialog")) return;
        const ringEl = document.createElement("span");
        ringEl.className = "spark is-ring";
        ringEl.style.left = `${event.clientX}px`;
        ringEl.style.top = `${event.clientY}px`;
        sparks.append(ringEl);
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement("span");
            spark.className = `spark${i % 3 === 0 ? " is-ink" : ""}`;
            const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
            const distance = 28 + Math.random() * 26;
            spark.style.left = `${event.clientX}px`;
            spark.style.top = `${event.clientY}px`;
            spark.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
            spark.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
            sparks.append(spark);
        }
        setTimeout(() => sparks.replaceChildren(), 650);
    });

    /* ---------- 始める ---------- */

    setupTimeline();
    let resizeTimer = 0;
    addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setupTimeline, 150);
    });
    addEventListener("load", setupTimeline);
    // OPTIONS で「ひかえめ」に切り替えたとき
    let wasCalm = calm();
    new MutationObserver(() => {
        if (calm() === wasCalm) return;
        wasCalm = calm();
        setupTimeline();
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
    requestAnimationFrame(frame);
})();
