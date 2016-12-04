var db;

var async = require('async');
var _ = require('underscore');

function getRedisZsetKeyAttendanceInfo(tid, infoName) {
    return 'tid:%d:attendance:%s'.replace('%d', tid).replace('%s', infoName);
}

function setAsyncParallelAttendanceInfo(tid, infoName, infoNameRedis, userAttendanceInfo, next) {
    db.sortedSetAdd(
        getRedisZsetKeyAttendanceInfo(tid, infoNameRedis),
        userAttendanceInfo[infoName],
        userAttendanceInfo.uid,
        next
    );
}

function getAsyncParallelAttendanceInfo(tid, infoNameRedis, next) {
    db.getSortedSetRangeWithScores(getRedisZsetKeyAttendanceInfo(tid, infoNameRedis), 0, -1, next);
}

function mergeAttendanceInfos(propertyNames, callback, err, results /*[probabilityInfos, lastUpdatedAtInfos]*/) {
    if (err) {
        return callback(err);
    }
    var userAttendanceInfos = {};

    function setSomeValue(someValueName, info) {
        var userValue = userAttendanceInfos[info.value] = (userAttendanceInfos[info.value] || { uid: info.value });
        userValue[someValueName] = info.score;
    }

    propertyNames.forEach(function (propertyName, idx) {
        results[idx].forEach(function (result) {
            setSomeValue(propertyName, result);
        });
    });

    callback(null, userAttendanceInfos);
}

module.exports.setDatabase = function (databaseModule) {
    db = databaseModule;
};

module.exports.set = function (tid, userAttendanceInfo /* {uid, probability, lastUpdatedAt} */, callback) {
    async.parallel([
        _.partial(setAsyncParallelAttendanceInfo, tid, 'lastUpdatedAt', 'last_updated_at', userAttendanceInfo),
        _.partial(setAsyncParallelAttendanceInfo, tid, 'probability', 'probability', userAttendanceInfo)
    ], callback);
};

module.exports.get = function (tid, callback) {
    async.parallel(
        [
            _.partial(getAsyncParallelAttendanceInfo, tid, 'probability'),
            _.partial(getAsyncParallelAttendanceInfo, tid, 'last_updated_at')
        ],
        _.partial(mergeAttendanceInfos, ['probability', 'lastUpdatedAt'], callback)
    );
};
