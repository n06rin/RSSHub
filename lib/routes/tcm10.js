const got = require('@/utils/got');
const cheerio = require('cheerio');
const moment = require('moment');

const ABSOLUTE_URL = 'http://tcm10.ru';

module.exports = async (ctx) => {
    const response = await got({
        method: 'get',
        url: `${ABSOLUTE_URL}/novosti`,
    });

    const $ = cheerio.load(response.data);
    const list = $('.news-anons');

    ctx.state.data = {
        title: 'Телевизионная станция МИР - НОВОСТИ',
        link: `${ABSOLUTE_URL}/novosti.html`,
        item:
            list &&
            list
                .map((index, item) => {
                    item = $(item);
                    const itemPicUrl = `${ABSOLUTE_URL}/${item.find('img').attr('src')}`;
                    return {
                        title: item.find('h4').first().text(),
                        description: `<img src="${itemPicUrl}"<br />${item.find('.summary').first().text()}`,
                        link: `${ABSOLUTE_URL}${item.find('.news-anons > a').first().attr('href')}`,
                        pubDate: moment(item.find('.date'), 'DD.MM.YYYY').utc(),
                    };
                })
                .get(),
    };
};
