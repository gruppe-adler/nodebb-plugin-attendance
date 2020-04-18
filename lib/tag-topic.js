"use strict";

const settings = require('./settings');
const logger = require('./logger');

function isEvent(title) {
    return title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
}

function arrayRemoveOne(item) {
    const idx = this.indexOf(item);
    if (idx === -1) {
        return [];
    }
    return this.splice(idx, 1, []);
}

function getCategories(pluginSettings, mode/*: 'r'|'w'*/, groups) {
    let categories = [];
    groups.forEach(function (group) {
        categories = categories.concat((pluginSettings[group] && pluginSettings[group][mode]) ?  pluginSettings[group][mode] : []);
    });
    return categories
}

function getAllEventCategories(pluginSettings) {
    let categories = [];
    Object.keys(pluginSettings).forEach(function (groupName) {
        categories = categories.concat(getCategories(pluginSettings, 'r', [groupName]));
    });

    return categories;
}

module.exports = function(data, next) {
    const topic = data.topic;
    const categoryId = Number(topic.cid);
    const tags = data.data.tags;

    settings.getPermissions().then((pluginSettings) => {
        if (getAllEventCategories(pluginSettings).indexOf(categoryId) !== -1) {
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
    }).catch(err => {
        logger.error('halp, could not tag topic: ' + JSON.stringify(data) + ' , err: ' + err.message);
        next(err, data);
    });
};

