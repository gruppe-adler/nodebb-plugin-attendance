const settings = require('./nodebb').Meta.settings;
const nbbId = require('./meta').nbbId;
const parsePluginPermissionSettings = require('./parsePluginPermissionSettings');
const logger = require('./logger');

exports.getPermissions = function () {
    return new Promise((resolve, reject) => {
        settings.get(nbbId, (err, rawSettings) => {
            if (err) {
                logger.error('could not get attendance settings: ' + err.message);
                return reject(err);
            }
            resolve(parsePluginPermissionSettings(rawSettings));
        });
    });
};

exports.getEventsTitle = function () {
    return new Promise((resolve, reject) => {
        settings.getOne(nbbId, 'events-title', (err, title) => {
            if (err) {
                logger.error('could not get attendance setting events-title: ' + err.message)
                return reject(err);
            }
            resolve(title || 'Events');
        });
    });
}

exports.reload = function () {
    settings.sync();
};
