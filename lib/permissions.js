const nodebb = require('./nodebb');
const settings = require('./settings');
const logger = require('./logger');

const getAllowedGroups = async function (mode, categoryId) {
    const pluginSettings = await settings.getPermissions();
    return Object.keys(pluginSettings).filter(function (groupName) {
        return !(!pluginSettings[groupName][mode] || pluginSettings[groupName][mode].indexOf(categoryId) === -1);
    });
};

const can = async function (mode, uid, tid) {
    const cid = await nodebb.topics.getTopicField(tid, 'cid');
    const allowedGroups = await getAllowedGroups(mode, Number(cid));
    const groupsIsMember = await nodebb.groups.isMemberOfGroups([uid], allowedGroups);

    return groupsIsMember.reduce(
        function (cur, prev) { return prev || cur; },
        (allowedGroups.indexOf('guests') !== -1)
    );
};

module.exports.canAttend = function (uid, tid) {
    return can('w', uid, tid);
};

module.exports.canSee = function (uid, tid) {
    return can('r', uid, tid);
};
