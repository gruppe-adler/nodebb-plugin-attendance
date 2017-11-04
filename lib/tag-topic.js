"use strict";

const topicDb = require('../../../src/topics');
const getAllEventCategories = require('./admin').getAllEventCategories;

var isEvent = function (title) {
    return title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
};

var arrayRemoveOne = function (item) {
    const idx = this.indexOf(item);
    if (idx === -1) {
        return [];
    }
    return this.splice(idx, 1, []);
};

module.exports = function(data, next) {
    var topic = data.topic;
    var categoryId = Number(topic.cid);
    var tags = data.data.tags;

    if (getAllEventCategories().indexOf(categoryId) !== -1) {
        const eventTags = ['event', 'cid-' + categoryId];
        if (isEvent(topic.title)) {
            eventTags.forEach(function (tag) {tags.push(tag); });
        } else {
            eventTags.forEach(function (tag) {
                arrayRemoveOne.call(tags, tag);
            });
        }
    }

    next(null, data);
};

