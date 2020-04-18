"use strict";

const logger = require('./logger');
const getAllGroups = require('./getAllGroups');
const settings = require('./settings');

module.exports = function (params, meta, callback) {
    const renderAdmin = function(req, res) {
        Promise.all([
            settings.getPermissions(),
            getAllGroups(),
            settings.getEventsTitle(),
        ]).then((results) => {
            const [permissionSettings, groups, eventsTitle] = results;
            const viewData = Object.create(meta);
            viewData.groups = [];
            viewData.eventsTitle = eventsTitle;
            groups.forEach((groupName) => {
                viewData.groups.push({
                    groupName: groupName,
                    r: permissionSettings[groupName] ? permissionSettings[groupName].r : [],
                    w: permissionSettings[groupName] ? permissionSettings[groupName].w : []
                });
            });

            res.render('admin/plugins/' + meta.nbbId, viewData);
        }).catch(err => {
            logger.error(err);
            res.render('500', { path: 'admin/plugins/' + meta.nbbId, error: String(err.message) });
        });
    };

    settings
        .getPermissions()
        .then((settings) => {
            logger.info('Settings loaded: ' + JSON.stringify(settings));

            params.router.get('/admin/plugins/' + meta.nbbId, params.middleware.admin.buildHeader, renderAdmin);
            params.router.get('/api/admin/plugins/' + meta.nbbId, renderAdmin);

            callback();
        })
        .catch((err) => {
            throw err;
        });
};
