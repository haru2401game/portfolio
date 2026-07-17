const Parser = require("rss-parser");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const parser = new Parser();

const RSS_URL = "https://note.com/ha_03ru_01/rss";
const PROFILE_URL = "https://note.com/ha_03ru_01";


// ======================================
// サムネイル取得
// ======================================

async function getThumbnail(url)
{
    try
    {
        const response = await axios.get(url);

        const $ = cheerio.load(response.data);

        return $('meta[property="og:image"]').attr("content") || "";
    }
    catch
    {
        return "";
    }
}


// ======================================
// 記事数取得
// ======================================

async function getArticleCount()
{
    try
    {
        const response = await axios.get(PROFILE_URL);

        // __NEXT_DATA__ を取得
        const match = response.data.match(
            /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
        );

        if(!match)
        {
            return 0;
        }

        const json = JSON.parse(match[1]);

        // JSON全体から articleCount を探す
        const text = JSON.stringify(json);

        const countMatch = text.match(/"articleCount":([0-9]+)/);

        if(countMatch)
        {
            return Number(countMatch[1]);
        }

        return 0;
    }
    catch(error)
    {
        console.log(error);

        return 0;
    }
}

// ======================================
// 日付整形
// ======================================

function formatDate(dateString)
{
    const date = new Date(dateString);

    return `${date.getFullYear()}.` +
           `${String(date.getMonth()+1).padStart(2,"0")}.` +
           `${String(date.getDate()).padStart(2,"0")}`;
}


// ======================================
// HTML削除
// ======================================

function stripHtml(html)
{
    if(!html) return "";

    return html
        .replace(/<[^>]*>/g,"")
        .replace(/\s+/g," ")
        .trim();
}


// ======================================
// メイン
// ======================================

async function main()
{
    const feed = await parser.parseURL(RSS_URL);

    // 最新記事タイトルから記事数取得
    let articleCount = 0;

    const match = feed.items[0].title.match(/#(\d+)/);

    if (match)
    {
        articleCount = Number(match[1]);
    }

    const articles = [];

    for(const item of feed.items.slice(0,3))
    {
        const thumbnail = await getThumbnail(item.link);

        articles.push({

            title:item.title,

            date:formatDate(item.pubDate),

            thumbnail:thumbnail,

            summary:
                stripHtml(item.contentSnippet || item.content)
                .substring(0,100) + "...",

            url:item.link

        });
    }

    if(!fs.existsSync("data"))
    {
        fs.mkdirSync("data");
    }

    fs.writeFileSync(

        "data/blog.json",

        JSON.stringify({

            articleCount,

            articles

        },null,4),

        "utf8"

    );

    console.log("================================");
    console.log("blog.json 更新完了");
    console.log("記事数:",articleCount);
    console.log("最新記事:",articles.length);
    console.log("================================");
}

main();