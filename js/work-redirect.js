/* ========================================
   work-redirect.js：作品ごとのページ（works/○○/）から、本体の作品の場所へすぐ移動する

   ・works/○○/index.html は、X などにリンクを貼ったときに「作品の画像とタイトルのカード」を出すためだけのページ
     （中身は scripts/work-pages.js が data/works.js から自動で作る）
   ・開いたら、すぐ本体の …/portfolio/#work=○○ へ移動して、その作品を開く
   ・どこから来たか（X・Discord など）を分析で分かるように、来た元のドメインだけを ?from= で渡す
     （URL の残りの部分や個人を特定する情報は渡さない。analytics.js が受け取って、URL から消す）
======================================== */

(() => {
    const id = document.documentElement.dataset.work || "";
    let from = "";
    try {
        const host = document.referrer ? new URL(document.referrer).hostname : "";
        if (host && host !== location.hostname) from = host.replace(/^www\./, "");
    } catch {
        from = "";
    }
    const query = from ? `?from=${encodeURIComponent(from)}` : "";
    location.replace(`../../${query}#work=${encodeURIComponent(id)}`);
})();
