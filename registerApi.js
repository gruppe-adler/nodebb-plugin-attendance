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

var getUserAttendance = function (attendants, uid) {
    return attendants.filter(function (a) {
        return a.uid == uid;
    }).pop();
};

var getUsersWithFields = function (currentUser, attendants, next) {
    users.getUsersWithFields(
        attendants.map(function (attendant) {
            return attendant.uid;
        }),
        ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'],
        currentUser,
        function (err, results) {
            if (err) {return next(err); }

            users = {};
            results.forEach(function (user) {
                users[user.uid] = user;
            });
            next(null, users);
        }
    );
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
            var probability = req.body.probability;
            var tid = req.params.tid;
            var uid = req.uid;

            try {
                probability = ensureFloatType(req.body.type || probability);
            } catch (e) {
                return res.status(400).json({"error": e.message});
            }

            floatPersistence.set(
                tid,
                {
                    uid: uid,
                    probability: probability,
                    timestamp: (new Date()).getTime()
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

            getUsersWithFields(currentUser, attendants, function (err, users) {
                if (err) {
                    return res.status(500).json({err: err});
                }

                attendants.forEach(function (attendant) {
                    var u = users[attendant];
                    if (!u) {
                        return winston.error('unknown user with id ' + attendant.uid);
                    }
                    _(attendant).extend(_(u).pick(['username', 'userslug', 'picture', 'icon:bgColor', 'icon:text']));
                });

                return res.status(200).json({
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
