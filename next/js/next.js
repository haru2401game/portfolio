/* ========================================
   next.js：新デザインの本体（作品・経歴・ブログ・設定など）
   ・採用担当の方・大人の方向けの落ち着いたデザイン。効果音・トロフィーなどの遊び要素はクラシックだけ

   ・作品・経歴・ブログは、今のサイトと同じデータ（data/*.js）から作る
   ・画像・動画の置き場所は <html data-base="…"> を前に付けて探す（BETA 版は "../"、本番は ""）
   ・設定は今のサイトと同じ pa-settings（boot.js がページを描く前に反映している）
   ・このデザインだけの記録（選んだ目的）は next-○○ に保存する（見ている人のブラウザだけ）
   ・動き（スクロール連動など）は motion.js
======================================== */

(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const root = document.documentElement;
    const WORKS = Array.isArray(window.WORKS) ? window.WORKS : [];
    const TIMELINE = Array.isArray(window.TIMELINE) ? window.TIMELINE : [];
    const BLOG = window.BLOG_DATA || {};
    const MAIN_COUNT = 2; // Main Works（ししとう・Falien）

    const BASE = root.dataset.base || "";

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

    // 英語表示（../js/i18n.js）：作品・経歴のデータに書いてある英語（en）を、辞書に足す
    const english = (window.I18N_WORKS = window.I18N_WORKS || {});
    const addEnglish = (ja, en) => {
        const key = String(ja ?? "").replace(/\s+/g, " ").trim();
        if (key && en) english[key] = String(en);
    };
    WORKS.forEach((work) => {
        const en = work.en || {};
        ["title", "alt", "genre", "role", "description", "point"].forEach((field) => addEnglish(work[field], en[field]));
    });
    TIMELINE.forEach((item) => {
        const en = item.en || {};
        addEnglish(item.title, en.title);
        if (Array.isArray(en.text)) (item.text || []).forEach((line, i) => addEnglish(line, en.text[i]));
        if (item.photo) {
            addEnglish(item.photo.caption, en.caption);
            addEnglish(item.photo.alt, en.alt);
        }
    });
    // 「ジャンル ／ 時期」のように並べる文字は、訳せるように1つずつ別の文字として入れる
    const joined = (parts, separator = " ／ ") => {
        const fragment = document.createDocumentFragment();
        parts.filter(Boolean).forEach((part, i) => {
            if (i) fragment.append(document.createTextNode(separator));
            fragment.append(el("span", "", part));
        });
        return fragment;
    };

    // アクセス解析（analytics.js）に「何が使われたか」を伝える（今のサイトと同じ名前で数える）
    const emit = (name) => document.dispatchEvent(new CustomEvent("play:event", { detail: { name } }));

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    // リンクは http(s) か、サイトの中のページだけ
    const safeUrl = (url) => (/^(https?:\/\/|\.\.?\/)/i.test(String(url || "").trim()) ? String(url).trim() : "");
    // 画像・動画は data-base の場所から読む
    const asset = (path) => (/^https?:\/\//.test(path || "") ? path : path ? `${BASE}${String(path).replace(/^\.?\//, "")}` : "");

    // 作品ごとのリンクの名前（今のサイトの js/works.js と同じ作り方）
    const idOf = (work) =>
        String(work.id || work.en?.title || work.title || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    /* ---------- 設定（今のサイトと同じ pa-settings） ---------- */

    const SETTINGS_KEY = "pa-settings";
    const DEFAULT_VOLUME = 70;
    const readSettings = () => {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch {
            saved = {};
        }
        const volume = Number(saved.volume);
        return {
            // boot.js が決めたクラスに合わせる（保存が無いときは、端末の「動きを減らす」設定から決まっている）
            motion: ["default", "lite", "none"].includes(saved.motion) ? saved.motion : root.classList.contains("motion-off") ? "none" : "default",
            volume: Number.isFinite(volume) ? Math.min(100, Math.max(0, Math.round(volume))) : DEFAULT_VOLUME,
            muted: saved.muted === true,
            // 効果音はクラシックだけの設定。保存されている値はそのまま残す
            sfx: saved.sfx === "on" ? "on" : "off",
            lang: saved.lang === "en" ? "en" : "ja",
        };
    };
    const settings = readSettings();
    const saveSettings = () => {
        try {
            // ほかの項目（デザインの切り替え・BGM など）を消さないように混ぜて保存する
            let saved = {};
            try {
                saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
            } catch {
                saved = {};
            }
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, ...settings }));
        } catch {
            /* 保存できなくても、このページの間は効く */
        }
    };
    const calm = () => root.classList.contains("motion-off");
    const applyMotion = () => {
        root.classList.toggle("motion-off", settings.motion === "none");
        root.classList.toggle("motion-lite", settings.motion === "lite");
        document.dispatchEvent(new CustomEvent("settings:change", { detail: { ...settings } }));
    };
    window.NextSettings = { get: () => ({ ...settings }) };

    /* ---------- 通知（右下のトースト） ---------- */

    const toasts = $("[data-toasts]");
    const toast = (label, title, info = false) => {
        if (!toasts) return;
        const item = el("div", `toast${info ? " is-info" : ""}`);
        const icon = el("span", "toast-ic");
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L19 7"></path></svg>';
        const text = el("span");
        text.append(el("small", "", label), el("b", "", title));
        item.append(icon, text);
        toasts.append(item);
        setTimeout(() => {
            item.classList.add("is-out");
            setTimeout(() => item.remove(), 320);
        }, innerWidth < 640 ? 2400 : 3200);
    };
    // ほかの部品（ゲームパッドなど）からのお知らせを、同じ通知の形で出す
    document.addEventListener("play:notify", (event) => {
        const { label = "INFO", text = "" } = event.detail || {};
        toast(label, String(text).trim(), true);
    });

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
        // 大きく見せる数字（実績）だけ数え上げる
        if (node.closest(".status, .blog-count")) countUp(node, value);
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

    // 通信量を抑える設定（データセーバー）の人と、アニメーション「なし」の人には、動画を流さず画像のままにする
    const heroVideo = $(".hero-video");
    const heroPause = $("[data-hero-pause]");
    const saveData = Boolean(navigator.connection?.saveData);
    let heroPausedByUser = false;
    const startHero = () => {
        if (!heroVideo || calm() || saveData || heroPausedByUser || document.hidden) return;
        if (!heroVideo.getAttribute("src")) {
            const src = matchMedia("(max-width: 960px)").matches ? heroVideo.dataset.srcSmall : heroVideo.dataset.src;
            if (!src) return;
            heroVideo.src = src;
        }
        heroVideo.play().catch(() => {});
    };
    const syncHeroPause = () => {
        if (!heroPause) return;
        heroPause.hidden = saveData || calm();
        heroPause.setAttribute("aria-pressed", String(heroPausedByUser));
        heroPause.setAttribute("aria-label", heroPausedByUser ? "背景の動画を再生" : "背景の動画を一時停止");
        heroPause.classList.toggle("is-paused", heroPausedByUser);
    };
    if (heroVideo) {
        // 画像の読み込みと通信を取り合わないように、ページの表示が終わってから流す
        if (document.readyState === "complete") setTimeout(startHero, 300);
        else addEventListener("load", () => setTimeout(startHero, 300), { once: true });
        document.addEventListener("visibilitychange", () => (document.hidden ? heroVideo.pause() : startHero()));
        // ずっと動いているものは、見る人が止められるように（WCAG 2.2.2）
        heroPause?.addEventListener("click", () => {
            heroPausedByUser = !heroPausedByUser;
            if (heroPausedByUser) heroVideo.pause();
            else startHero();
            syncHeroPause();
        });
        syncHeroPause();
    }

    /* ---------- 最近の更新（トップ） ---------- */

    const news = $("[data-news]");
    if (news) {
        const latestWork = WORKS[0];
        const latestNote = (BLOG.articles || [])[0];
        if (latestWork) {
            const link = el("a");
            link.href = `#work=${idOf(latestWork)}`;
            link.append(el("span", "news-label", "New Work"), el("span", "", latestWork.title));
            link.addEventListener("click", (event) => {
                event.preventDefault();
                emit("最近の更新: 作品");
                openViewer(0);
            });
            news.append(link);
        }
        if (latestNote && safeUrl(latestNote.url)) {
            const link = el("a");
            link.href = latestNote.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            const noteTitle = el("span", "", String(latestNote.title || "").replace(/^「|」.*$/g, ""));
            noteTitle.dataset.noTranslate = ""; // note の記事タイトルは訳さない
            link.append(el("span", "news-label", "note"), noteTitle);
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

    /* ---------- 目的別の入口（目的を選ぶと、Contact の窓口も強調する） ---------- */

    const pickMode = (mode) => {
        $$(".mode-card").forEach((card) => card.classList.toggle("is-picked", card.dataset.mode === mode));
        $$(".purpose").forEach((card) => card.classList.toggle("is-picked", card.dataset.purpose === mode));
        store.set("mode", mode);
    };
    $$(".mode-card").forEach((card) =>
        card.addEventListener("click", () => {
            pickMode(card.dataset.mode);
        }),
    );
    const savedMode = store.get("mode", "");
    if (savedMode) pickMode(savedMode);


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
        button.textContent = ok ? "コピーしました" : "コピーできませんでした";
        setTimeout(() => (button.textContent = "コピー"), 1800);
    });

    /* ---------- ダイアログ（共通） ---------- */

    const openDialog = (dialog) => {
        if (!dialog || dialog.open) return;
        dialog.showModal();
    };
    $$("dialog").forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
            // 外側（背景）をクリックしたら閉じる
            if (event.target === dialog || event.target.closest("[data-close]")) dialog.close();
        });
    });
    $$("[data-open]").forEach((button) =>
        button.addEventListener("click", () => {
            openDialog(document.getElementById(button.dataset.open));
            if (button.dataset.open === "options") emit("設定を開いた");
        }),
    );
    // ページ内の近道（目次）
    $$(".jump a").forEach((link) => link.addEventListener("click", () => emit(`近道: ${link.textContent.trim()}`)));

    /* ---------- 設定画面 ---------- */

    const options = $("#options");
    const MOTION_NOTES = {
        default: "スクロールに合わせた、ゆるやかな動きが出ます",
        lite: "スクロール連動の動きを止めて、軽く表示します",
        none: "動きをすべて止めます",
    };
    const renderOptions = () => {
        if (!options) return;
        $$("[data-setting]", options).forEach((group) => {
            $$("[role='radio']", group).forEach((button) => {
                const on = settings[group.dataset.setting] === button.dataset.value;
                button.setAttribute("aria-checked", String(on));
                button.tabIndex = on ? 0 : -1;
            });
        });
        const note = $("[data-note='motion']", options);
        if (note) note.textContent = MOTION_NOTES[settings.motion] || "";
        const range = $("#opt-volume", options);
        const out = $("[data-volume-out]", options);
        const mute = $("[data-mute]", options);
        if (range) range.value = String(settings.volume);
        if (out) out.textContent = settings.muted ? "OFF" : String(settings.volume);
        if (mute) {
            mute.setAttribute("aria-pressed", String(settings.muted));
            mute.classList.toggle("is-muted", settings.muted);
        }
    };
    const applyVolume = (video) => {
        if (!video || video.classList.contains("hero-video")) return;
        video.volume = settings.volume / 100;
        video.muted = settings.muted || settings.volume === 0;
    };
    const changeSetting = (key, value) => {
        if (settings[key] !== value) emit(`設定: ${key}=${value}`);
        settings[key] = value;
        saveSettings();
        if (key === "motion") {
            applyMotion();
            if (calm()) heroVideo?.pause();
            else {
                startHero();
                reveals.forEach((node) => node.classList.add("is-in"));
            }
            syncHeroPause();
        }
        if (key === "lang") window.I18n?.setLang?.(value);
        renderOptions();
    };
    if (options) {
        $$("[data-setting]", options).forEach((group) => {
            const radios = $$("[role='radio']", group);
            radios.forEach((button, index) => {
                button.addEventListener("click", () => changeSetting(group.dataset.setting, button.dataset.value));
                // ← → で選び直せる（ラジオボタンと同じ操作）
                button.addEventListener("keydown", (event) => {
                    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                    if (!step) return;
                    event.preventDefault();
                    const next = radios[(index + step + radios.length) % radios.length];
                    changeSetting(group.dataset.setting, next.dataset.value);
                    next.focus();
                });
            });
        });
        const range = $("#opt-volume", options);
        range?.addEventListener("input", () => {
            settings.volume = Number(range.value);
            settings.muted = false;
            $$(".movie video").forEach(applyVolume);
            renderOptions();
        });
        range?.addEventListener("change", () => {
            saveSettings();
            emit(`設定: volume=${settings.volume}`);
        });
        $("[data-mute]", options)?.addEventListener("click", () => {
            settings.muted = !settings.muted;
            saveSettings();
            $$(".movie video").forEach(applyVolume);
            renderOptions();
        });
        $("[data-reset]", options)?.addEventListener("click", () => {
            Object.assign(settings, { motion: matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "default", volume: DEFAULT_VOLUME, muted: false });
            changeSetting("lang", "ja");
            changeSetting("motion", settings.motion);
        });
        renderOptions();
    }
    /* ---------- Main Works（タブ・映像・写真） ---------- */

    const tabs = $$(".stage-tab");
    let activeTab = "shishito";
    const selectTab = (name, { scroll = false, focus = false } = {}) => {
        const changed = name !== activeTab;
        activeTab = name;
        tabs.forEach((tab) => {
            const on = tab.id === `tab-${name}`;
            tab.setAttribute("aria-selected", String(on));
            tab.tabIndex = on ? 0 : -1;
            const panel = document.getElementById(tab.getAttribute("aria-controls"));
            if (panel) {
                panel.hidden = !on;
                if (on && changed) {
                    panel.classList.remove("is-enter");
                    void panel.offsetWidth; // アニメーションを最初から
                    panel.classList.add("is-enter");
                }
            }
            if (!on && panel) stopMovie(panel);
            if (on && focus) tab.focus();
        });
        if (scroll) $(".stage-tabs")?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(tab.id.replace("tab-", "")));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            selectTab(tabs[next].id.replace("tab-", ""), { focus: true });
        });
    });
    $$("[data-go-tab]").forEach((button) =>
        button.addEventListener("click", () => {
            if (button.dataset.goTab === "falien") emit("Falien へ: ししとうの下から");
            selectTab(button.dataset.goTab, { scroll: true });
        }),
    );
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
            applyVolume(video);
            video.playsInline = true;
            video.setAttribute("aria-label", `${movie.dataset.title || ""}のプレイ映像`);
            movie.append(video);
            movie.classList.add("is-playing");
            heroVideo?.pause();
            video.play().catch(() => {});
            video.focus();
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
    };
    document.addEventListener("click", (event) => {
        const photo = event.target.closest(".photo, .tl-photo");
        if (!photo) return;
        openPhoto(photo.dataset.photo, photo.dataset.caption, photo.querySelector("img")?.alt);
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

    const playLabel = (url) => (/unityroom/.test(url) ? "unityroom で遊ぶ ↗" : /itch\.io/.test(url) ? "itch.io で遊ぶ ↗" : "ブラウザで遊ぶ ↗");

    // 作品の小さな印（遊べる・受賞・チーム・制作中）
    const badgesOf = (work, t) =>
        [
            t.rare && ["badge is-rare", "受賞"],
            t.play && ["badge", "遊べる"],
            t.team && ["badge", `${work.member}人チーム`],
            t.wip && ["badge", "制作中"],
        ]
            .filter(Boolean)
            .map(([cls, text]) => el("span", cls, text));

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
        thumb.append(img);
        const badges = el("span", "work-badges");
        badgesOf(work, t).forEach((badge) => badges.append(badge));
        thumb.append(badges);

        button.append(thumb, el("span", "work-title", work.title), el("span", "work-sub"));
        button.lastChild.append(joined([work.genre, work.period]));
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
    // 作品が多いので、最初は数段だけ見せて、残りは「すべての作品を見る」で開く（下のセクションまで見てもらいやすく）
    const FOLD_AT = () => (matchMedia("(max-width: 640px)").matches ? 6 : matchMedia("(max-width: 1180px)").matches ? 9 : 12);
    let worksOpen = false;
    const moreWorks = el("button", "btn btn-ink works-more");
    moreWorks.type = "button";
    moreWorks.setAttribute("aria-controls", "works-grid");
    if (grid) {
        grid.id = "works-grid";
        grid.after(moreWorks);
    }
    const foldWorks = () => {
        const shownCards = cards.filter(({ item }) => !item.classList.contains("is-hidden"));
        const limit = FOLD_AT();
        shownCards.forEach(({ item }, index) => item.classList.toggle("is-folded", !worksOpen && index >= limit));
        cards.filter(({ item }) => item.classList.contains("is-hidden")).forEach(({ item }) => item.classList.remove("is-folded"));
        const rest = shownCards.length - limit;
        moreWorks.hidden = rest <= 0;
        moreWorks.setAttribute("aria-expanded", String(worksOpen));
        moreWorks.textContent = worksOpen ? "作品をたたむ" : `すべての作品を見る（あと ${rest} 作品）`;
    };
    moreWorks.addEventListener("click", () => {
        worksOpen = !worksOpen;
        foldWorks();
        emit(worksOpen ? "もっと見る: 作品" : "たたむ: 作品");
        if (worksOpen) {
            // 開いたときは、新しく出てきた1枚目へ
            const first = cards.find(({ item }) => !item.classList.contains("is-hidden") && Number(item.dataset.order) === FOLD_AT());
            first?.item.querySelector(".work")?.focus({ preventScroll: true });
        } else if (moreWorks.getBoundingClientRect().top < 0 || moreWorks.getBoundingClientRect().top > innerHeight) {
            // たたんだときに、ボタンが画面の外なら作品の見出しへ戻る
            $("#other-works")?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
        }
    });
    addEventListener("resize", () => foldWorks());

    const applyFilter = (name) => {
        let shown = 0;
        cards.forEach(({ item, traits: t }) => {
            const on = name === "all" || t[name];
            item.classList.toggle("is-hidden", !on);
            if (on) item.dataset.order = String(shown++);
        });
        filters.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === name)));
        if (status) status.textContent = name === "all" ? `${shown} 作品（Main Works の2作品は上で紹介）` : `${shown} 作品を表示中`;
        foldWorks();
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
        v("badges").replaceChildren(...badgesOf(work, t));
        v("title").textContent = work.title;
        v("meta").replaceChildren(joined([work.genre, work.period]));
        v("desc").textContent = work.description || "";
        v("tags").replaceChildren(
            ...String(work.tech || "").split(/\s+/).filter(Boolean).map((tech) => el("span", "", tech)),
            el("span", "is-line", Number(work.member) >= 2 ? `${work.member}人チーム` : "個人制作"),
            (() => {
                const role = el("span", "is-line");
                role.append(el("span", "", "担当："), el("span", "", work.role || "—"));
                return role;
            })(),
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
        v("play").dataset.title = work.title;
        // アクセス解析（analytics.js）が「どの作品が見られたか」を数える
        document.dispatchEvent(new CustomEvent("work-viewer:open", { detail: { title: work.title } }));
        opened.add(work.title);
    }

    function openViewer(index) {
        // たたんでいる作品を開いたとき（作品ごとのリンクなど）は、一覧も開いておく（閉じたあと、その作品に戻れるように）
        const card = cards.find(({ work }) => work === WORKS[index]);
        if (card?.item.classList.contains("is-folded")) {
            worksOpen = true;
            foldWorks();
        }
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
            const url = new URL(`${BASE}works/${idOf(work)}/`, location.href).href;
            const ok = await copyText(url);
            if (ok) emit(`作品リンクをコピー: ${work.title}`);
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
            emit(`作品リンクから: ${match[1] === "falien" ? "Falien" : "ししとう"}`);
            selectTab(match[1]);
            $("#featured-works")?.scrollIntoView();
            return;
        }
        const index = WORKS.findIndex((work) => idOf(work) === match[1]);
        if (index < 0) return;
        emit(`作品リンクから: ${WORKS[index].title}`);
        $("#other-works")?.scrollIntoView();
        openViewer(index);
    };
    addEventListener("hashchange", openFromHash);
    openFromHash();

    /* ---------- Timeline（経歴） ---------- */

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
            if (item.quest === "award") card.append(el("span", "tl-rare", "受賞"));
            if (item.quest === "now") card.append(el("span", "tl-rare", "現在"));
            // 1行ずつ別の文字にする（英語の辞書が1行ずつなので）
            const text = el("p");
            (item.text || []).forEach((line) => text.append(el("span", "", line)));
            card.append(el("h3", "", item.title || ""), text);
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

        // 経歴も長いので、最初は新しい出来事だけ見せて、それより前は「これまでの歩みを見る」で開く
        const SHOW_RECENT = 5;
        const tlItems = $$(".tl-item", track);
        const older = tlItems.slice(0, Math.max(0, tlItems.length - SHOW_RECENT));
        if (older.length) {
            const moreTl = el("button", "btn btn-line tl-more");
            moreTl.type = "button";
            moreTl.setAttribute("aria-controls", "timeline-track");
            track.id = "timeline-track";
            let tlOpen = false;
            const render = () => {
                older.forEach((item) => item.classList.toggle("is-folded", !tlOpen));
                moreTl.setAttribute("aria-expanded", String(tlOpen));
                moreTl.textContent = tlOpen ? "これまでの歩みをたたむ" : `これまでの歩みを見る（あと ${older.length} 件）`;
            };
            moreTl.addEventListener("click", () => {
                tlOpen = !tlOpen;
                // 開いても閉じても、ボタンが画面の同じ位置に残るようにする（上に出来事が増えて画面が飛ばないように）
                const before = moreTl.getBoundingClientRect().top;
                render();
                scrollBy({ top: moreTl.getBoundingClientRect().top - before, behavior: "instant" });
                emit(tlOpen ? "もっと見る: 経歴" : "たたむ: 経歴");
            });
            track.before(moreTl);
            render();
        }

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
            if (index === 0) time.append(el("span", "article-new", "New"));
            const title = el("b", "", article.title || "");
            title.dataset.noTranslate = ""; // note の記事タイトルは訳さない
            link.append(box, time, title, el("span", "go", "記事を読む →"));
            li.append(link);
            articles.append(li);
        });
    }

})();
