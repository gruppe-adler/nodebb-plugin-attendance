/*global $, templates, _ */

(function () {
    (function () {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = '/plugins/nodebb-plugin-attendance/css/styles.css?v=2';
        document.head.appendChild(css);
    }());

    (function () {
        $(document).on('click', '.attendance-control', function () {
            var $button = $(this);
            var value = getCurrentButtonValue($button);
            var tid = $button.attr('data-tid');
            var btnType = $button.attr('data-id');
            console.log(value, tid, btnType);

            if (btnType == 'master') {
                if (value == 'unknown' || value == '' || value == 'no') {
                    value = 'yes';
                    $button.data("value", "yes");
                    // console.log("yes to yes");
                } else {
                    value = 'no';
                    $button.data("value", "no");
                    // console.log("any to unknown");
                }
            }
             $.post({
                url: config.relative_path + '/api/attendance/' + tid,
                contentType: 'application/json',
                data: JSON.stringify({"type": value}),
                success: function () {
                    $button.disabled = true;
                    var myfuckingButtonForReal = document.querySelectorAll('button.attendance-control');

                    Array.prototype.forEach.call(myfuckingButtonForReal, function (myfuckingButtonForReal) {
                        myfuckingButtonForReal.setAttribute('data-value',value);
                    })
                    

                    topicLoaded();

                },
                error: function () {
                    console.log(arguments);
                }
            });

            

        });
    }());

    function getCurrentButtonValue (button) {
        return button.attr('data-value');
    }

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
        unknown: "#f0f0f0",
        yes: "#66aa66",
        maybe: "#d18d1f",
        no: "#c91106"
    };

    var addCommitmentCountToTopicHeader = function (categoryItem, attendance, myAttendance) {
        if (hasAttendanceClasses(categoryItem)) {
            return;
        }

        var statsDivs = categoryItem.querySelectorAll('.stats');
        var oneStatsDiv = statsDivs[0];
        var myAttendanceDiv = document.createElement('div');
        myAttendanceDiv.className = oneStatsDiv.className  + ' stats-attendance';
        myAttendanceDiv.appendChild(getUserSymbolElement(colorMap[myAttendance] || '#777',myAttendance));
        oneStatsDiv.parentNode.insertBefore(myAttendanceDiv, oneStatsDiv);

        var viewsDiv = document.createElement('div');
        viewsDiv.className = oneStatsDiv.className + ' stats-attendance';
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

    // baustelle
    var refreshToolTips = function () {
         var attendanceAvatar = document.querySelectorAll(".avatar");
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
    function insertDecisionButtons(topicNode, myAttendanceState) {
        var postBarNode = document.querySelectorAll(".post-bar .clearfix");
        var topicId = parseInt(topicNode.getAttribute('data-tid'), 10);

        Array.prototype.forEach.call(postBarNode, function (postBarNode) {

            getTemplate('/plugins/nodebb-plugin-attendance/templates/partials/post_bar.ejs?v=1', function (templateString) {
                var buttonsNode = document.createElement('div');
                var existingButtonsNode = postBarNode.querySelector('[data-id="master"]');
                var markup = _.template(templateString)({
                    config: {
                        relative_path: config.relative_path
                    },
                    myAttendanceState: myAttendanceState,
                    tid: topicId
                });
                buttonsNode.innerHTML = markup;

                if (!existingButtonsNode) {
                    console.log('adding buttonsNode…');
                    postBarNode.appendChild(buttonsNode);
                }
            });
        })
    }
    /*
    function insertDecisionButtons(topicNode, myAttendanceState) {
        Array.prototype.forEach.call(document.querySelectorAll('.post-bar .clearfix'), function (topicNode) {
        
        
        var topicId = parseInt(topicNode.getAttribute('data-tid'));

            getTemplate('/plugins/nodebb-plugin-attendance/templates/partials/post_bar.ejs?v=1', function (templateString) {
                var buttonsNode = document.createElement('div');
                var existingButtonsNode = topicNode.querySelector('[data-id="master"]');
                var markup = _.template(templateString)({
                    config: {
                        relative_path: config.relative_path
                    },
                    myAttendanceState: myAttendanceState,
                    tid: topicId
                });
                buttonsNode.innerHTML = markup;

                if (!existingButtonsNode) {
                    console.log('adding buttonsNode…');
                    topicNode.appendChild(buttonsNode);
                }
            });
        });
    }*/
    
    // ende baustelle

    var insertTopicAttendanceNode = function (topicComponentNode, attendanceNode, myAttendanceState) {

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
            refreshToolTips();
            return true;
        }

        var postBarNode = firstPost.querySelector('[class="post-bar"]');

        //only insert attendance if the postbar exists (if this is the first post)
        if (postBarNode) {
            postBarNode.parentNode.insertBefore(attendanceNode, postBarNode);
            insertDecisionButtons(topicComponentNode, myAttendanceState);
        } else if (topicComponentNode.children.length === 1) {
            firstPost.appendChild(attendanceNode);
            insertDecisionButtons(topicComponentNode, myAttendanceState);
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
                    getTemplate('/plugins/nodebb-plugin-attendance/templates/topic.ejs?v=1', function (template) {
                        getTemplate('/plugins/nodebb-plugin-attendance/templates/partials/topic_userbadge.ejs?v=1', function (userbadgeTemplate) {
                            getTemplate('/plugins/nodebb-plugin-attendance/templates/partials/topic_detailsRow.ejs?v=1', function (userRowTemplate) {

                                var compiledUserbadgeTemplate = _.template(userbadgeTemplate);
                                var userbadgeListsMarkup = ['yes', 'maybe', 'no'].map(function (attendanceState) {
                                    return response.attendance[attendanceState].map(function (attendant) {
                                        return compiledUserbadgeTemplate({
                                            attendant: attendant,
                                            attendanceState: attendanceState
                                        })
                                    });
                                });

                                var compiledUserRowTemplate = _.template(userRowTemplate);
                                var userRowsMarkup = ['yes', 'maybe', 'no'].map(function (attendanceState) {
                                    return response.attendance[attendanceState].map(function (attendant) {
                                        return compiledUserRowTemplate({
                                            attendant: attendant,
                                            attendanceState: attendanceState,
                                            config: config
                                        })
                                    });
                                });

                                var markup = _.template(template)({

                                    config: {
                                        relative_path: config.relative_path
                                    },


                                    yesListMarkup: userbadgeListsMarkup[0],
                                    maybeListMarkup: userbadgeListsMarkup[1],
                                    noListMarkup: userbadgeListsMarkup[2],
                                    userRowsMarkupYes: userRowsMarkup[0],
                                    userRowsMarkupMaybe: userRowsMarkup[1],
                                    userRowsMarkupNo: userRowsMarkup[2],
                                    myAttendanceState: response.myAttendance,
                                    tid: topicId
                                });

                                var node = document.createElement('div');
                                node.setAttribute('component', 'topic/attendance');
                                node.innerHTML = markup;

                                insertTopicAttendanceNode(topicNode, node, response.myAttendance);
                            })
                        });
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
                    addCommitmentCountToTopicHeader(topicItem, response.attendance, response.myAttendance);
                });
            }
        });
    };


    $(window).bind('action:topic.loaded', topicLoaded);
    $(window).bind('action:topics.loaded', topicsLoaded);

}());

var showAttendanceDetails = function () {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'block';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'block';
};
var hideAttendanceDetails = function () {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'none';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'none';
};
