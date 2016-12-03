var db;

var async = require('async');

function getRedisZsetProbabiltiesKey(tid) {
    return 'tid:%d:attendance:probabilities'.replace('%d', tid);
}
function getRedisZsetLastUpdateKey(tid) {
    return 'tid:%d:attendance:last_updated_at'.replace('%d', tid);
}

module.exports.setDatabase = function (databaseModule) {
    db = databaseModule;
};

module.exports.set = function (tid, userAttendanceInfo /* {uid, probability, lastUpdatedAt} */, callback) {
    async.parallel([
        function (next) {
            db.sortedSetAdd(
                getRedisZsetLastUpdateKey(tid),
                userAttendanceInfo.lastUpdatedAt,
                userAttendanceInfo.uid,
                next
            );
        },
        function (next) {
            db.sortedSetAdd(
                getRedisZsetProbabiltiesKey(tid),
                userAttendanceInfo.probability,
                userAttendanceInfo.uid,
                next
            );
        }
    ], callback);
};

module.exports.get = function (tid, callback) {
    async.parallel([
        function (next) {
            db.getSortedSetRangeWithScores(getRedisZsetProbabiltiesKey(tid), 0, -1, next);
        },
        function (next) {
            db.getSortedSetRangeWithScores(getRedisZsetLastUpdateKey(tid), 0, -1, next);
        }
    ], function (err, results) {
        if (err) {
            return callback(err);
        }
        var probabilityInfos /*Array<{score, value}>*/ = results[0];
        var lastUpdatedAtInfos /*Array<{score, value}>*/ = results[1];

        var userAttendanceInfos = {};

        probabilityInfos.forEach(function (probabilityInfo) {
            var userValue = userAttendanceInfos[probabilityInfo.value] || {
                    uid: probabilityInfo.value
                };
            userValue.probability = probabilityInfo.score;
            userAttendanceInfos[userValue.uid] = userValue;
        });

        lastUpdatedAtInfos.forEach(function (lastUpdateInfo) {
            var userValue = userAttendanceInfos[lastUpdateInfo.value] || {
                    uid: lastUpdateInfo.value
                };
            userValue.lastUpdatedAt = lastUpdateInfo.score;
            userAttendanceInfos[userValue.uid] = userValue;
        });

        callback(null, userAttendanceInfos);
    });
};
