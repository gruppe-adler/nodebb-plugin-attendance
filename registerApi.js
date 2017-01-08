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

var getAsyncAttendancesGetter = function (tid, type) {
    return function (next) {
        db.getSortedSetRangeWithScores(getZsetKey(tid, type), 0, -1, next);
    };
};

var getAsyncAttendancesDeleter = function (tid, uid, type) {
    return function (next) {
        db.sortedSetRemove(getZsetKey(tid, type), uid, next);
    };
};

var getUserAttendance = function (attendance, uid) {
    return types.filter(function (type) {
        return attendance[type].some(function (a) { return a.uid == uid; });
    }).pop();
};

function customISODateString(d) {
    function pad(n) {return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
         + pad(d.getUTCMonth()+1)+'-'
         + pad(d.getUTCDate())+' '
         + pad(d.getUTCHours())+':'
         + pad(d.getUTCMinutes())
}

/*
var getCurrentUser = function (attendance, uid) {
    return types.filter(function (type) {
        return attendance[type].some(function (a) { return a.uid == uid; });
    }).pop();
};*/

var async = require('async');
var winston = require('winston');

var db = require('../../src/database');
var users = require('../../src/user');

var floatPersistence = require('./lib/persistence-float');
floatPersistence.setDatabase(db);

module.exports = function (params, callback) {
    var router = params.router;

    router.post('/api/attendance/:tid',
        function (req, res, next) {
            var type = req.body.type;
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
                types.map(function (type) { return getAsyncAttendancesDeleter(tid, uid, type); }),
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
                    probability: ensureFloatType(type),
                    lastUpdatedAt: (new Date()).getTime()
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

        async.parallel(
            types.map(function (type) { return getAsyncAttendancesGetter(tid, type); }),
            function (err, results) {
                if (err) {
                    return res.status(500).json({error: err});
                }

                var attendance = {};
                var userIds = [];
                types.forEach(function (type, idx) {
                    attendance[type] = results[idx];
                    userIds = userIds.concat(results[idx].map(function (res) {return Number(res.value); }));
                });

                users.getUsersWithFields(userIds, ['uid', 'username', 'userslug', 'picture', 'icon:bgColor', 'icon:text'], currentUser, function (err, users) {
                    if (err) {
                        return res.status(500).json({err: err});
                    }

                    types.forEach(function (type) {
                        attendance[type].forEach(function (attendance) {
                            var u = users.filter(function (user) { return user.uid == attendance.value; }).pop();
                            attendance.uid = u.uid;
                            delete attendance.value;
                            attendance.timestamp = customISODateString(new Date(attendance.score));

                            // attendance.timestamp = (new Date(attendance.score)).toISOString('[]', {hour: '2-digit', minute:'2-digit'});
                            delete attendance.score;
                            attendance.username  = u.username;
                            attendance.userslug = u.userslug;
                            attendance.picture = u.picture;
                            attendance['icon:bgColor'] = u['icon:bgColor'];
                            attendance['icon:text'] = u['icon:text'];
                        });
                    });

                    res.status(200).json({
                        myAttendance: getUserAttendance(attendance, currentUser),
                        attendance: attendance
                    });
                });
            }
        );
    });

    callback();
};
