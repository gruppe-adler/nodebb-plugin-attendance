var types = [
    "commitment",
    "firm_commitment",
    "cancellation"
];

var validateType = function (type) {
    if (types.indexOf(type) === -1) {
        throw new Error('invalid type ' + type);
    }
};

var db = require('../../src/database');

module.exports = function (params, callback) {
    var router = params.router,
        middleware = params.middleware,
        controllers = params.controllers;

    router.post('/api/attendance/:tid',
        // middleware.checkGlobalPrivacySettings, //(?)
        function (req, res, next) {
            var type = req.body.type;
            var tid = req.params['tid'];
            var timestamp = (new Date()).getTime();

            try {
                validateType(type);
            } catch (e) {
                return res.status(400).json({"error": e.message});
            }

            db.sortedSetAdd(['tid', tid, type].join(':'), timestamp, req.uid, function (err, data) {
                // TODO logging and shit
            });
            types.forEach(function (typeToDelete) {
                if (typeToDelete !== type) {
                    db.sortedSetRemove(['tid', tid, typeToDelete].join(':'), req.uid, function (err, data) {
                        // TODO logging and shit
                    });
                }
            });

            return res.status(202).json({
                added: type,
                user: req.uid
            });
        });

    router.get('/api/attendance/:tid', function (req, res, next) {
        return res.status(200).json({"foo":"bar"});
    });

    callback();
};
