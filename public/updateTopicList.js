/*global $, templates */

(function () {

	var attendanceMap = {
		yes: 'Ja',
		maybe: 'Vielleicht',
		no: 'Nein'
	};

    (function () {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = '/plugins/nodebb-plugin-attendance/css/styles.css?v=2';
        document.head.appendChild(css);
    }());

    (function () {
        $(document).on('click', 'button.attendance-control', function () {
            var $button = $(this);
           var value = $button.data('value');
           var tid = $button.data('tid');
           $.post({
               url: config.relative_path + '/api/attendance/' + tid,
               contentType: 'application/json',
               data: JSON.stringify({"type": value}),
               success: function () {
                   $button.disabled = true;
                   topicLoaded();
               },
               error: function () {
                   console.log(arguments);
               }
           });

        });
    }());

    var getTemplate = (function () {
        var loadedTemplates = {};
        return function (templateName, cb) {
            if (loadedTemplates[templateName]) {
                cb(loadedTemplates[templateName]);
            }
            $.get(templateName, function (response) {
                loadedTemplates[templateName] = response;
                cb(loadedTemplates[templateName]);
            });
        }
    }());


    var isMission = function (title) {
        return title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
    };

    var getUserSymbolElement = function (color) {
        var img = document.createElement("i");
        img.setAttribute('class', 'fa fa-fw fa-user');
        img.style.height = '24px';
        img.style.color = color;

        return img;
    };

    var colorMap = {
        yes: "#96D21F",
        maybe: "#D2A51F",
        no: "#D21F1F"
    };

    var addCommitmentCountToTopicHeader = function (categoryItem, attendance, myAttendance) {

        var statsDivs = categoryItem.querySelectorAll('.stats');
        var oneStatsDiv = statsDivs[0];
        var myAttendanceDiv = document.createElement('div');
        myAttendanceDiv.className = oneStatsDiv.className;
        myAttendanceDiv.appendChild(getUserSymbolElement(colorMap[myAttendance] || '#777'));
        oneStatsDiv.parentNode.insertBefore(myAttendanceDiv, oneStatsDiv);

        var viewsDiv = document.createElement('div');
        viewsDiv.className = oneStatsDiv.className;
        viewsDiv.innerHTML = oneStatsDiv.innerHTML;
        viewsDiv.querySelector('small').innerHTML = "Zusagen";
        viewsDiv.querySelector('[class="human-readable-number"]').innerHTML = attendance.yes.length;

        oneStatsDiv.parentNode.insertBefore(viewsDiv, oneStatsDiv);

        Array.prototype.forEach.call(statsDivs, function (statsDiv) {
            statsDiv.parentNode.removeChild(statsDiv);
        })
    };


    function getTopicTitle(categoryTopicComponentNode) {
        var titleElement = categoryTopicComponentNode.querySelector('[component="topic/header"] a, [component="topic/title"]');
        return titleElement.getAttribute('content') || titleElement.textContent || '';
    }

    function getCommitments(topicId, cb) {
        $.get('/api/attendance/' + topicId, function (response) {
            if (typeof response == 'string') {
                response = JSON.parse(response)
            }

            cb(response);
        });
    }

    var insertTopicAttendanceNode = function (topicComponentNode, attendanceNode) {
        var existingAttendanceComponentNode = topicComponentNode.parentNode.querySelector('[component="topic/attendance"]');
        if (existingAttendanceComponentNode) {
            topicComponentNode.parentNode.replaceChild(attendanceNode, existingAttendanceComponentNode);
        } else {
            topicComponentNode.parentNode.insertBefore(attendanceNode, topicComponentNode);
        }
    };

    var topicLoaded = function () {
        Array.prototype.forEach.call(document.querySelectorAll('[component="topic"]'), function (topicNode) {
            if (isMission(getTopicTitle(document))) {
                var topicId = parseInt(topicNode.getAttribute('data-tid'), 10);
                getCommitments(topicId, function (response) {
                    getTemplate('/plugins/nodebb-plugin-attendance/templates/topic.html?v=5', function (template) {
                        var markup = templates.parse(template, {
                            config: {
                                relative_path: config.relative_path
                            },
                            attendance: response.attendance,
                            myAttendance: attendanceMap[response.myAttendance] || 'nichts',
                            tid: topicId
                        });
                        var node = document.createElement('div');
                        node.setAttribute('component', 'topic/attendance');
                        node.innerHTML = markup;

                        insertTopicAttendanceNode(topicNode, node);
                    });
                });
            }
        });
    };

    var topicsLoaded = function () {
        Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (topicItem) {
            if (isMission(getTopicTitle(topicItem))) {
                var topicId = parseInt(topicItem.getAttribute('data-tid'), 10);
                getCommitments(topicId, function (response) {
                    addCommitmentCountToTopicHeader(topicItem, response.attendance, response.myAttendance);
                });
            }
        });
    };

    $(window).bind('action:topic.loaded', topicLoaded);
    $(window).bind('action:topics.loaded', topicsLoaded);
}());
