function identity(x) { return x }

function parseSettingsValue(value)/*: Array<number>*/ {
    return value
        .split(',')
        .map(function (n) { return Number(n.trim())})
        .filter(identity);
}

module.exports = function(rawSettings) {
    const pluginSettings = {};
    Object.keys(rawSettings).forEach(function (key) {
        const categoryIds = parseSettingsValue(rawSettings[key]);
        const m = key.match(/categories-([rw])-(.+)/);
        if (!m) {
            return;
        }
        let mode = m[1];
        let groupName = m[2];

        pluginSettings[groupName] = pluginSettings[groupName] || {};
        pluginSettings[groupName][mode] = categoryIds;
    });

    return pluginSettings;
};
