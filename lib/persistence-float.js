var db;

var async = require('async');
var _ = require('underscore');
var noop = function () {};

function getRedisZsetKeyAttendanceInfo(tid, infoName) {
    return 'tid:%d:attendance:%s'.replace('%d', tid).replace('%s', infoName);
}

function getRedisListKeyAttendanceHistory(tid, uid) {
    return 'tid:%d:attendance:user:%d:history'.replace('%d', tid).replace('%d', uid);
}

function setAsyncParallelAttendanceInfo(tid, infoName, infoNameRedis, userAttendanceInfo, next) {
    db.sortedSetAdd(
        getRedisZsetKeyAttendanceInfo(tid, infoNameRedis),
        userAttendanceInfo[infoName],
        userAttendanceInfo.uid,
        next
    );
}

function setAsyncParallelAttendanceHistory(tid, userAttendanceInfo, next) {
    db.listPrepend(
        getRedisListKeyAttendanceHistory(tid, userAttendanceInfo.uid),
        [userAttendanceInfo.timestamp, userAttendanceInfo.probability].join(':'),
        next
    );
    db.listTrim(getRedisListKeyAttendanceHistory(tid, userAttendanceInfo.uid), 0, 100, noop);
}

function getAsyncParallelAttendanceHistory(tid, uid, next) {
    db.getListRange(getRedisListKeyAttendanceHistory(tid, uid), 0, -1, function (err, results) {
        if (err) {
            return next(err);
        }

        return next(null, results.map(function (item) {
            var bits = item.split(':');
            return {
                timestamp: parseInt(bits[0], 10),
                probability: parseFloat(bits[1] || -1)
            };
        }));
    });
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

    callback(null, _.values(userAttendanceInfos));
}

module.exports.setDatabase = function (databaseModule) {
    db = databaseModule;
};

module.exports.set = function (tid, userAttendanceInfo /* {uid, probability, timestamp} */, callback) {
    async.parallel([
        _.partial(setAsyncParallelAttendanceInfo, tid, 'timestamp', 'last_updated_at', userAttendanceInfo),
        _.partial(setAsyncParallelAttendanceInfo, tid, 'probability', 'probability', userAttendanceInfo),
        _.partial(setAsyncParallelAttendanceHistory, tid, userAttendanceInfo)
    ], callback);
};

module.exports.get = function (tid, callback) {
    async.parallel(
        [
            _.partial(getAsyncParallelAttendanceInfo, tid, 'probability'),
            _.partial(getAsyncParallelAttendanceInfo, tid, 'last_updated_at')
        ],
        _.partial(mergeAttendanceInfos, ['probability', 'timestamp'], callback)
    );
};

module.exports.getUserHistory = function (tid, uid, callback) {
    getAsyncParallelAttendanceHistory(tid, uid, callback);
};
