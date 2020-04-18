/*global $ */
(function colorTopic() {

    /**
     * taken from underscoreJs
     */
    const _ = {
        now: Date.now || function() {
            return new Date().getTime();
        },
        debounce: function(func, wait, immediate) {
            let timeout, args, context, timestamp, result;

            const later = function () {
                const last = _.now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) {
                            context = args = null;
                        }
                    }
                }
            };

            return function() {
                context = this;
                args = arguments;
                timestamp = _.now();
                const callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            };
        }
    };

    const titleToTimestamp = function (title) {
        const matches = title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
        if (!matches) {
            return 0;
        }
        return parseInt((new Date(matches[1])).getTime() / 1000, 10);
    };

    const refresh = _.debounce(function () {
        const now = parseInt((new Date()).getTime() / 1000, 10);
        const topicRows = document.querySelectorAll('[component="category/topic"]');
        Array.prototype.forEach.call(topicRows, function (categoryItem) {
            const meta = categoryItem.querySelector('[component="topic/header"] a');
            const topicTime = titleToTimestamp(meta.getAttribute('content') || meta.textContent || '');
            let dataRelativeTime = '';
            const timeDiff = now - topicTime;

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
