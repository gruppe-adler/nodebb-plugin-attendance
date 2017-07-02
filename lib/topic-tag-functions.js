"use strict";

let db = require('../../../src/database');

module.exports.getTagsTopicCount = function (tags, cb) {
    let keys = tags.map(function (tag) {
        return 'tag:' + tag + ':topics';
    });
    db.sortedSetIntersectCard(keys, cb);

};

module.exports.getTagsTids = function (tags, start, stop, cb) {
    let keys = tags.map(function (tag) {
        return 'tag:' + tag + ':topics';
    });
    db.getSortedSetRevIntersect({sets: keys, start: start, stop: stop}, cb);
};
