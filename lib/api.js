"use strict";

function noop() {}

const nodebb = require('./nodebb');
const notifications = require('./notifications');
const _ = require.main.require('underscore');
const canAttend = require('./permissions').canAttend;
const canSee = require('./permissions').canSee;
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

const getSlottedUserIds = function (tid) {
    return new Promise((resolve, reject) => {
        const params = {tid: tid, userIds: []};
        nodebb.plugins.fireHook(
            'filter:attendance:slotted',
            params, // IN OUT parameter
            (err) => {
                if (err) return reject();
                resolve(params.userIds);
            });
    });
};

const getUsersWithFields = function (currentUser, attendants, next) {
    nodebb.user.getUsersWithFields(
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

const floatPersistence = require('./persistence-float');
floatPersistence.setDatabase(nodebb.database);

module.exports = function (params, callback) {
    const router = params.router;

    router.post('/api/attendance/:tid', async function (req, res, next) {
        const tid = req.params.tid;
        try {
            const userCanAttend = await canAttend(req.uid, tid);
            if (userCanAttend) {
                next();
            } else {
                res.status(401).json({});
            }
        } catch (err) {
            res.status(500).json(err);
        }
    });
    router.post('/api/attendance/:tid', function (req, res) {
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
                dataSet
            ).then(() => {
                nodebb.plugins.fireHook('action:attendance.set', dataSet, noop);
                notifications.notifyAttendanceChange(req.uid, uid, tid, probability).catch(err => {
                    logger.error('could not notify ' + err.message);
                });

                res.status(204).json(null);
            }).catch(err => {
                logger.error('error saving attendance value ' + err.message);
                return res.status(500).json({message: err.message});
            });
        }
    );

    router.get('/api/attendance/:tid', function (req, res, next) {
        const tid = req.params.tid;
        canSee(req.uid, tid).then((userCanSee) => {
            if (userCanSee) {
                next();
            } else {
                res.status(403).json({});
            }
        }).catch((err) => {
            logger.error(err);
            res.status(500).json({context: "getting permissions", error: err.message});
        });
    });
    router.get('/api/attendance/:tid', function (req, res) {
        const tid = req.params.tid;
        const currentUser = req.uid;

        Promise.all([
            floatPersistence.get(tid),
            canAttend(currentUser, tid),
            getSlottedUserIds(tid),
        ]).then(results => {
            let [attendants, userCanAttend, slottedUserIds] = results;

            getUsersWithFields(currentUser, attendants, function (err, users) {
                if (err) {
                    logger.error(err);
                    return res.status(500).json({error: err.message});
                }

                attendants.forEach(function (attendant) {
                    const u = users[attendant.uid];
                    if (!u) {
                        return logger.error('unknown user with id ' + attendant.uid + ' in thread ' + tid);
                    }
                    _(attendant).extend(_(u).pick(['username', 'userslug', 'picture', 'icon:bgColor', 'icon:text']));
                });
                attendants.forEach(function (attendant) {
                    attendant.isSlotted = (slottedUserIds.indexOf(attendant.uid) !== -1);
                });

                return res.status(200).json({
                    myAttendance: getUserAttendance(attendants, currentUser),
                    canAttend: userCanAttend,
                    attendants: attendants
                });
            });
        }).catch(err => {
            logger.error(err);
            return res.status(500).json({error: err.message});
        });
    });


    router.get('/api/attendance/:tid/user/:uid/history', function (req, res, next) {
        const tid = req.params.tid;
        canSee(req.uid, tid).then(canSee => {
            if (!canSee) {
                return res.status(403).json({message: "cannot see events"});
            } else {
                next();
            }
        }).catch(err => {
            return res.status(500).json(err);
        });
    });
    router.get('/api/attendance/:tid/user/:uid/history', function (req, res, next) {
        const tid = req.params.tid;
        const uid = req.params.uid;

        floatPersistence.getUserHistory(tid, uid).then(results => {
            res.status(200).json(results);
        }).catch(err => {
            return res.status(500).json({err: err.message});
        });
    });
    callback();
};
