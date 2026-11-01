/* ========================================
   経歴データ（Timeline）
   ・ここに書いた順に、上から（古い順に）表示される。新しい出来事は「いちばん下」に書き足す
   ・js/timeline.js がこのデータから Timeline を作り、main.js / play.js がワールドマップ・クエスト・トロフィーなどを自動で付ける

   1つの出来事に書く項目
     date    日付（例："2026.11"）
     title   見出し
     text    本文。1行ずつ [" ", " "] のように並べる（改行の位置）
   なくてもよい項目
     quest      "award" … 受賞（★RARE・トロフィー・受賞作の判定に使う）／ "now" … いま挑戦中（いちばん下の1つだけ）
                ※ 受賞作にしたい作品は、text に「作品名」とカギかっこ付きで書く（作品カードのタイトルと同じ名前）
     photo      写真 { image: 画像, alt: 説明, size: [横, 縦], caption: 拡大したときの説明, position: "50% 30%"（見せたい位置・なくてもよい） }
     challenge  進捗バー { name: 表示名, total: 目標の本数, label: 読み上げ用の説明 }（"now" の出来事だけ）
     en         英語 { title: "...", text: ["...", "..."], caption: "...", alt: "..." }（書かない項目は日本語のまま）
======================================== */

window.TIMELINE = [
    {
        date: "2025.04",
        title: "入学・ゲーム業界を目指す",
        text: [
            "トライデントコンピュータ専門学校で",
            "ゲーム制作について学び始めた",
            "本格的にゲーム開発に挑戦",
        ],
        photo: {
            image: "images/index/TimeLine/entrance.webp",
            alt: "専門学校トライデントの入学式の看板の前でポーズをとる様子",
            size: [1280, 720],
            caption: "入学式：専門学校トライデントの入学式にて",
        },
    },
    {
        quest: "award",
        date: "2025.06",
        title: "初受賞・ゲームジャム",
        text: [
            "初めてゲームジャムに参加",
            "チームでクリエイティブ賞を受賞",
        ],
    },
    {
        date: "2025.06",
        title: "初オリジナルタイトル",
        text: [
            "C++を使用した",
            "「HOOKING BOX」を制作",
            "初めてのオリジナルタイトル作品",
        ],
    },
    {
        date: "2025.07",
        title: "外部ゲームジャムへ参加",
        text: ["「学生チーム対抗ゲームジャム2025」へ参加"],
    },
    {
        quest: "award",
        date: "2025.09",
        title: "企業プレゼン・受賞",
        text: [
            "「Over Fish」を企業の方々へプレゼン",
            "学校内コンペティションにて企業賞受賞",
        ],
        photo: {
            image: "images/index/TimeLine/presentation.webp",
            alt: "学校内コンペティションの表彰で、企業賞の賞品を受け取る様子",
            size: [1280, 720],
            caption: "企業プレゼン：学校内コンペティションでの企業賞の表彰",
        },
    },
    {
        quest: "award",
        date: "2025.11",
        title: "クラス内1位：Click Hero",
        text: [
            "「Click Hero」",
            "クラス内投票で総合1位を受賞",
        ],
    },
    {
        quest: "award",
        date: "2025.12",
        title: "クラス内1位：POTION BERSERKER",
        text: [
            "「POTION BERSERKER」",
            "クラス内投票で総合1位を受賞",
        ],
    },
    {
        date: "2026.01",
        title: "進級展への展示",
        text: [
            "「RETURN RECORD」",
            "「POTION BERSERKER」",
            "個人とチームで進級展に展示",
        ],
        photo: {
            image: "images/index/TimeLine/shinkyu.webp",
            alt: "進級展で「RETURN RECORD」のポスターを持ち、作品を展示している様子",
            size: [960, 1280],
            caption: "進級展：「RETURN RECORD」の展示",
            position: "50% 35%",
        },
    },
    {
        date: "2026.02",
        title: "企業合同ゲームジャムに参加",
        text: ["学校と企業の共同主催ゲームジャムに参加"],
    },
    {
        date: "2026.04",
        title: "ポートフォリオ制作開始",
        text: ["自作ポートフォリオサイトを作り始めた"],
    },
    {
        date: "2026.06",
        title: "部活動ゲームジャムに参加",
        text: [
            "学校内の部活動にて",
            "初めて後輩とのゲームジャムに挑戦",
        ],
    },
    {
        date: "2026.08",
        title: "大手ゲーム企業のインターン",
        text: ["ゲーム企業のインターンシップに参加"],
    },
    {
        quest: "award",
        date: "2026.09",
        title: "IGCCグランプリ受賞",
        text: ["IGCCゲームジャムにて「Falien」がグランプリを受賞"],
        photo: {
            image: "images/index/TimeLine/igcc.webp",
            alt: "IGCCゲームジャムのグランプリのトロフィーを手に喜ぶ様子",
            size: [720, 1280],
            caption: "IGCCゲームジャム：「Falien」でグランプリを受賞",
            position: "50% 30%",
        },
    },
    {
        date: "2026.09",
        title: "東京ゲームショウへ出展",
        text: ["TGS2026で「ししとう」を展示"],
        photo: {
            image: "images/index/TimeLine/tgs.webp",
            alt: "東京ゲームショウ2026のIGDA日本ブースで「ししとう」を展示している様子",
            size: [1280, 960],
            caption: "東京ゲームショウ2026：IGDA日本ブースで「ししとう」を展示",
        },
    },
    {
        quest: "now",
        date: "2026.10",
        title: "3Dゲーム制作",
        text: ["Unityを用いた3Dゲーム10本制作チャレンジを開始"],
        challenge: { name: "3D CHALLENGE", total: 10, label: "3Dゲーム10本制作チャレンジの進捗" },
    },
];
