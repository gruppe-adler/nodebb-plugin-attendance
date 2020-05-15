//     Underscore.js 1.10.2
//     https://underscorejs.org
//     (c) 2009-2020 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

// slightly modified for nodebb-plugin-attendance

(function () {

// By default, Underscore uses ERB-style template delimiters, change the
// following template settings to use alternative delimiters.
    const templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    };

// When customizing `templateSettings`, if you don't want to define an
// interpolation, evaluation or escaping regex, we need one that is
// guaranteed not to match.
    const noMatch = /(.)^/;

// Certain characters need to be escaped so that they can be put into a
// string literal.
    const escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    const escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

    const escapeChar = function (match) {
        return '\\' + escapes[match];
    };

// JavaScript micro-templating, similar to John Resig's implementation.
// Underscore templating handles arbitrary delimiters, preserves whitespace,
// and correctly escapes quotes within interpolated code.
// NB: `oldSettings` only exists for backwards compatibility.
    window._template = function (text, settings) {
        settings = templateSettings;

        // Combine delimiters into one regular expression via alternation.
        const matcher = RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

        // Compile the template source, escaping string literals appropriately.
        let index = 0;
        let source = "__p+='";
        text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
            index = offset + match.length;

            if (escape) {
                source += "'+\n((__t=(" + escape + "))==null?'':_escape(__t))+\n'";
            } else if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }

            // Adobe VMs need the match returned to produce the correct offset.
            return match;
        });
        source += "';\n";

        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + 'return __p;\n';

        let render;
        try {
            render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
            e.source = source;
            throw e;
        }

        const template = function (data) {
            return render.call(this, data);
        };

        // Provide the compiled source as a convenience for precompilation.
        const argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';

        return template;
    }

}());
