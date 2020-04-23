const winston = require.main.require('winston');
const id = ['plugin', require('./meta').nbbId].join('/');

function format(message) {
    return '[%s] %s'.replace('%s', id).replace('%s', message);
}

makeLogFunction = function (level) {
    return function (message) {
        arguments[0] = format(message);
        winston[level].apply(winston, arguments);
    };
};

module.exports.debug = makeLogFunction('debug');
module.exports.info = makeLogFunction('info');
module.exports.warn = makeLogFunction('warn');
module.exports.error = makeLogFunction('error');
