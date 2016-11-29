var types = [
    'yes',
    'maybe',
    'no'
];

var validateType = function (type) {
    if (types.indexOf(type) === -1) {
        throw new Error('invalid type ' + type);
    }
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

var db = require('../../src/database');
var users = require('../../src/user');
var async = require('async');

module.exports = function (params, callback) {
    var router = params.router;

    router.post('/api/attendance/:tid',
        function (req, res, next) {
            var type = req.body.type;
            var tid = req.params.tid;
            var uid = req.uid;
            var timestamp = (new Date()).getTime();

            try {
                validateType(type);
            } catch (e) {
                return res.status(400).json({"error": e.message});
            }

            async.parallel(
                types.map(function (type) { return getAsyncAttendancesDeleter(tid, uid, type); }),
                function (err, results) {
                    if (err) {
                        return res.status(500).json({error: err});
                    }
                    db.sortedSetAdd(getZsetKey(tid, type), timestamp, uid, function (err, data) {
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

                users.getUsersWithFields(userIds, ['uid', 'username', 'userslug', 'picture'], currentUser, function (err, users) {
                    if (err) {
                        return res.status(500).json({err: err});
                    }

                    types.forEach(function (type) {
                        attendance[type].forEach(function (attendance) {
                            var u = users.filter(function (user) { return user.uid == attendance.value; }).pop();
                            attendance.uid = u.uid;
                            delete attendance.value;
                            attendance.timestamp = (new Date(attendance.score)).toISOString();
                            delete attendance.score;
                            attendance.username  = u.username;
                            attendance.userslug = u.userslug;
                            attendance.picture = u.picture;
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
