"use strict";

const meta = require('./lib/meta.js');
const floatPersistence = require('./lib/persistence-float');

function noop() {}
function identity(e) {
    return e;
}

// implementation like Underscore does it
function memoize(func, hasher) {
    const memo = {};
    hasher || (hasher = identity);
    return function() {
        const key = hasher.apply(this, arguments);
        return memo.hasOwnProperty(key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
}

module.exports.setup = function (params, callback) {

    let admin = require('./lib/admin');
    admin(params, meta, function () {
        require('./lib/api')(params, noop);
        require('./lib/views')(params, meta, noop);

        callback();
    });
};

module.exports.tagTopic = require('./lib/tag-topic');

module.exports.admin = {
    menu: function (custom_header, callback) {
        custom_header.plugins.push({
            "route": '/plugins/' + meta.nbbId,
            "icon": 'fa-calendar',
            "name": meta.name,
            "nbbId": meta.nbbId,
        });

        callback(null, custom_header);
    }
};

const titleToTimestamp = memoize(function (title) {
    const matches = title.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})[^a-z0-9]/i);
    if (!matches) {
        return 0;
    }
    return parseInt((new Date(matches[1])).getTime() / 1000, 10);
});

module.exports.colorTopic = function (data, cb) {

    data.topics.forEach(function (topic) {
        topic.referencetime = titleToTimestamp(topic.title) || topic.lastposttime;
    });
    data.topics = data.topics.sort(function (a, b) {
        if (b.pinned && !a.pinned) {
            return 1;
        } else if (!b.pinned && a.pinned) {
            return -1;
        }
        return b.referencetime - a.referencetime;
    });

    cb(null, data);
};

module.exports.catchArma3SlottingSet = function (data) {
    const uid = data.uid;
    const tid = data.tid;


    const dataSet = {
        tid: tid,
        uid: uid,
        probability: 1,
        timestamp: (new Date()).getTime()
    };

    floatPersistence.set(
        tid,
        dataSet
    );
};
