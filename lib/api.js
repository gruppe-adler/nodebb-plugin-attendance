"use strict";

function noop() {}

const plugins = require('../../../src/plugins');
const notifications = require('./notifications');

const types = [
    'unknown',
    'yes',
    'maybe',
    'no'
];

const stringTypeFloatMap = {
    unknown: 2,
    yes: 1,
    maybe: 0.5,
    no: 0
};

const ensureFloatType = function (type) {
    if (typeof type === 'number') {
        return type;
    }
    if (types.indexOf(type) === -1) {
        throw new Error('invalid type ' + type);
    }

    return stringTypeFloatMap[type];
};

const getUserAttendance = function (attendants, uid) {
    return attendants.filter(function (a) {
        return a.uid == uid;
    }).pop();
};

const users = require('../../../src/user');
const getUsersWithFields = function (currentUser, attendants, next) {
    users.getUsersWithFields(
        attendants.map(function (attendant) {
            return attendant.uid;
        }),
        ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'],
        currentUser,
        function (err, results) {
            if (err) {
                return next(err);
            }

            const users = {};
            results.forEach(function (user) {
                users[user.uid] = user;
            });
            next(null, users);
        }
    );
};

const async = require('async');
const _ = require('underscore');
const groups = require('../../../src/groups');
const getAllowedGroups = require('./admin').getAllowedGroups;
const canAttend = function (uid, callback) {

    async.parallel(
        getAllowedGroups().map(function (groupName) {
        _.partial(groups.isMember, uid, groupName);
        }),
        function (err, results) {
            callback(err, results.indexOf(true) !== -1);
        }
    );

};

const winston = require('winston');

const db = require('../../../src/database');

const floatPersistence = require('./persistence-float');
floatPersistence.setDatabase(db);

module.exports = function (params, callback) {
    const router = params.router;

    router.post('/api/attendance/:tid', function (req, res, next) {
        canAttend(req.uid, function (err, canAttend) {
            if (err) {
                return res.status(500).json(err);
            }
            if (!canAttend) {
                return res.status(401).json({});
            } else {
                next();
            }
        });
    });
    router.post('/api/attendance/:tid',
        function (req, res, next) {
            let probability = req.body.probability;
            const tid = req.params.tid;
            const uid = req.uid;

            try {
                probability = ensureFloatType(req.body.type || probability);
            } catch (e) {
                return res.status(400).json({"error": e.message});
            }

            const dataSet = {
                tid: tid,
                uid: uid,
                probability: probability,
                timestamp: (new Date()).getTime()
            };

            floatPersistence.set(
                tid,
                dataSet,
                function (err, result) {
                    if (err) {
                        winston.error('error saving attendance value ' + err);
                        return res.status(500).json(err);
                    }

                    plugins.fireHook('action:attendance.set', dataSet, noop);
                    notifications.notifyAttendanceChange(req.uid, uid, tid, probability);

                    res.status(204).json(null);
                }
            );
        }
    );

    router.get('/api/attendance/:tid', function (req, res, next) {
        const tid = req.params.tid;
        const currentUser = req.uid;

        async.parallel(
            [
                _.partial(floatPersistence.get, tid),
                _.partial(canAttend, currentUser)
            ],
            function (err, results) {
                if (err) {
                    return res.status(500).json({error: err});
                }

                const attendants = results[0];
                const canAttend = results[1];

                getUsersWithFields(currentUser, attendants, function (err, users) {
                    if (err) {
                        return res.status(500).json({err: err});
                    }

                    attendants.forEach(function (attendant) {
                        const u = users[attendant.uid];
                        if (!u) {
                            return winston.error('unknown user with id ' + attendant.uid);
                        }
                        _(attendant).extend(_(u).pick(['username', 'userslug', 'picture', 'icon:bgColor', 'icon:text']));
                    });

                    return res.status(200).json({
                        myAttendance: getUserAttendance(attendants, currentUser),
                        canAttend: canAttend,
                        attendants: attendants
                    });
                });
            }
        );
    });

    router.get('/api/attendance/:tid/user/:uid/history', function (req, res, next) {
        const tid = req.params.tid;
        const uid = req.params.uid;

        floatPersistence.getUserHistory(tid, uid, function (err, results) {
            if (err) {
                return res.status(500).json({err: err});
            }
            res.status(200).json(results);
        });
    });
    callback();
};
