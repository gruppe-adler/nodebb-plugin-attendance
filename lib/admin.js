"use strict";

let winston = require('winston');
let Meta = require('../../../src/meta');

let pluginSettings = {};

function parsePluginSettings(rawSettings) {
    return {
        'allowed-categories': (rawSettings['allowed-categories'] || '')
            .trim()
            .split(',')
            .map(function (bit) { return Number(bit.trim())})
            .filter(function (id) {return id;})
    }
}

module.exports = function (params, meta, callback) {
    var renderAdmin = function(req, res, next) {
        res.render('admin/plugins/' + meta.nbbId, meta || {});
    };

    Meta.settings.get(meta.nbbId, function(err, settings) {
        if (err || !settings) {
            winston.warn('[plugins/' + meta.nbbId + '] Settings not set or could not be retrived!');
        } else {
            pluginSettings = parsePluginSettings(settings);
            winston.info('[plugins/' + meta.nbbId + '] Settings loaded: ' + JSON.stringify(pluginSettings));
        }

        params.router.get('/admin/plugins/' + meta.nbbId, params.middleware.admin.buildHeader, renderAdmin);
        params.router.get('/api/admin/plugins/' + meta.nbbId, renderAdmin);

        callback();
    });
};

module.exports.getAllowedCategories = function ()/*: Array<number>*/ {
    return pluginSettings['allowed-categories'];
};
