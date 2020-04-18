"use strict";

let db = require('./nodebb').database;

module.exports.getTagsTopicCount = async function (tags) {
    let keys = tags.map(function (tag) {
        return 'tag:' + tag + ':topics';
    });
    return db.sortedSetIntersectCard(keys);
};

module.exports.getTagsTids = async function (tags, start, stop) {
    let keys = tags.map(function (tag) {
        return 'tag:' + tag + ':topics';
    });
    return db.getSortedSetRevIntersect({sets: keys, start: start, stop: stop});
};
