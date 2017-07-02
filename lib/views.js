"use strict";

const validator = require('validator');
const topics = require('../../../src/topics');
const async = require('async');
const nconf = require('nconf');
const pagination = require('../../../src/pagination');
const topicTagFunctions = require('./topic-tag-functions');
const user = require('../../../src/user');

module.exports = function (params, meta, callback) {

    const renderEvents = function (req, res, next) {
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
            title: '[[pages:tag, ' + tag + ']]'
        };
        let settings;
        let topicsPerPage = 20;
        let topicCount = 0;
        async.waterfall([
            function (next) {
                user.getSettings(req.uid, next);
            },
            function (_settings, next) {
                settings = _settings;
                topicsPerPage = Math.max(settings.topicsPerPage, 20);
                const start = Math.max(0, (page - 1) * topicsPerPage);
                const stop = start + topicsPerPage - 1;
                templateData.nextStart = stop + 1;
                async.parallel({
                    topicCount: function (next) {
                        topicTagFunctions.getTagsTopicCount(tags, next);
                    },
                    tids: function (next) {
                        topicTagFunctions.getTagsTids(tags, start, stop, next);
                    }
                }, next);
            },
            function (results, next) {
                if (Array.isArray(results.tids) && !results.tids.length) {
                    return res.render('tag', templateData);
                }
                topicCount = results.topicCount;
                topics.getTopics(results.tids, req.uid, next);
            }
        ], function (err, topics) {
            if (err) {
                return next(err);
            }

            res.locals.metaTags = [
                {
                    property: 'og:url',
                    content: nconf.get('url') + (tag ? '/events/' + tag : '/events')
                }
            ];
            templateData.topics = topics;
            const pageCount = Math.max(1, Math.ceil(topicCount / topicsPerPage));
            templateData.pagination = pagination.create(page, pageCount);

            res.render('views/events', templateData);
        });
    };

    params.router.get('/events', params.middleware.buildHeader, renderEvents);
    params.router.get('/api/events', renderEvents);


    params.router.get('/events/:tag', params.middleware.buildHeader, renderEvents);
    params.router.get('/api/events/:tag', renderEvents);

    callback();
};
