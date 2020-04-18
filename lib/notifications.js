"use strict";

const nodebb = require('./nodebb');
const floatPersistence = require('./persistence-float');
const _ = require.main.require('underscore');
const logger = require('./logger');

async function getEventTitle(tid) {
    return await nodebb.topics.getTopicField(tid, 'title');
}

async function getUser(currentUid, uid) {
    const users = await nodebb.user.getUsersWithFields([uid], ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'], currentUid);
    return users.pop();
}

async function getAttendingUids(tid) {
    const attendants = await floatPersistence.get(tid);

    return _.values(attendants)
        .map(function (attendant) {
            return attendant.probability > 0 ? attendant.uid : 0;
        })
        .filter(function (uid) {
            return uid > 0;
        });
}

module.exports.notifyAttendanceChange = async function (currentUid, affectedUid, tid, newProbability) {
    let msg;
    switch (newProbability) {
        case 1: msg = '%s registered for event "%s"'; break;
        case 0: msg = '%s unregistered from event "%s"'; break;
        case 0.5: msg = '%s is not sure about their attendance to event "%s"'; break;
        default: return;
    }
    const [affectedUser, eventTitle, followingUids, attendingUids] = await Promise.all([
        getUser(currentUid, affectedUid),
        getEventTitle(tid),
        nodebb.topics.getFollowers(tid),
        getAttendingUids(tid),
    ]);

    msg = msg.replace('%s', affectedUser.username).replace('%s', eventTitle);
    nodebb.notifications.create({
        bodyShort: msg,
        bodyLong: msg,
        image: affectedUser.picture,
        nid: 'attendance:' + tid + ':user:' + affectedUid,
        path: '/topic/' + tid,
        tid: tid,
        from: currentUid
    }, function (err, notification) {
        nodebb.notifications.push(notification, followingUids, function (err) {
            if (err) {
                logger.error(err);
            }
        });
    });
};

