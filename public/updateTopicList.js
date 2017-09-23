/*global $, templates, _ */

require(['async'], function (async) {
    (function () {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = '/plugins/nodebb-plugin-attendance/css/styles.css?v=2';
        document.head.appendChild(css);
    }());

    (function () {

        $(document).on('dragstart', '[component="topic/attendance"] .avatar[data-uid]', function (event) {
            var originalEvent = event.originalEvent;
            originalEvent.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                    uid: event.target.getAttribute('data-uid'),
                    username: event.target.getAttribute('data-username')
                })
            );
        });

        function setAttendance(tid, value, probability, callback) {
            $.post({
                url: config.relative_path + '/api/attendance/' + tid,
                contentType: 'application/json',
                data: JSON.stringify({type: value, probability: probability}),
                success: function () {
                    callback && callback();

                    var myfuckingButtonForReal = document.querySelectorAll('button.attendance-control');
                    Array.prototype.forEach.call(myfuckingButtonForReal, function (myfuckingButtonForReal) {
                        myfuckingButtonForReal.setAttribute('data-value', value);
                    });

                    topicLoaded();



                },
                error: function () {
                    console.log(arguments);
                }
            });
        }

        $(document).on('click', '.attendance-control', function () {
            var $button = $(this);
            var value = getCurrentButtonValue($button);
            var probability = $button.data('probability');
            var tid = $button.attr('data-tid');
            var isMasterButton = $button.hasClass('attendance-master-button');

            if (isMasterButton) {
                if (value === 'unknown' || value == '' || value === 'no') {
                    value = 'yes';
                    $button.data("value", "yes");
                    // console.log("yes to yes");
                } else {
                    value = 'no';
                    $button.data("value", "no");
                    // console.log("any to unknown");
                }
            }

            setAttendance(tid, value, probability, function () {
                $(window).trigger('action:attendance.set', probability);
                $button.disabled = true;

                var valueToMeldung = {
                    yes: 'angemeldet',
                    maybe: 'als vielleicht angemeldet',
                    no: 'abgemeldet'
                };

                app.alert({
                    title: 'Teilnahme',
                    message: 'Du hast dich ' + valueToMeldung[value],
                    location: 'left-bottom',
                    timeout: 2500,
                    type: value === 'no' ? 'info' : 'success',
                    image: ''
                });
            });
        });
    }());

    function getCurrentButtonValue(button) {
        return button.attr('data-value');
    }

    var probabilityToYesMaybeNo = {
        1: "yes",
        0.5: "maybe",
        0: "no",
        2: "unknown"
    };

    var cachebuster = '3';
    var getTemplates = function (templatePaths /*array of paths relative to public/templates*/, callback) {
        if (typeof templatePaths === 'string') {
            templatePaths = [templatePaths];
        }
        async.parallel(
            templatePaths.map(function (templatePath) {
                return function (next) {
                    getTemplate(templatePath + '?' + cachebuster, function (template) {
                        next(null, template);
                    });
                };
            }),
            callback
        );
    };

    var getTemplate = (function () {
        var loadedTemplates = {};
        return function (templateName, cb) {
            templateName = '/plugins/nodebb-plugin-attendance/ejs-templates/' + templateName;
            if (loadedTemplates[templateName]) {
                return cb(loadedTemplates[templateName]);
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

    var symbolMap = {
        unknown: 'fa fa-fw fa-circle-o',
        yes: 'fa fa-fw fa-check-circle',
        maybe: 'fa fa-fw fa-question-circle',
        no: 'fa fa-fw fa-times-circle'
    };

    var getUserSymbolElement = function (color, myAttendance) {
        var img = document.createElement("i");
        img.setAttribute('class', symbolMap[myAttendance]);
        img.style.height = '24px';
        img.style.color = color;

        return img;
    };

    var colorMap = {
        unknown: "#eee",
        yes: "#66aa66",
        maybe: "#d18d1f",
        no: "#c91106"
    };

    var addCommitmentCountToTopicHeader = function (categoryItem, yesCount, myAttendance) {
        if (hasAttendanceClasses(categoryItem)) {
            return;
        }

        var statsDivs = categoryItem.querySelectorAll('.stats');
        var oneStatsDiv = statsDivs[0];
        var myAttendanceDiv = document.createElement('div');
        myAttendanceDiv.className = oneStatsDiv.className + ' stats-attendance';
        myAttendanceDiv.appendChild(getUserSymbolElement(colorMap[myAttendance] || '#777', myAttendance));
        oneStatsDiv.parentNode.insertBefore(myAttendanceDiv, oneStatsDiv);

        var viewsDiv = document.createElement('div');
        viewsDiv.className = oneStatsDiv.className + ' stats-attendance';
        viewsDiv.innerHTML = oneStatsDiv.innerHTML;
        viewsDiv.querySelector('small').innerHTML = "Zusagen";
        viewsDiv.querySelector('[class="human-readable-number"]').innerHTML = yesCount;

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
            if (typeof response === 'string') {
                response = JSON.parse(response)
            }

            cb(response);
        });
    }

    // baustelle
    var refreshToolTips = function () {
        var attendanceAvatar = document.querySelectorAll(".avatar-list-item");
        Array.prototype.forEach.call(attendanceAvatar, function (attendanceAvatar) {
            if (!utils.isTouchDevice()) {
                $(attendanceAvatar).tooltip({
                    placement: 'top',
                    title: $(attendanceAvatar).attr('title')
                });
            }
        });
    };

    // github original
    function insertDecisionButtons(topicNode, myAttendance) {
        var postBarNode = document.querySelectorAll(".post-bar .clearfix");
        var topicId = parseInt(topicNode.getAttribute('data-tid'), 10);

        Array.prototype.forEach.call(postBarNode, function (postBarNode) {

            getTemplates('partials/post_bar.ejs', function (err, templates) {
                var buttonsNode = document.createElement('div');
                var existingButtonsNode = postBarNode.querySelector('.attendance-master-button') ? postBarNode.querySelector('.attendance-master-button').parentNode : null;
                var templateString = templates[0];

                var topicDateString = isMission(getTopicTitle(document))[1];
                console.log("topicDateString: " + topicDateString);
                var isLocked = checkDateLock(topicDateString);
                console.log("isLocked: " + isLocked);

                buttonsNode.innerHTML = _.template(templateString)({
                    config: {
                        relative_path: config.relative_path
                    },
                    myAttendanceState: probabilityToYesMaybeNo[myAttendance ? myAttendance.probability : 2],
                    isLockedMarkup: isLocked,
                    tid: topicId
                });

                if (!existingButtonsNode) {
                    console.log('adding buttonsNode…');
                    postBarNode.appendChild(buttonsNode);
                } else {
                    existingButtonsNode.parentNode.replaceChild(buttonsNode, existingButtonsNode);
                }
            });
        });
    }

    // ende baustelle

    var insertTopicAttendanceNode = function (topicComponentNode, attendanceNode, myAttendanceState, canAttend) {

        var firstPost = topicComponentNode.querySelector('[component="post"]');

        //exit if isn't first page
        if (firstPost.getAttribute("data-index") != "0") {
            return false;
        }

        //replace we updated data if the attendance component already exists
        var existingAttendanceComponentNode = firstPost.querySelector('[component="topic/attendance"]');
        if (existingAttendanceComponentNode) {
            firstPost.replaceChild(attendanceNode, existingAttendanceComponentNode);
            hideAttendanceDetails();
            insertDecisionButtons(topicComponentNode, myAttendanceState);
            refreshToolTips();
            return true;
        }

        var postBarNode = firstPost.querySelector('[class="post-bar"]');

        //only insert attendance if the postbar exists (if this is the first post)
        if (postBarNode) {
            postBarNode.parentNode.insertBefore(attendanceNode, postBarNode);
            if (canAttend) {
                insertDecisionButtons(topicComponentNode, myAttendanceState);
            }
        } else if (topicComponentNode.children.length === 1) {
            firstPost.appendChild(attendanceNode);
            if (canAttend) {
                insertDecisionButtons(topicComponentNode, myAttendanceState);
            }
        }

        hideAttendanceDetails();
        refreshToolTips();
    };

    var hasAttendanceClasses = function (node) {
        return node.querySelector('.stats-attendance');
    };

    var topicLoaded = function () {
        Array.prototype.forEach.call(document.querySelectorAll('[component="topic"]'), function (topicNode) {

            if (isMission(getTopicTitle(document))) {
                var topicId = parseInt(topicNode.getAttribute('data-tid'), 10);
                getCommitments(topicId, function (response) {
                    getTemplates(['topic.ejs', 'partials/topic_userbadge.ejs', 'partials/topic_detailsRow.ejs'], function (err, templates) {
                        var
                            template = templates[0],
                            userbadgeTemplate = templates[1],
                            userRowTemplate = templates[2];
                        var getUserMarkupList = function (compiledTemplate, attendanceState) {
                            return response.attendants.sort(function (a, b) { return b.timestamp - a.timestamp}).filter(function (attendant) {
                                return probabilityToYesMaybeNo[attendant.probability] == attendanceState;
                            }).map(function (attendant) {
                                return compiledTemplate({
                                    attendant: attendant,
                                    attendanceState: attendanceState,
                                    config: config
                                });
                            });
                        };
                        var compiledUserbadgeTemplate = _.template(userbadgeTemplate);
                        var compiledUserRowTemplate = _.template(userRowTemplate);

                        var markup = _.template(template)({
                            config: config,
                            yesListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'yes'),
                            maybeListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'maybe'),
                            noListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'no'),
                            userRowsMarkupYes: getUserMarkupList(compiledUserRowTemplate, 'yes'),
                            userRowsMarkupMaybe: getUserMarkupList(compiledUserRowTemplate, 'maybe'),
                            userRowsMarkupNo: getUserMarkupList(compiledUserRowTemplate, 'no'),
                            tid: topicId
                        });

                        var node = document.createElement('div');
                        node.setAttribute('component', 'topic/attendance');
                        node.innerHTML = markup;

                        insertTopicAttendanceNode(topicNode, node, response.myAttendance, response.canAttend);
                    });
                });
            }
        });
    };

    var topicsLoaded = function () {
        Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (topicItem) {
            if (hasAttendanceClasses(topicItem)) {
                return;
            }
            if (isMission(getTopicTitle(topicItem))) {
                var topicId = parseInt(topicItem.getAttribute('data-tid'), 10);
                getCommitments(topicId, function (response) {
                    var yesCount = response.attendants.filter(function (attendant) {
                        return probabilityToYesMaybeNo[attendant.probability] === 'yes'
                    }).length;
                    addCommitmentCountToTopicHeader(
                        topicItem,
                        yesCount,
                        probabilityToYesMaybeNo[response.myAttendance ? response.myAttendance.probability : 2]);
                });
            }
        });
    };


    $(window).bind('action:topic.loaded', topicLoaded);
    $(window).bind('action:arma3-slotting.set', function () { setTimeout(topicLoaded, 50); });
    $(window).bind('action:arma3-slotting.unset', function () { setTimeout(topicLoaded, 50); });
    $(window).bind('action:topics.loaded', topicsLoaded);
    if (app.template === 'category' || app.template === 'views/events') {
        topicsLoaded();
    }

});

var showAttendanceDetails = function () {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'block';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'block';
};
var hideAttendanceDetails = function () {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'none';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'none';
};

function nodebbPluginAttendanceCustomISODateString(d) {
    d = new Date(d);
    function pad(n) {
        return n < 10 ? '0' + n : n
    }

    return d.getUTCFullYear() + '-'
        + pad(d.getUTCMonth() + 1) + '-'
        + pad(d.getUTCDate()) + ' '
        + pad(d.getUTCHours()) + ':'
        + pad(d.getUTCMinutes())
}

function checkDateLock(d) {
    var now = (new Date());

    var fillDate = new Date(d);
    fillDate.setHours(20);
    fillDate.setMinutes(0);

    var itsHistory = (now.getTime() > fillDate.getTime());
    console.log("now is: " + now + " - fillDate is: " + fillDate);

    return itsHistory;
}

function nodebbPluginAttendanceTotalPotentialAttendees(min, pot) {
    return min + pot;
}
