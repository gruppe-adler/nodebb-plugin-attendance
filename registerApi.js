var types = [
    'unknown',
    'yes',
    'maybe',
    'no'
];

var stringTypeFloatMap = {
    unknown: 2,
    yes: 1,
    maybe: 0.5,
    no: 0
};

var floatTypeStringMap = {
    0: 'no',
    0.5: 'maybe',
    1: 'yes',
    2: 'unknown'
};

var ensureFloatType = function (type) {
    if (typeof type === 'number') {
        return type;
    }
    if (types.indexOf(type) === -1) {
        throw new Error('invalid type ' + type);
    }

    return stringTypeFloatMap[type];
};

var getZsetKey = function (topic_id, type) {
    return 'tid:%s:attendance:%s'.replace('%s', topic_id).replace('%s', type);
};

var getAsyncAttendancesDeleter = function (tid, uid, type) {
    return function (next) {
        db.sortedSetRemove(getZsetKey(tid, type), uid, next);
    };
};

var getUserAttendance = function (attendants, uid) {
    return attendants.filter(function (a) {
        return a.uid == uid;
    }).pop();
};

var async = require('async');
var winston = require('winston');
var _ = require('underscore');

var db = require('../../src/database');
var users = require('../../src/user');

var floatPersistence = require('./lib/persistence-float');
floatPersistence.setDatabase(db);

module.exports = function (params, callback) {
    var router = params.router;

    router.post('/api/attendance/:tid',
        function (req, res, next) {
            var type = req.body.type;
            var probability = req.body.probability;
            var tid = req.params.tid;
            var uid = req.uid;
            var stringType = floatTypeStringMap[type] || type;
            var timestamp = (new Date()).getTime();

            try {
                ensureFloatType(type);
            } catch (e) {
                return res.status(400).json({"error": e.message});
            }

            async.parallel(
                types.map(function (type) {
                    return getAsyncAttendancesDeleter(tid, uid, type);
                }),
                function (err, results) {
                    if (err) {
                        return res.status(500).json({error: err});
                    }
                    db.sortedSetAdd(getZsetKey(tid, stringType), timestamp, uid, function (err, data) {
                        if (err) {
                            return next(res.status(500).json({error: err}));
                        }
                        res.status(200).json({
                            added: type,
                            user: uid
                        });
                    });
                }
            );

            floatPersistence.set(
                tid,
                {
                    uid: uid,
                    probability: probability || ensureFloatType(type),
                    timestamp: timestamp
                },
                function (err, result) {
                    if (err) {
                        winston.error('error saving attendance value ' + err);
                    }
                }
            );
        });

    router.get('/api/attendance/:tid', function (req, res, next) {
        var tid = req.params.tid;
        var currentUser = req.uid;

        if (!currentUser) {
            return res.status(401).json({});
        }

        floatPersistence.get(tid, function (err, results) {
            if (err) {
                return res.status(500).json({error: err});
            }

            var attendants = results;
            var userIds = attendants.map(function (attendant) {
                return attendant.uid;
            });

            users.getUsersWithFields(userIds, ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'], currentUser, function (err, users) {
                if (err) {
                    return res.status(500).json({err: err});
                }

                attendants.forEach(function (attendant) {
                    var u = users.filter(function (user) {
                        return user.uid == attendant.uid;
                    }).pop();

                    _(attendant).extend(_(u).pick(['username', 'userslug', 'picture', 'icon:bgColor', 'icon:text']));
                });

                res.status(200).json({
                    myAttendance: getUserAttendance(attendants, currentUser),
                    attendants: attendants
                });
            });
        });
    });

    router.get('/api/attendance/:tid/user/:uid/history', function (req, res, next) {
        var tid = req.params.tid;
        var uid = req.params.uid;

        floatPersistence.getUserHistory(tid, uid, function (err, results) {
            if (err) {
                return res.status(500).json({err: err});
            }
            res.status(200).json(results);
        });
    });
    callback();
};
