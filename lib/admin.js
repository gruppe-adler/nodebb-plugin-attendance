"use strict";

let logger = require('./logger');
const groups = require('../../../src/groups');
const topics = require('../../../src/topics');
let Meta = require('../../../src/meta');

let pluginSettings = {
};

const identity = function (x) { return x; };

function getGroups(callback) {
    const ephemeralGroups = groups.getEphemeralGroups ? groups.getEphemeralGroups() : ['guests'];
    groups.getGroups('groups:visible:createtime', 0, 4096 /*arbitraty high integer*/, function (err, groups) {
        groups = (groups || []).concat(ephemeralGroups);
        callback(err, groups);
    });
}

function parseSettingsValue(value)/*: Array<number>*/ {
    return value
        .split(',')
        .map(function (n) { return Number(n.trim())})
        .filter(identity);
}

function parsePluginSettings(rawSettings) {
    Object.keys(rawSettings).forEach(function (key) {
        const categoryIds = parseSettingsValue(rawSettings[key]);
        const m = key.match(/categories-([rw])-(.+)/);
        if (!m) {
            logger.warn('unknown setting ' + key);
            return;
        }
        let mode = m[1];
        let groupName = m[2];

        pluginSettings[groupName] = pluginSettings[groupName] || {};
        pluginSettings[groupName][mode] = categoryIds;
    });
}

module.exports = function (params, meta, callback) {
    var renderAdmin = function(req, res, next) {
        getGroups(function (err, groups) {
            var viewData = Object.create(meta);
            viewData.groups = groups;
            if (err) {
                throw err;
            }
            res.render('admin/plugins/' + meta.nbbId, viewData);
        });
    };

    Meta.settings.get(meta.nbbId, function(err, settings) {
        if (err || !settings) {
            logger.warn('Settings not set or could not be retrived!');
        } else {
            parsePluginSettings(settings);
            logger.info('Settings loaded: ' + JSON.stringify(pluginSettings));
        }

        params.router.get('/admin/plugins/' + meta.nbbId, params.middleware.admin.buildHeader, renderAdmin);
        params.router.get('/api/admin/plugins/' + meta.nbbId, renderAdmin);

        callback();
    });
};

function getCategories(mode/*: 'r'|'w'*/, groups) {
    let categories = [];
    groups.forEach(function (group) {
        categories = categories.concat((pluginSettings[group] && pluginSettings[group][mode]) ?  pluginSettings[group][mode] : []);
    });
    return categories
}

const getAllowedGroups = function (mode, categoryId) {
    return Object.keys(pluginSettings).filter(function (groupName) {
        return !(!pluginSettings[groupName][mode] || pluginSettings[groupName][mode].indexOf(categoryId) === -1);
    });
};

module.exports.getReadCategories = function (groups) {
    return getCategories('r', groups);
};

module.exports.getAllEventCategories = function () {
    let categories = [];
    Object.keys(pluginSettings).forEach(function (groupName) {
        categories = categories.concat(getCategories('r', [groupName]));
    });

    return categories;
};

module.exports.isReadCategoryAllowed = function (groups, categoryId) {
    return getCategories('r', groups).indexOf(categoryId) !== -1;
};

module.exports.getAllowedCategories = getCategories;

module.exports.getWriteCategories = function (groups) {
    return getCategories('w', groups);
};

module.exports.isWriteCategoryAllowed = function (groups, categoryId) {
    return getCategories('w', groups).indexOf(categoryId) !== -1;
};


const can = function (mode, uid, tid, callback) {
    topics.getTopicField(tid, 'cid', function (err, cid) {
        if (err) {
            throw err;
        }
        const allowedGroups = getAllowedGroups(mode, Number(cid));
        groups.isMemberOfGroups([uid], allowedGroups, function (err, groupsIsMember) {
            let isMemberOfSomeGroup = groupsIsMember.reduce(
                function (cur, prev) { return prev || cur; },
                (allowedGroups.indexOf('guests') !== -1)
            );
            callback(err, isMemberOfSomeGroup);
        });
    });
};

module.exports.canAttend = function (uid, tid, callback) {
    return can('w', uid, tid, callback);
};

module.exports.canSee = function (uid, tid, callback) {
    return can('r', uid, tid, callback);
};
