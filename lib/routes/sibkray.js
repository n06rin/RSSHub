const got = require('@/utils/got');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

const ABSOLUTE_URL = 'https://sibkray.ru';

/** возвращяет месяц как число
 * @param {string} строка вида "января" "февраля"
 * @returns {number}
 */
const getLocalMonthsAsNumber = (localMonthString) => {
    const lowerCaseLocalMonthString = localMonthString.toLowerCase();
    switch (lowerCaseLocalMonthString) {
        case 'января':
            return 0;
        case 'февраля':
            return 1;
        case 'марта':
            return 2;
        case 'апреля':
            return 3;
        case 'мая':
            return 4;
        case 'июня':
            return 5;
        case 'июля':
            return 6;
        case 'августа':
            return 7;
        case 'сентября':
            return 8;
        case 'октября':
            return 9;
        case 'ноября':
            return 10;
        case 'декабря':
        default:
            return 11;
    }
};

/** парсит строку в moment объект
 * @param {string} строка вида "31 января 2021 14:16"
 * @returns {moment}
 */
const getParsedPubDate = (pubDateAsString) => {
    const [date, monthsLocal, years, hoursMinutes] = pubDateAsString.split(' ');
    const [hours, minutes] = hoursMinutes.split(':');
    return moment.tz(
        {
            years: parseInt(years, 10),
            months: getLocalMonthsAsNumber(monthsLocal),
            date: parseInt(date, 10),
            hours: parseInt(hours, 10),
            minutes: parseInt(minutes, 10),
        },
        'Asia/Krasnoyarsk'
    );
};

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: `${ABSOLUTE_URL}/news/`,
    });

    const $newsPage = cheerio.load(response.data);
    const list = $newsPage('div[data-key]');

    const newsList = await Promise.all(
        list.toArray().map(async (item) => {
            const headline = $newsPage(item);

            const link = `${ABSOLUTE_URL}${headline.find('h3 a').first().attr('href')}`;

            const [description, author] = await ctx.cache.tryGet(link, async () => {
                const articlePage = await got.get(link);
                const $articlePage = cheerio.load(articlePage.data);

                const articleImageSrc = $articlePage('meta[property="og:image"]').attr('content');
                const articleFirstParagraph = $articlePage('p b').first().text();

                const subtitle = $articlePage('.i-date > span');
                const author = cheerio(subtitle.get(1)).text();

                return [`<img src="${articleImageSrc}"<br />${articleFirstParagraph}`, author];
            });

            const pubDate = getParsedPubDate(headline.find('.i-date > span').text()).format();

            return {
                title: headline.find('h3').first().text(),
                author,
                description,
                link,
                pubDate,
            };
        })
    );

    ctx.state.data = {
        title: 'Сибкрай.ru - Лента новостей',
        link: `${ABSOLUTE_URL}/news/`,
        item: newsList,
    };
};
