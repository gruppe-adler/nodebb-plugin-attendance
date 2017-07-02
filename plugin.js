"use strict";

var meta = require('./plugin.json');
meta.nbbId = meta.id.replace(/nodebb-plugin-/, '');

module.exports.setup = function (params, callback) {

    let admin = require('./lib/admin');
    admin(params, meta, function () {
        require('./lib/api')(params, callback);
    });
};

module.exports.tagTopic = require('./lib/tag-topic');

module.exports.admin = {
    menu: function (custom_header, callback) {
        custom_header.plugins.push({
            "route": '/plugins/' + meta.nbbId,
            "icon": 'fa-calendar',
            "name": meta.name
        });

        callback(null, custom_header);
    }
};
