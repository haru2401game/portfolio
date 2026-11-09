/* 起動演出を出すかどうかを、画面が描かれる前に決める（タブで最初の1回だけ・アニメーションひかえめ時は出さない） */
(() => {
    try {
        const calm = localStorage.getItem("next-motion") === '"calm"' || (matchMedia("(prefers-reduced-motion: reduce)").matches && localStorage.getItem("next-motion") !== '"on"');
        if (calm || sessionStorage.getItem("next-booted") || location.hash) return;
        document.documentElement.classList.add("is-booting");
    } catch {
        /* 保存が使えないときは演出なし */
    }
})();
