/* ========================================
   新デザイン試作版の動き（next/index.html）

   ・作品・経歴・ブログは、今のサイトと同じデータ（../data/*.js）から作る
   ・設定（アニメーション・音量）とトロフィーは、このブラウザの中だけに保存する
   ・アクセス解析は送らない（試作版）
======================================== */

(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const root = document.documentElement;
    const WORKS = Array.isArray(window.WORKS) ? window.WORKS : [];
    const TIMELINE = Array.isArray(window.TIMELINE) ? window.TIMELINE : [];
    const BLOG = window.BLOG_DATA || {};
    const MAIN_COUNT = 2; // Main Works（ししとう・Falien）

    const store = {
        get(key, fallback) {
            try {
                const value = localStorage.getItem(`next-${key}`);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(`next-${key}`, JSON.stringify(value));
            } catch {
                /* 保存できなくても動かす */
            }
        },
    };

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    // リンクは http(s) か、サイトの中のページだけ
    const safeUrl = (url) => (/^(https?:\/\/|\.\.?\/)/i.test(String(url || "").trim()) ? String(url).trim() : "");
    // 画像・動画は今のサイトのフォルダ（../）から読む
    const asset = (path) => (/^https?:\/\//.test(path || "") ? path : path ? `../${String(path).replace(/^\.?\//, "")}` : "");

    // 作品ごとのリンクの名前（今のサイトの js/works.js と同じ作り方）
    const idOf = (work) =>
        String(work.id || work.en?.title || work.title || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    /* ---------- 設定（アニメーション・音量） ---------- */

    const settings = { motion: store.get("motion", "on"), volume: Number(store.get("volume", 40)) };
    const applyMotion = () => {
        root.classList.toggle("is-calm", settings.motion === "calm");
        root.classList.toggle("is-motion", settings.motion === "on" && store.get("motion", null) === "on");
        $$("[data-motion]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.motion === settings.motion)));
    };
    const calm = () => root.classList.contains("is-calm") || (matchMedia("(prefers-reduced-motion: reduce)").matches && !root.classList.contains("is-motion"));
    applyMotion();

    /* ---------- 効果音（Web Audio API で、その場で作る） ---------- */

    const sfx = (() => {
        let ctx = null;
        let unlocked = false;
        const ensure = () => {
            if (!ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return null;
                ctx = new AudioContext();
            }
            if (ctx.state === "suspended") ctx.resume();
            return ctx;
        };
        ["pointerdown", "keydown"].forEach((type) =>
            window.addEventListener(type, () => {
                unlocked = true;
                ensure();
            }, { once: true, capture: true }),
        );
        const tone = (freq, start, length, type = "square", gain = 0.12, slide = 0) => {
            const audio = ensure();
            if (!audio || settings.volume <= 0) return;
            const t = audio.currentTime + start;
            const osc = audio.createOscillator();
            const amp = audio.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + length);
            const level = gain * (settings.volume / 100);
            amp.gain.setValueAtTime(0.0001, t);
            amp.gain.exponentialRampToValueAtTime(level, t + 0.008);
            amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
            osc.connect(amp).connect(audio.destination);
            osc.start(t);
            osc.stop(t + length + 0.02);
        };
        const SOUNDS = {
            hover: () => tone(1320, 0, 0.035, "square", 0.05),
            click: () => { tone(660, 0, 0.05); tone(990, 0.045, 0.07); },
            open: () => { tone(523, 0, 0.06, "triangle", 0.18); tone(784, 0.05, 0.06, "triangle", 0.18); tone(1046, 0.1, 0.12, "triangle", 0.18); },
            close: () => tone(700, 0, 0.12, "triangle", 0.16, 0.5),
            select: () => { tone(880, 0, 0.06); tone(1175, 0.06, 0.1); },
            trophy: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.07, 0.16, "square", 0.08)),
            copy: () => { tone(1200, 0, 0.05, "sine", 0.2); tone(1600, 0.05, 0.08, "sine", 0.2); },
        };
        let lastHover = 0;
        return {
            play(name) {
                if (!unlocked && name === "hover") return;
                if (name === "hover") {
                    const now = performance.now();
                    if (now - lastHover < 60) return;
                    lastHover = now;
                }
                try {
                    SOUNDS[name]?.();
                } catch {
                    /* 音が出せない環境でも止めない */
                }
            },
        };
    })();

    // ボタンとリンクに音を付ける
    const SOUNDED = "a, button, .work";
    let hoverTarget = null;
    document.addEventListener("pointerover", (event) => {
        if (event.pointerType !== "mouse") return;
        const target = event.target.closest(SOUNDED);
        if (target && target !== hoverTarget) sfx.play("hover");
        hoverTarget = target;
    });
    document.addEventListener("click", (event) => {
        const target = event.target.closest(SOUNDED);
        if (!target || target.closest("[data-close]") || target.matches("[data-sfx-demo]")) return;
        if (target.matches(".work, [data-open], .photo, .tl-photo")) return; // 開く音は別に鳴らす
        sfx.play(target.matches(".stage-tab, .mode-card, [data-filter]") ? "select" : "click");
    });

    /* ---------- トロフィー ---------- */

    const TROPHIES = [
        { id: "start", title: "PRESS START", hint: "タイトル画面からはじめる" },
        { id: "mode", title: "モード選択", hint: "SELECT MODE で目的を選ぶ" },
        { id: "stage", title: "ステージクリア", hint: "Main Works を2作品とも見る" },
        { id: "hunter", title: "作品ハンター", hint: "作品の詳しい画面を3つ開く" },
        { id: "album", title: "思い出アルバム", hint: "写真を拡大して見る" },
        { id: "player", title: "プレイヤー", hint: "遊べる作品を遊びに行く" },
        { id: "movie", title: "シアター", hint: "プレイ映像を再生する" },
        { id: "explorer", title: "全ステージ踏破", hint: "すべてのセクションを見る" },
        { id: "clear", title: "ALL CLEAR", hint: "エンディングまでたどり着く" },
    ];
    const got = new Set(store.get("trophies", []));
    const toasts = $("[data-toasts]");

    const toast = (label, title, info = false) => {
        if (!toasts) return;
        const item = el("div", `toast${info ? " is-info" : ""}`);
        const icon = el("span", "toast-ic");
        icon.innerHTML = info
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L19 7"></path></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"></path><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"></path></svg>';
        const text = el("span");
        text.append(el("small", "", label), el("b", "", title));
        item.append(icon, text);
        toasts.append(item);
        setTimeout(() => {
            item.classList.add("is-out");
            setTimeout(() => item.remove(), 320);
        }, innerWidth < 640 ? 2400 : 3200);
    };

    const renderTrophies = () => {
        const list = $("[data-trophies]");
        if (list) {
            list.replaceChildren(
                ...TROPHIES.map((trophy) => {
                    const item = el("li", got.has(trophy.id) ? "is-got" : "", got.has(trophy.id) ? trophy.title : "？？？");
                    item.title = trophy.hint;
                    return item;
                }),
            );
        }
        $$("[data-trophy-count]").forEach((node) => (node.textContent = `${got.size} / ${TROPHIES.length}`));
    };

    const unlock = (id) => {
        const trophy = TROPHIES.find((item) => item.id === id);
        if (!trophy || got.has(id)) return;
        got.add(id);
        store.set("trophies", [...got]);
        renderTrophies();
        sfx.play("trophy");
        toast(`TROPHY UNLOCKED ${got.size} / ${TROPHIES.length}`, trophy.title);
    };
    renderTrophies();

    /* ---------- 数字（作品数・受賞数など）は、データから数える ---------- */

    const awards = TIMELINE.filter((item) => item.quest === "award");
    const awardText = awards.map((item) => [item.title, ...(item.text || [])].join(" ")).join(" ");
    const isRare = (work) => awardText.includes(`「${work.title}」`) || (work.en?.title && awardText.includes(`「${work.en.title}」`));

    const careerYears = () => {
        const months = TIMELINE.map((item) => String(item.date || "").match(/^(\d{4})\.(\d{1,2})/))
            .filter(Boolean)
            .map(([, y, m]) => Number(y) * 12 + Number(m) - 1);
        if (!months.length) return 1;
        const now = new Date();
        return Math.max(1, Math.ceil((now.getFullYear() * 12 + now.getMonth() - Math.min(...months) + 1) / 12));
    };

    const COUNTS = {
        works: WORKS.length + MAIN_COUNT,
        awards: awards.length || 5,
        events: 10,
        blog: Number(BLOG.articleCount) || (BLOG.articles || []).length || 0,
        interns: TIMELINE.filter((item) => /インターン|intern/i.test(item.title || "")).length || 1,
        years: careerYears(),
    };

    const countUp = (node, value) => {
        if (calm() || !("IntersectionObserver" in window)) {
            node.textContent = String(value);
            return;
        }
        node.textContent = "0";
        const observer = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / 900);
                node.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
        observer.observe(node);
    };
    $$("[data-count]").forEach((node) => {
        const value = COUNTS[node.dataset.count];
        if (value === undefined) return;
        // 大きく見せる数字（ステータス）だけ数え上げる
        if (node.closest(".status, .blog-count, .q-stats")) countUp(node, value);
        else node.textContent = String(value);
    });

    /* ---------- ヘッダー ---------- */

    const header = $("#hd");
    const nav = $("#hd-nav");
    const menuButton = $(".hd-menu");
    const setMenu = (open) => {
        nav?.classList.toggle("is-open", open);
        menuButton?.setAttribute("aria-expanded", String(open));
        menuButton?.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    };
    menuButton?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    nav?.addEventListener("click", (event) => {
        if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav?.classList.contains("is-open")) {
            setMenu(false);
            menuButton.focus();
        }
    });
    const onScroll = () => header?.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // いま見ているセクションのメニューに印を付ける
    const navLinks = $$(".hd-nav a[href^='#']");
    if ("IntersectionObserver" in window) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.id;
                navLinks.forEach((link) => {
                    const target = link.getAttribute("href").slice(1);
                    const match = target === id || (target === "featured-works" && id === "other-works");
                    link.classList.toggle("is-current", match);
                    if (match) link.setAttribute("aria-current", "true");
                    else link.removeAttribute("aria-current");
                });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        $$("main > section[id]").forEach((section) => sectionObserver.observe(section));
    }

    /* ---------- トップの映像（スマホは軽い映像） ---------- */

    const heroVideo = $(".hero-video");
    if (heroVideo) {
        const start = () => {
            if (calm()) return;
            const small = matchMedia("(max-width: 960px)").matches;
            const src = small ? heroVideo.dataset.srcSmall : heroVideo.dataset.src;
            if (!src || heroVideo.getAttribute("src")) return;
            heroVideo.src = src;
            heroVideo.play().catch(() => {});
        };
        start();
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) heroVideo.pause();
            else if (!calm() && heroVideo.getAttribute("src")) heroVideo.play().catch(() => {});
        });
    }

    /* ---------- 最近の更新（トップ） ---------- */

    const news = $("[data-news]");
    if (news) {
        const latestWork = WORKS[0];
        const latestNote = (BLOG.articles || [])[0];
        if (latestWork) {
            const link = el("a");
            link.href = `#work=${idOf(latestWork)}`;
            link.append(el("span", "tag-red", "NEW WORK"), el("span", "", latestWork.title));
            link.addEventListener("click", (event) => {
                event.preventDefault();
                openViewer(0);
            });
            news.append(link);
        }
        if (latestNote && safeUrl(latestNote.url)) {
            const link = el("a");
            link.href = latestNote.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.append(el("span", "tag-ink", "NOTE"), el("span", "", String(latestNote.title || "").replace(/^「|」.*$/g, "")));
            news.append(link);
        }
    }

    /* ---------- スクロールで出てくる ---------- */

    const reveals = $$("[data-reveal]");
    if ("IntersectionObserver" in window && !calm()) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-in");
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8% 0px" });
        reveals.forEach((node) => revealObserver.observe(node));
    } else {
        reveals.forEach((node) => node.classList.add("is-in"));
    }

    /* ---------- SELECT MODE（目的を選ぶと、Contact の窓口も強調する） ---------- */

    const pickMode = (mode) => {
        $$(".mode-card").forEach((card) => card.classList.toggle("is-picked", card.dataset.mode === mode));
        $$(".purpose").forEach((card) => card.classList.toggle("is-picked", card.dataset.purpose === mode));
        store.set("mode", mode);
    };
    $$(".mode-card").forEach((card) =>
        card.addEventListener("click", () => {
            pickMode(card.dataset.mode);
            unlock("mode");
        }),
    );
    const savedMode = store.get("mode", "");
    if (savedMode) pickMode(savedMode);

    $("[data-trophy='start']")?.addEventListener("click", () => unlock("start"));

    /* ---------- メール（目的ごとに件名と本文のひな形を入れる） ---------- */

    const ADDRESS = ["haru2401game", "gmail.com"].join("@");
    const TEMPLATES = {
        recruit: ["【採用・インターン】ご連絡", "長屋 晴太 様\n\n会社名：\nお名前：\nご用件：\n"],
        game: ["【ゲーム制作のお誘い】", "長屋 晴太 様\n\nお名前・活動名：\n制作の内容（ゲームジャム／共同制作／開発のお手伝い など）：\nお願いしたい担当：\n期間・スケジュール：\n"],
        web: ["【Web制作のご相談】", "長屋 晴太 様\n\nお名前・会社名：\n作りたいサイトの内容：\n希望の時期：\nご予算の目安（わかれば）：\n"],
    };
    $$("[data-mail]").forEach((link) => {
        const template = TEMPLATES[link.dataset.mail];
        // Contact へ移動するだけのボタン（href="#contact"）は、窓口を強調する
        if (link.getAttribute("href") === "#contact") {
            link.addEventListener("click", () => pickMode(link.dataset.mail));
            return;
        }
        if (template) link.href = `mailto:${ADDRESS}?subject=${encodeURIComponent(template[0])}&body=${encodeURIComponent(template[1])}`;
    });

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const area = el("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.append(area);
            area.select();
            let ok = false;
            try {
                ok = document.execCommand("copy");
            } catch {
                ok = false;
            }
            area.remove();
            return ok;
        }
    };
    $("[data-copy-mail]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const ok = await copyText(ADDRESS);
        sfx.play("copy");
        button.textContent = ok ? "コピーしました" : "コピーできませんでした";
        setTimeout(() => (button.textContent = "コピー"), 1800);
    });

    /* ---------- ダイアログ（共通） ---------- */

    const openDialog = (dialog) => {
        if (!dialog || dialog.open) return;
        dialog.showModal();
        sfx.play("open");
    };
    $$("dialog").forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
            // 外側（背景）をクリックしたら閉じる
            if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
        });
        dialog.addEventListener("close", () => sfx.play("close"));
    });
    $$("[data-open]").forEach((button) =>
        button.addEventListener("click", () => openDialog(document.getElementById(button.dataset.open))),
    );

    /* ---------- 設定画面 ---------- */

    $$("[data-motion]").forEach((button) =>
        button.addEventListener("click", () => {
            settings.motion = button.dataset.motion;
            store.set("motion", settings.motion);
            applyMotion();
            if (settings.motion === "calm") heroVideo?.pause();
            else if (heroVideo) {
                if (!heroVideo.getAttribute("src")) heroVideo.src = matchMedia("(max-width: 960px)").matches ? heroVideo.dataset.srcSmall : heroVideo.dataset.src;
                heroVideo.play().catch(() => {});
                reveals.forEach((node) => node.classList.add("is-in"));
            }
        }),
    );
    const volume = $("#opt-volume");
    const volumeOut = $("[data-volume-out]");
    if (volume) {
        volume.value = String(settings.volume);
        if (volumeOut) volumeOut.textContent = String(settings.volume);
        volume.addEventListener("input", () => {
            settings.volume = Number(volume.value);
            if (volumeOut) volumeOut.textContent = volume.value;
        });
        volume.addEventListener("change", () => {
            store.set("volume", settings.volume);
            sfx.play("select");
        });
    }
    $("[data-sfx-demo]")?.addEventListener("click", () => {
        ["click", "select", "open", "trophy"].forEach((name, i) => setTimeout(() => sfx.play(name), i * 420));
    });

    /* ---------- Main Works（タブ・映像・写真） ---------- */

    const tabs = $$(".stage-tab");
    const seenStages = new Set();
    const selectTab = (name, { scroll = false, focus = false } = {}) => {
        tabs.forEach((tab) => {
            const on = tab.id === `tab-${name}`;
            tab.setAttribute("aria-selected", String(on));
            tab.tabIndex = on ? 0 : -1;
            const panel = document.getElementById(tab.getAttribute("aria-controls"));
            if (panel) panel.hidden = !on;
            if (!on && panel) stopMovie(panel);
            if (on && focus) tab.focus();
        });
        seenStages.add(name);
        if (seenStages.size >= 2) unlock("stage");
        if (scroll) $(".stage-tabs")?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(tab.id.replace("tab-", "")));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            selectTab(tabs[next].id.replace("tab-", ""), { focus: true });
            sfx.play("select");
        });
    });
    seenStages.add("shishito");
    $$("[data-go-tab]").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.goTab, { scroll: true })));
    $$("[data-tab]").forEach((link) => link.addEventListener("click", () => selectTab(link.dataset.tab)));

    function stopMovie(scope) {
        $$(".movie.is-playing", scope).forEach((movie) => {
            movie.querySelector("video")?.remove();
            movie.classList.remove("is-playing");
        });
    }
    $$(".movie").forEach((movie) => {
        $(".movie-play", movie)?.addEventListener("click", () => {
            const src = movie.dataset.video;
            if (!src) return;
            const video = el("video");
            video.src = src;
            video.controls = true;
            video.playsInline = true;
            video.setAttribute("aria-label", `${movie.dataset.title || ""}のプレイ映像`);
            movie.append(video);
            movie.classList.add("is-playing");
            heroVideo?.pause();
            video.play().catch(() => {});
            video.focus();
            unlock("movie");
        });
    });

    // 写真の拡大
    const lightbox = $("#lightbox");
    const openPhoto = (src, caption, alt) => {
        if (!lightbox) return;
        $("[data-lb='img']", lightbox).src = src;
        $("[data-lb='img']", lightbox).alt = alt || caption || "";
        $("[data-lb='caption']", lightbox).textContent = caption || "";
        openDialog(lightbox);
        unlock("album");
    };
    document.addEventListener("click", (event) => {
        const photo = event.target.closest(".photo, .tl-photo");
        if (!photo) return;
        openPhoto(photo.dataset.photo, photo.dataset.caption, photo.querySelector("img")?.alt);
    });

    // 遊びに行った
    document.addEventListener("click", (event) => {
        if (event.target.closest("[data-play]")) unlock("player");
    });

    /* ---------- Other Works（作品カード・絞り込み・詳しい画面） ---------- */

    const grid = $("[data-works]");
    const status = $("[data-works-status]");
    const cards = [];

    const traits = (work) => {
        const tech = `${work.tech || ""}`.toLowerCase();
        return {
            play: Boolean(safeUrl(work.play)),
            unity: /unity/.test(tech),
            cpp: /c\+\+|directx|dxlib/.test(tech),
            "3d": /3d/i.test(`${work.genre || ""} ${work.title || ""}`),
            team: Number(work.member) >= 2,
            rare: isRare(work),
            wip: /未完成/.test(work.role || ""),
        };
    };

    const playLabel = (url) => (/unityroom/.test(url) ? "▶ unityroom で遊ぶ" : /itch\.io/.test(url) ? "▶ itch.io で遊ぶ" : "▶ ブラウザで遊ぶ");

    WORKS.forEach((work, index) => {
        const t = traits(work);
        const item = el("li");
        const button = el("button", "work");
        button.type = "button";
        button.dataset.index = String(index);

        const thumb = el("span", "work-thumb");
        const img = el("img");
        img.src = asset(work.image);
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.width = 640;
        img.height = 360;
        thumb.append(img, el("span", "work-no", `STAGE ${String(WORKS.length - index).padStart(2, "0")}`));
        const badges = el("span", "work-badges");
        if (t.play) badges.append(el("span", "badge is-play", "▶ PLAYABLE"));
        if (t.rare) badges.append(el("span", "badge is-rare", "★ RARE"));
        if (t.team) badges.append(el("span", "badge", `TEAM×${work.member}`));
        if (t.wip) badges.append(el("span", "badge", "WIP"));
        thumb.append(badges);

        button.append(thumb, el("span", "work-title", work.title), el("span", "work-sub", `${work.genre || ""} ／ ${work.period || ""}`));
        button.setAttribute("aria-label", `${work.title}（${work.genre || ""}）の詳しい画面を開く`);
        item.append(button);
        grid?.append(item);
        cards.push({ item, work, traits: t });

        button.addEventListener("click", () => openViewer(index));

        // マウスを乗せると、8秒のプレイ映像を流す（パソコンのみ）
        if (work.preview) {
            let video = null;
            button.addEventListener("pointerenter", (event) => {
                if (event.pointerType !== "mouse" || calm()) return;
                if (!video) {
                    video = el("video");
                    video.muted = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.preload = "auto";
                    video.src = asset(work.preview);
                    video.setAttribute("aria-hidden", "true");
                    thumb.insertBefore(video, thumb.children[1]);
                }
                video.play().then(() => video.classList.add("is-on")).catch(() => {});
            });
            button.addEventListener("pointerleave", () => {
                if (!video) return;
                video.classList.remove("is-on");
                video.pause();
            });
        }
    });

    // 絞り込み
    const filters = $$("[data-filter]");
    const applyFilter = (name) => {
        let shown = 0;
        cards.forEach(({ item, traits: t }) => {
            const on = name === "all" || t[name];
            item.classList.toggle("is-hidden", !on);
            if (on) shown += 1;
        });
        filters.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === name)));
        if (status) status.textContent = name === "all" ? `${shown} 作品（Main Works の2作品は上で紹介）` : `${shown} 作品を表示中`;
    };
    filters.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));
    applyFilter("all");

    // 詳しい画面
    const viewer = $("#viewer");
    const v = (name) => $(`[data-v="${name}"]`, viewer);
    let current = -1;
    const opened = new Set();

    const visibleIndexes = () => cards.filter(({ item }) => !item.classList.contains("is-hidden")).map(({ work }) => WORKS.indexOf(work));

    function fillViewer(index) {
        const work = WORKS[index];
        if (!work || !viewer) return;
        current = index;
        const t = traits(work);
        v("img").src = asset(work.image);
        v("img").alt = work.alt || work.title;
        v("badges").replaceChildren(
            ...[
                t.play && ["badge is-play", "▶ PLAYABLE"],
                t.rare && ["badge is-rare", "★ RARE"],
                t.team && ["badge", `TEAM×${work.member}`],
                t.wip && ["badge", "WIP"],
            ].filter(Boolean).map(([cls, text]) => el("span", cls, text)),
        );
        v("title").textContent = work.title;
        v("meta").textContent = `${work.genre || ""} ／ ${work.period || ""}`;
        v("desc").textContent = work.description || "";
        v("tags").replaceChildren(
            ...String(work.tech || "").split(/\s+/).filter(Boolean).map((tech) => el("span", "", tech)),
            el("span", "is-line", Number(work.member) >= 2 ? `${work.member}人チーム` : "個人制作"),
            el("span", "is-line", `担当：${work.role || "—"}`),
        );
        v("point-box").hidden = !work.point;
        v("point").textContent = work.point || "";
        const play = safeUrl(work.play);
        v("play").hidden = !play;
        if (play) {
            v("play").href = play;
            v("play").textContent = playLabel(play);
        }
        const link = safeUrl(work.link);
        v("link").hidden = !link;
        if (link) v("link").href = link;
        const list = visibleIndexes();
        const pos = list.indexOf(index);
        v("pos").textContent = pos >= 0 ? `${pos + 1} / ${list.length}` : "";
        v("prev").disabled = pos <= 0;
        v("next").disabled = pos < 0 || pos >= list.length - 1;
        history.replaceState(history.state, "", `#work=${idOf(work)}`);
        opened.add(work.title);
        if (opened.size >= 3) unlock("hunter");
    }

    function openViewer(index) {
        fillViewer(index);
        openDialog(viewer);
    }

    if (viewer) {
        const step = (dir) => {
            const list = visibleIndexes();
            const pos = list.indexOf(current);
            const next = list[pos + dir];
            if (next === undefined) return;
            fillViewer(next);
            sfx.play("select");
        };
        v("prev").addEventListener("click", () => step(-1));
        v("next").addEventListener("click", () => step(1));
        viewer.addEventListener("keydown", (event) => {
            if (event.target.matches("input, textarea")) return;
            if (event.key === "ArrowLeft") step(-1);
            if (event.key === "ArrowRight") step(1);
        });
        v("copy").addEventListener("click", async () => {
            const work = WORKS[current];
            if (!work) return;
            // 今のサイトにある作品ごとのページ（works/○○/）のリンクをコピーする
            const url = new URL(`../works/${idOf(work)}/`, location.href).href;
            const ok = await copyText(url);
            sfx.play("copy");
            v("copy").textContent = ok ? "コピーしました" : "コピーできませんでした";
            setTimeout(() => (v("copy").textContent = "リンクをコピー"), 1800);
        });
        viewer.addEventListener("close", () => {
            if (location.hash.startsWith("#work=")) history.replaceState(history.state, "", `${location.pathname}${location.search}`);
            const card = cards.find(({ work }) => work === WORKS[current]);
            card?.item.querySelector(".work")?.focus({ preventScroll: true });
        });
    }

    // URL の #work=○○ で開く（作品ごとのリンク）
    const openFromHash = () => {
        const match = location.hash.match(/^#work=([a-z0-9-]+)$/);
        if (!match) return;
        if (match[1] === "shishito" || match[1] === "falien") {
            selectTab(match[1]);
            $("#featured-works")?.scrollIntoView();
            return;
        }
        const index = WORKS.findIndex((work) => idOf(work) === match[1]);
        if (index < 0) return;
        $("#other-works")?.scrollIntoView();
        openViewer(index);
    };
    addEventListener("hashchange", openFromHash);
    openFromHash();

    /* ---------- Timeline（ワールドマップ） ---------- */

    const track = $("[data-timeline]");
    if (track) {
        const nowIndex = TIMELINE.findIndex((item) => item.quest === "now");
        TIMELINE.forEach((item, index) => {
            const li = el("li", "tl-item");
            if (item.quest === "award") li.classList.add("is-award");
            if (item.quest === "now") li.classList.add("is-now");
            if (nowIndex < 0 || index < nowIndex) li.classList.add("is-done");
            li.append(el("span", "tl-date", item.date || ""), el("span", "tl-node"));
            const card = el("div", "tl-card");
            if (item.quest === "award") card.append(el("span", "tl-rare", "★ RARE"));
            if (item.quest === "now") card.append(el("span", "tl-rare", "NOW"));
            card.append(el("h3", "", item.title || ""), el("p", "", (item.text || []).join("")));
            if (item.photo?.image) {
                const button = el("button", "tl-photo");
                button.type = "button";
                button.dataset.photo = asset(item.photo.image);
                button.dataset.caption = item.photo.caption || "";
                button.setAttribute("aria-label", `写真を拡大：${item.photo.caption || item.title}`);
                const img = el("img");
                img.src = asset(item.photo.image);
                img.alt = item.photo.alt || "";
                img.loading = "lazy";
                if (item.photo.position) img.style.objectPosition = item.photo.position;
                button.append(img);
                card.append(button);
            }
            if (item.challenge) {
                const total = Number(item.challenge.total) || 10;
                const name = item.challenge.name || "";
                const done = Math.min(total, WORKS.filter((work) => name && String(work.title).startsWith(name)).length);
                const box = el("div", "challenge");
                const head = el("div", "challenge-head");
                head.append(el("span", "", name || "CHALLENGE"), el("span", "", `${done} / ${total}`));
                const bar = el("div", "challenge-bar");
                bar.setAttribute("role", "progressbar");
                bar.setAttribute("aria-label", item.challenge.label || item.title || "");
                bar.setAttribute("aria-valuemin", "0");
                bar.setAttribute("aria-valuemax", String(total));
                bar.setAttribute("aria-valuenow", String(done));
                const fill = el("span");
                bar.append(fill);
                box.append(head, bar);
                card.append(box);
                requestAnimationFrame(() => setTimeout(() => (fill.style.width = `${(done / total) * 100}%`), 300));
            }
            li.append(card);
            track.append(li);
        });

        const scroller = $("[data-tl-scroller]");
        const ctrl = $$("[data-tl]");
        const updateCtrl = () => {
            if (!scroller) return;
            const max = scroller.scrollWidth - scroller.clientWidth - 2;
            ctrl.forEach((button) => (button.disabled = Number(button.dataset.tl) < 0 ? scroller.scrollLeft <= 2 : scroller.scrollLeft >= max));
        };
        ctrl.forEach((button) =>
            button.addEventListener("click", () => {
                scroller.scrollBy({ left: Number(button.dataset.tl) * Math.min(780, scroller.clientWidth * 0.8), behavior: calm() ? "auto" : "smooth" });
            }),
        );
        scroller?.addEventListener("scroll", updateCtrl, { passive: true });
        addEventListener("resize", updateCtrl);
        updateCtrl();

        // マウスのホイール（縦）でも横に進める
        scroller?.addEventListener("wheel", (event) => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.shiftKey) return;
            const max = scroller.scrollWidth - scroller.clientWidth;
            const atEdge = (event.deltaY < 0 && scroller.scrollLeft <= 0) || (event.deltaY > 0 && scroller.scrollLeft >= max - 1);
            if (atEdge) return;
            event.preventDefault();
            scroller.scrollLeft += event.deltaY;
        }, { passive: false });
    }

    /* ---------- Blog（最新の記事） ---------- */

    const articles = $("[data-articles]");
    if (articles) {
        (BLOG.articles || []).slice(0, 3).forEach((article, index) => {
            const url = safeUrl(article.url);
            if (!url) return;
            const li = el("li");
            const link = el("a", "article");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            const box = el("span", "article-img");
            if (/^https:\/\/assets\.st-note\.com\//.test(article.thumbnail || "")) {
                const img = el("img");
                img.src = article.thumbnail;
                img.alt = "";
                img.loading = "lazy";
                img.referrerPolicy = "no-referrer";
                box.append(img);
            }
            const time = el("time", "", article.date || "");
            if (index === 0) time.append(el("span", "tag-red", "NEW"));
            link.append(box, time, el("b", "", article.title || ""), el("span", "go", "記事を読む →"));
            li.append(link);
            articles.append(li);
        });
    }

    /* ---------- 全部のセクションを見た・エンディング ---------- */

    const allSections = $$("main > section[id]:not(#ending)");
    const seen = new Set();
    if ("IntersectionObserver" in window) {
        const seenObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                seen.add(entry.target.id);
                seenObserver.unobserve(entry.target);
                if (seen.size >= allSections.length) unlock("explorer");
            });
        }, { rootMargin: "-40% 0px -40% 0px" });
        allSections.forEach((section) => seenObserver.observe(section));

        // エンディングはページのいちばん下にあって画面の真ん中まで来ないことがあるので、半分見えたら
        const ending = $("#ending");
        if (ending) {
            const endObserver = new IntersectionObserver((entries) => {
                if (!entries[0].isIntersecting) return;
                endObserver.disconnect();
                seen.add("ending");
                unlock("clear");
                const score = $("[data-ending-score]");
                if (score) score.textContent = `TROPHY ${got.size} / ${TROPHIES.length} ・ 見た作品 ${opened.size}`;
                if (seen.size >= allSections.length) unlock("explorer");
            }, { threshold: 0.5 });
            endObserver.observe(ending);
        }
    }
})();
