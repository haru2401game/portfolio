/* ========================================
   boot.js：ページを描く前に、設定と起動演出を決める（<head> で読み込む）

   ・設定は今のサイトと同じ localStorage の pa-settings を使う（どちらのデザインでも同じ設定になる）
       motion: "default" | "lite" | "none"（アニメーション：デフォルト／軽量／なし）
       lang:   "ja" | "en"
   ・<html> に付けるクラス
       motion-set  … 設定を反映した印（CSS の「端末で動きを減らす設定」の予備の判定に使う）
       motion-lite … 軽量（カーソル・カードの傾き・スクロール連動などを止める）
       motion-off  … なし（動きをすべて止める）
       is-booting  … 起動演出を出す（タブを開いて最初の1回だけ・アニメーションがデフォルトのときだけ）
       i18n-wait   … 英語に訳し終わるまで本文を隠す（2.5秒で必ず外す）
======================================== */

(() => {
    const root = document.documentElement;
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem("pa-settings")) || {};
    } catch {
        saved = {};
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let motion = saved.motion;
    if (!["default", "lite", "none"].includes(motion)) motion = reduced ? "none" : "default";

    root.classList.add("motion-set");
    root.classList.toggle("motion-off", motion === "none");
    root.classList.toggle("motion-lite", motion === "lite");

    if (saved.lang === "en") {
        root.lang = "en";
        root.classList.add("i18n-wait");
        setTimeout(() => root.classList.remove("i18n-wait"), 2500);
    }

    try {
        if (motion === "default" && !sessionStorage.getItem("next-booted") && !location.hash) root.classList.add("is-booting");
    } catch {
        /* 保存が使えないときは演出なし */
    }
})();
