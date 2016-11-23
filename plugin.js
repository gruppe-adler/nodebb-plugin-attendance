var isMission = function (title) {
     var matches = title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
     if (!matches) {
          return false;
     } else {
          return true;
     }
};

var find = function (arr, element) {
     for (var i = 0; i < arr.length; i++) {
          if (arr[i] == element) {
               return true;
          }
     }
     return false;
};

module.exports.addDataToTopic = function (data, cb) {
     var db = require('../../src/database');

     var uid = data.uid;

     data.topics.forEach(function (topic) {
          if (isMission(topic.title || "")) {
               var tid = topic.tid;

          //firm commitments
               db.sortedSetCard((['tid',tid,'firm_commitment'].join(':')), function (err, result) {topic.firm_commitments = result;});

          //own commitment
               topic.own_commitment = 0;

               db.getSortedSetRange((['tid',tid,'firm_commitment'].join(':')), 0, -1, function (err, result) {

                    if (find(result,uid)) {
                         topic.own_commitment = 1;
                    }
               });
               db.getSortedSetRange((['tid',tid,'commitment'].join(':')), 0, -1, function (err, result) {

                    if (find(result,uid)) {
                         topic.own_commitment = 2;
                    }
               });
               db.getSortedSetRange((['tid',tid,'cancellation'].join(':')), 0, -1, function (err, result) {

                    if (find(result,uid)) {
                         topic.own_commitment = 3;
                    }
               });
          }
     });

     cb(null, data);
};

var getKeys = function(obj){
     var keys = [];
          for(var key in obj){
               keys.push(key);
          };
     return keys;
};

module.exports.onLoadTopic = function (data, cb) {
     var db = require('../../src/database');

     var uid = data.uid;
     var topicObj = data.topic;
     var tid = topicObj.tid;

     topicObj.isMission = 0;

     if (isMission(topicObj.title || "")) {
          topicObj.isMission = 1;
     };




     db.getSortedSetRangeWithScores((['tid',tid,'firm_commitment'].join(':')), 0, -1, function (err, result) {
          var keys = [];
          var timeStamps = [];
          result.forEach(function (uid) {
               keys.push(['user',uid.value].join(':'));
               timeStamps.push(uid.score);
          });
          db.getObjects(keys, function (err,users) {
               for (var i = 0; i < users.length; i++) {
                    users[i].timestamp = timeStamps[i];
               };
               topicObj.attending = users;
          });
     });

     db.getSortedSetRangeWithScores((['tid',tid,'commitment'].join(':')), 0, -1, function (err, result) {
          var keys = [];
          var timeStamps = [];
          result.forEach(function (uid) {
               keys.push(['user',uid.value].join(':'));
               timeStamps.push(uid.score);
          });
          db.getObjects(keys, function (err,users) {
               for (var i = 0; i < users.length; i++) {
                    users[i].timestamp = timeStamps[i];
               };
               topicObj.maybe = users;
          });
     });

     db.getSortedSetRangeWithScores((['tid',tid,'cancellation'].join(':')), 0, -1, function (err, result) {
          var keys = [];
          var timeStamps = [];
          result.forEach(function (uid) {
               keys.push(['user',uid.value].join(':'));
               timeStamps.push(uid.score);
          });
          db.getObjects(keys, function (err,users) {
               for (var i = 0; i < users.length; i++) {
                    users[i].timestamp = timeStamps[i];
               };
               topicObj.nonAttending = users;
          });
     });

     cb(null, data);
};
