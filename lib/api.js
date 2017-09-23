"use strict";

function noop() {}

const plugins = require('../../../src/plugins');
const notifications = require('./notifications');
const async = require('async');
const _ = require('underscore');
const canAttend = require('./admin').canAttend;
const canSee = require('./admin').canSee;
let logger = require('./logger');


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
        return Number(a.uid) === Number(uid);
    }).pop();
};

const getSlottedUserIds = function (tid, callback) {
    const params = {tid: tid, userIds: []};
    plugins.fireHook('filter:attendance:slotted', params, (err) => {
        callback(err, params.userIds);
    });
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

const db = require('../../../src/database');

const floatPersistence = require('./persistence-float');
floatPersistence.setDatabase(db);

module.exports = function (params, callback) {
    const router = params.router;

    router.post('/api/attendance/:tid', function (req, res, next) {
        const tid = req.params.tid;
        canAttend(req.uid, tid, function (err, canAttend) {
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
                        logger.error('error saving attendance value ' + err);
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
        canSee(req.uid, tid, function (err, canSee) {
            if (err) {
                return res.status(500).json(err);
            }
            if (!canSee) {
                return res.status(403).json({});
            } else {
                next();
            }
        });
    });
    router.get('/api/attendance/:tid', function (req, res, next) {
        const tid = req.params.tid;
        const currentUser = req.uid;

        async.parallel(
            {
                attendants: _.partial(floatPersistence.get, tid),
                canAttend: _.partial(canAttend, currentUser, tid),
                slottedUserIds: _.partial(getSlottedUserIds, tid),
            },
            function (err, results) {
                if (err) {
                    return res.status(500).json({error: err});
                }

                const attendants = results.attendants;
                const canAttend = results.canAttend;
                const slottedUserIds = results.slottedUserIds;
                getUsersWithFields(currentUser, attendants, function (err, users) {
                    if (err) {
                        return res.status(500).json({err: err});
                    }

                    attendants.forEach(function (attendant) {
                        const u = users[attendant.uid];
                        if (!u) {
                            return logger.error('unknown user with id ' + attendant.uid);
                        }
                        _(attendant).extend(_(u).pick(['username', 'userslug', 'picture', 'icon:bgColor', 'icon:text']));
                    });
                    attendants.forEach(function (attendant) {
                        attendant.isSlotted = (slottedUserIds.indexOf(attendant.uid) !== -1);
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
        canSee(req.uid, tid, function (err, canSee) {
            if (err) {
                return res.status(500).json(err);
            }
            if (!canSee) {
                return res.status(403).json({});
            } else {
                next();
            }
        });
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
