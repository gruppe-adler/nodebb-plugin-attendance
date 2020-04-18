let db;

const _ = require.main.require('underscore');
const noop = function () {
};

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

async function getAsyncParallelAttendanceHistory(tid, uid) {
    const results = await db.getListRange(getRedisListKeyAttendanceHistory(tid, uid), 0, -1);

    return results.map(function (item) {
        const bits = item.split(':');
        return {
            timestamp: parseInt(bits[0], 10),
            probability: parseFloat(bits[1] || -1)
        };
    });
}

async function getAsyncParallelAttendanceInfo(tid, infoNameRedis) {
    return await db.getSortedSetRangeWithScores(getRedisZsetKeyAttendanceInfo(tid, infoNameRedis), 0, -1);
}

function mergeAttendanceInfos(propertyNames, results /*[probabilityInfos, lastUpdatedAtInfos]*/) {
    const userAttendanceInfos = {};

    function setSomeValue(someValueName, info) {
        const uid = Number(info.value);
        const userValue = userAttendanceInfos[uid] =
            userAttendanceInfos[uid]
            || {uid: uid};

        userValue[someValueName] = info.score;
    }

    propertyNames.forEach(function (propertyName, idx) {
        results[idx].forEach(function (result) {
            setSomeValue(propertyName, result);
        });
    });

    return _.values(userAttendanceInfos);
}

module.exports.setDatabase = function (databaseModule) {
    db = databaseModule;
};

module.exports.set = async function (tid, userAttendanceInfo /* {uid, probability, timestamp} */) {
    await Promise.all([
        setAsyncParallelAttendanceInfo(tid, 'timestamp', 'last_updated_at', userAttendanceInfo),
        setAsyncParallelAttendanceInfo(tid, 'probability', 'probability', userAttendanceInfo),
        setAsyncParallelAttendanceHistory(tid, userAttendanceInfo),
    ]);
};

module.exports.get = async function (tid) {
    const results = await Promise.all([
        getAsyncParallelAttendanceInfo(tid, 'probability'),
        getAsyncParallelAttendanceInfo(tid, 'last_updated_at'),
    ]);
    return mergeAttendanceInfos(['probability', 'timestamp'], results);
};

module.exports.getUserHistory = async function (tid, uid) {
    return await getAsyncParallelAttendanceHistory(tid, uid);
};
