const got = require('@/utils/got');
const cheerio = require('cheerio');
const moment = require('moment');

/** возвращяет месяц как число
 * @param {string} строка вида "января" "февраля"
 * @returns {number}
 */
const getLocalMonthsAsNumber = (localMonthString) => {
    const lowerCaseLocalMonthString = localMonthString.toLowerCase();
    switch (lowerCaseLocalMonthString) {
        case 'январь':
            return 0;
        case 'февраль':
            return 1;
        case 'март':
            return 2;
        case 'апрель':
            return 3;
        case 'май':
            return 4;
        case 'июнь':
            return 5;
        case 'июль':
            return 6;
        case 'август':
            return 7;
        case 'сентябрь':
            return 8;
        case 'октябрь':
            return 9;
        case 'ноябрь':
            return 10;
        case 'декабрь':
        default:
            return 11;
    }
};

/** парсит строку в moment объект
 * @param {string} строка вида "31 января 2021 14:16"
 * @returns {moment}
 */
const getParsedPubDate = (pubDateAsString) => {
    const [date, monthsLocal, years, hours, minutes] = pubDateAsString.trim().replace(' |', '').replace(':', ' ').split(' ');
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

const ABSOLUTE_URL = 'https://precedent.tv';

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: `${ABSOLUTE_URL}/news`,
    });

    const $newsPage = cheerio.load(response.data);
    const list = $newsPage('section.rubriks-wrapper article');

    ctx.state.data = {
        title: 'Программа Прецедент - Новости',
        link: `${ABSOLUTE_URL}/news`,
        item:
            list &&
            list
                .toArray()
                .map((item) => {
                    item = $newsPage(item);
                    const title = item.find('h3').text();
                    if (!title) {
                        return null;
                    }
                    const itemPicUrl = item.find('figure img').attr('data-src');
                    const description = `<img src="${itemPicUrl}"<br />${item.find('p').first().text()}`;
                    const link = item.find('a.read_more').first().attr('href');
                    const pubDate = getParsedPubDate(item.find('time').text()).format();
                    return {
                        title,
                        description,
                        link,
                        pubDate,
                    };
                })
                .filter((newsItem) => !!newsItem),
    };
};
