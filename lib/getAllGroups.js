const nodebb = require('./nodebb');

module.exports = async function () {
    const ephemeralGroups = nodebb.groups.getEphemeralGroups ? nodebb.groups.getEphemeralGroups() : ['guests'];
    const groups = await nodebb.groups.getGroups('groups:visible:createtime', 0, 4096 /*arbitrarily high integer*/);
    return (groups || []).concat(ephemeralGroups);
}
