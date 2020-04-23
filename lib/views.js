"use strict";

const validator = require.main.require('validator');
const nodebb = require('./nodebb');
const logger = require('./logger');
const nconf = require.main.require('nconf');
const topicTagFunctions = require('./topic-tag-functions');
const settings = require('./settings');
const _ = require.main.require('underscore');

module.exports = function (params, meta, callback) {

    const renderEvents = async function (req, res, next) {
        try {
            const tag = validator.escape(String(req.params.tag || ''));
            const page = parseInt(req.query.page, 10) || 1;
            // var minAttendants = parsInt(req.query.minAttendants, 10) || 0;

            const tags = ['event'];
            if (tag) {
                tags.push(tag);
            }

            const templateData = {
                topics: [],
                tag: tag,
                // breadcrumbs: helpers.buildBreadcrumbs([{text: '[[tags:tags]]', url: '/events'}, {text: tag}]),
                title: '[[attendance:events-title]]'
            };

            const userSettings = await nodebb.user.getSettings(req.uid);

            const topicsPerPage = Math.max(userSettings.topicsPerPage, 20);
            const start = Math.max(0, (page - 1) * topicsPerPage);
            const stop = start + topicsPerPage - 1;
            templateData.nextStart = stop + 1;
            const [topicCount, tids, permissionSettings, eventsTitle] = await Promise.all([
                topicTagFunctions.getTagsTopicCount(tags),
                topicTagFunctions.getTagsTids(tags, start, stop),
                settings.getPermissions(),
                settings.getEventsTitle()
            ]);
            const eventsCategories = _.uniq(Object.getOwnPropertyNames(permissionSettings).reduce((prev, cur) => {
                return prev.concat(permissionSettings[cur].r).concat(permissionSettings[cur].w);
            }, []));
            const categories = await nodebb.categories.getCategories(eventsCategories);
            categories.map(c => {
                return {name: c.name, cid: c.cid};
            });

            if (Array.isArray(tids) && !tids.length) {
                return res.render('tag', templateData); // "there are no topics with this tag"
            }

            const topics = await nodebb.topics.getTopics(tids, req.uid);

            const data = await nodebb.plugins.fireHook('filter:events.topics.get', {topics: topics, uid: req.uid});
            res.locals.metaTags = [
                {
                    property: 'og:url',
                    content: nconf.get('url') + (tag ? '/events/' + tag : '/events')
                }
            ];
            templateData.topics = data.topics;
            templateData.eventsTitle = eventsTitle || 'Events';
            templateData.categories = categories;
            const pageCount = Math.max(1, Math.ceil(topicCount / topicsPerPage));
            templateData.pagination = nodebb.pagination.create(page, pageCount);

            res.render('views/events', templateData);
        } catch (err) {
            logger.error(err);
            res.render('500', {path: 'view/events', message: err.message})
        }
    };

    params.router.get('/events', params.middleware.buildHeader, renderEvents);
    params.router.get('/api/events', renderEvents);


    params.router.get('/events/:tag', params.middleware.buildHeader, renderEvents);
    params.router.get('/api/events/:tag', renderEvents);

    callback();
};
