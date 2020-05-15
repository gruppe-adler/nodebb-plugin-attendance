//     Underscore.js 1.10.2
//     https://underscorejs.org
//     (c) 2009-2020 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

// slightly modified for nodebb-plugin-attendance

(function () {
    // List of HTML entities for escaping.
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
    };

    // Functions for escaping and unescaping strings to/from HTML interpolation.
        function createEscaper(map) {
            const escaper = function (match) {
                return map[match];
            };
            // Regexes for identifying a key that needs to be escaped.
            const source = '(?:' + Object.keys(map).join('|') + ')';
            const testRegexp = RegExp(source);
            const replaceRegexp = RegExp(source, 'g');
            return function (string) {
                string = string == null ? '' : '' + string;
                return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
            };
        }

        window._escape = createEscaper(escapeMap);
}());
