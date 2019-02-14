/*global $ */
(function colorTopic() {

    /**
     * taken from underscoreJs
     */
    var _ = {
        now: Date.now || function() {
            return new Date().getTime();
        },
        debounce: function(func, wait, immediate) {
            var timeout, args, context, timestamp, result;

            var later = function() {
                var last = _.now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) context = args = null;
                    }
                }
            };

            return function() {
                context = this;
                args = arguments;
                timestamp = _.now();
                var callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            };
        }
    };

    var titleToTimestamp = function (title) {
        var matches = title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
        if (!matches) {
            return 0;
        }
        return parseInt((new Date(matches[1])).getTime() / 1000, 10);
    };

    var refresh = _.debounce(function () {
        var now = parseInt((new Date()).getTime() / 1000, 10);
        var topicRows = document.querySelectorAll('[component="category/topic"]');
        Array.prototype.forEach.call(topicRows, function (categoryItem) {
            var meta = categoryItem.querySelector('[component="topic/header"] a');
            var topicTime = titleToTimestamp(meta.getAttribute('content') || meta.textContent || '');
            var dataRelativeTime = '';
            var timeDiff = now - topicTime;

            if (topicTime === 0) {
                dataRelativeTime = 'now';
            } else if (timeDiff < 86400) {
                dataRelativeTime = 'future';
            } else if (timeDiff > 86400) {
                dataRelativeTime = 'past'
            }

            categoryItem.setAttribute('data-relative-time', dataRelativeTime);
        });
    }, 300);

    $(window).bind('action:ajaxify.contentLoaded', refresh);
    $(window).bind('action:topics.loaded', refresh);
    $(document).ready(refresh);
    $(window).bind('action:categories.loaded', refresh);
}());
