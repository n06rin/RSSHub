const got = require('@/utils/got');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: 'http://feeds.feedburner.com/sibfm/all',
    });

    const $feedPage = cheerio.load(response.data);
    const list = $feedPage('div[id="bodyblock"] ul li');

    const newsList = await Promise.all(
        list.toArray().map(async (item) => {
            const $headline = $feedPage(item);

            const link = `https://sib.fm${$headline.find('.itemtitle a').attr('href')}`;

            const pubDate = moment($headline.find('.itemposttime').text().split('Posted:')[1]).utc().format();

            const description = await ctx.cache.tryGet(link, async () => {
                const articlePage = await got.get(link);
                const $articlePage = cheerio.load(articlePage.data);

                const articleImageSrc = $articlePage('meta[property="og:image"]').attr('content');

                const shortAnons = $articlePage('meta[property="og:title"]').attr('content');

                return `<img src="${articleImageSrc}"<br />${shortAnons}`;
            });

            return {
                title: $headline.find('.itemtitle').text(),
                description,
                author: 'редакция сиб.фм',
                link,
                pubDate,
            };
        })
    );

    ctx.state.data = {
        title: 'Сиб.фм • Все сразу',
        link: 'http://feeds.feedburner.com/sibfm/all',
        item: newsList,
    };
};
