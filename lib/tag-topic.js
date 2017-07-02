"use strict";

var topicDb = require('../../../src/topics');
var getAllowedCategories = require('./admin').getAllowedCategories;

var isEvent = function (title) {
    return title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
};

module.exports = function(data, next) {
    var topic = data.topic;
    var categoryId = Number(topic.cid);
    var tags = [];

    if (getAllowedCategories().indexOf(categoryId) !== -1) {
        if (isEvent(topic.title)) {
            tags.push('event');
            tags.push('cid-' + categoryId);
        }
    }

    topicDb.createTags(tags, topic.tid, topic.timestamp, function (err, res) {
        next(err, data);
    });
};

