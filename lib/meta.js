const meta = require('./../plugin.json');
meta.nbbId = meta.id.replace(/nodebb-plugin-/, '');

module.exports = meta;
