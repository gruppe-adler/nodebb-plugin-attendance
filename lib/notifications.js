"use strict";

var notifications = require('../../../src/notifications');
var floatPersistence = require('./persistence-float');
var topics = require('../../../src/topics');
var user = require('../../../src/user');
var async = require('async');
var _ = require('underscore');

function getEventTitle(tid, callback) {
    topics.getTopicField(tid, 'title', callback);
}

function getUser(currentUid, uid, callback) {
    user.getUsersWithFields([uid], ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'], currentUid, function (err, users) {
        callback(err, users.pop());
    });
}

function getAttendingUids(tid, callback) {
    floatPersistence.get(tid, function (err, attendants) {
        if (err) {
            return callback(err, []);
        }
        let uids = _.values(attendants)
            .map(function (attendant) {
                return attendant.probability > 0 ? attendant.uid : 0;
            })
            .filter(function (uid) { return uid > 0; });

        callback(err, uids);
    });
}

module.exports.notifyAttendanceChange = function (currentUid, affectedUid, tid, newProbability) {
    let msg;
    switch (newProbability) {
        case 1: msg = '%s registered for event "%s"'; break;
        case 0: msg = '%s unregistered from event "%s"'; break;
        case 0.5: msg = '%s is not sure about their attendance to event "%s"'; break;
        default: return;
    }
    async.parallel({
        affectedUser: _.partial(getUser, currentUid, affectedUid),
        eventTitle: _.partial(getEventTitle, tid),
        followingUids: _.partial(topics.getFollowers, tid),
        attendingUids: _.partial(getAttendingUids, tid)
    }, function (err, results) {
        msg = msg.replace('%s', results.affectedUser.username).replace('%s', results.eventTitle);
        notifications.create({
            bodyShort: msg,
            bodyLong: msg,
            image: results.affectedUser.picture,
            nid: 'attendance:' + tid + ':user:' + affectedUid,
            path: '/topic/' + tid,
            tid: tid,
            from: currentUid
        }, function (err, notification) {
            notifications.push(notification, results.followingUids, function (err) {
                if (err) {
                    winston.error(err);
                }
            });
        });
    });
};

