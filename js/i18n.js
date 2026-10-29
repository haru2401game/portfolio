/* ========================================
   i18n.js：日本語 ⇄ 英語の切り替え（設定画面の「言語」）

   ・ページは日本語で書き、英語は data/i18n-en.js の辞書（日本語 → 英語）で置き換える
   ・JavaScript があとから作る文言（通知・トロフィーなど）も、出てきた時点で訳す
   ・日本語に戻すときは、置き換える前の文字を覚えておいて元に戻す（ページの再読み込みは不要）
   ・note の記事タイトルなど、辞書に無い文字はそのまま
   ※ 文言を追加・変更したら、data/i18n-en.js にも英語を追加する
======================================== */

(() => {
    const root = document.documentElement;
    const ATTRS = ["alt", "aria-label", "title", "placeholder", "data-caption", "data-text"];
    const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "TEXTAREA"]);
    const JAPANESE = /[぀-ヿ㐀-鿿！-｠]/;

    const textOriginals = new WeakMap();   // テキスト → 置き換える前の日本語
    const textApplied = new WeakMap();     // テキスト → 置き換えた英語
    const attrOriginals = new WeakMap();   // 要素 → { 属性: 日本語 }
    const touched = new Set();             // 元に戻すために覚えておく要素・テキスト（WeakRef）

    let lang = root.lang === "en" ? "en" : "ja";
    let dict = null;
    let patterns = [];
    let reverse = null;
    const original = { title: document.title };

    const norm = (text) => text.replace(/\s+/g, " ").trim();

    // 日本語 1 つを英語にする（辞書 → テンプレートの順に探す。見つからなければ null）
    const translate = (ja) => {
        const key = norm(ja);
        if (!key || !dict) return null;
        if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
        for (const [regex, replacement] of patterns) {
            const match = key.match(regex);
            if (!match) continue;
            return replacement.replace(/\{(t?)(\d)\}/g, (_, needsTranslate, index) => {
                const part = match[Number(index)] || "";
                return needsTranslate ? translate(part) ?? part : part;
            });
        }
        return null;
    };

    const remember = (target) => touched.add(new WeakRef(target));

    const skipped = (node) => {
        const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        return !parent || SKIP.has(parent.tagName) || parent.closest("[data-no-translate], .article-card h3");
    };

    const translateText = (node) => {
        const value = node.nodeValue;
        if (!value || !JAPANESE.test(value) || textApplied.get(node) === value || skipped(node)) return;
        const english = translate(value);
        if (english == null) return;
        const lead = value.match(/^\s*/)[0];
        const trail = value.match(/\s*$/)[0];
        const next = `${lead}${english}${trail}`;
        textOriginals.set(node, value);
        textApplied.set(node, next);
        remember(node);
        node.nodeValue = next;
    };

    const translateAttrs = (element) => {
        if (skipped(element)) return;
        for (const name of ATTRS) {
            const value = element.getAttribute(name);
            if (!value || !JAPANESE.test(value)) continue;
            const english = translate(value);
            if (english == null) continue;
            const saved = attrOriginals.get(element) || {};
            saved[name] = value;
            attrOriginals.set(element, saved);
            remember(element);
            element.setAttribute(name, english);
        }
    };

    const translateTree = (start) => {
        if (start.nodeType === Node.TEXT_NODE) {
            translateText(start);
            return;
        }
        if (start.nodeType !== Node.ELEMENT_NODE) return;
        translateAttrs(start);
        start.querySelectorAll("*").forEach(translateAttrs);
        const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) translateText(walker.currentNode);
    };

    const restoreAll = () => {
        touched.forEach((ref) => {
            const target = ref.deref();
            if (!target) return;
            if (target.nodeType === Node.TEXT_NODE) {
                if (textOriginals.has(target) && target.nodeValue === textApplied.get(target)) {
                    target.nodeValue = textOriginals.get(target);
                }
                textApplied.delete(target);
            } else {
                const saved = attrOriginals.get(target) || {};
                Object.entries(saved).forEach(([name, value]) => target.setAttribute(name, value));
                attrOriginals.delete(target);
            }
        });
        touched.clear();
    };

    // あとから増えた・変わった文言も訳す（英語のときだけ）
    const observer = new MutationObserver((mutations) => {
        if (lang !== "en") return;
        for (const mutation of mutations) {
            if (mutation.type === "childList") mutation.addedNodes.forEach(translateTree);
            else if (mutation.type === "characterData") translateText(mutation.target);
            else if (mutation.type === "attributes") translateAttrs(mutation.target);
        }
    });

    // 辞書（data/i18n-en.js）は英語を選んだときだけ読み込む
    let loading = null;
    const loadDictionary = () => {
        if (dict) return Promise.resolve();
        if (loading) return loading;
        loading = new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "data/i18n-en.js?v=c769e7ce";
            script.onload = () => {
                const data = window.I18N_EN || {};
                // 作品の英語（data/works.js の en）は、作品データの方を優先する（js/works.js が集めたもの）
                dict = { ...(data.texts || {}), ...(window.I18N_WORKS || {}) };
                patterns = (data.patterns || []).map(([source, replacement]) => [new RegExp(source), replacement]);
                resolve();
            };
            script.onerror = () => resolve();
            document.head.append(script);
        });
        return loading;
    };

    const apply = async (next) => {
        lang = next === "en" ? "en" : "ja";
        root.lang = lang;
        if (lang === "en") {
            await loadDictionary();
            if (lang !== "en") return;
            document.title = window.I18N_EN?.title || original.title;
            translateTree(document.body);
            observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        } else {
            observer.disconnect();
            restoreAll();
            document.title = original.title;
        }
        root.classList.remove("i18n-wait");
        document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang } }));
    };

    window.I18n = {
        setLang: apply,
        get lang() {
            return lang;
        },
        // アクセス解析では、英語表示中でも日本語の名前で記録する（表示言語で集計が分かれないように）
        toJa(text) {
            if (lang !== "en" || !dict) return text;
            if (!reverse) {
                reverse = new Map();
                Object.entries(dict).forEach(([ja, en]) => {
                    if (en && !reverse.has(en)) reverse.set(en, ja);
                });
            }
            return reverse.get(norm(String(text))) ?? text;
        },
    };

    if (lang === "en") apply("en");
})();
