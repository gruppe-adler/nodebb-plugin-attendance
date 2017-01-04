/*global $, templates */

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

    var symbolMap = {
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
     var insertDecisionButtons = function (topicNode) {
        
        var postBarNode = document.querySelector(".post-bar div");

        var topicId = parseInt(topicNode.getAttribute('data-tid'), 10);
        
        getCommitments(topicId, function (response) {       
           getTemplate('/plugins/nodebb-plugin-attendance/templates/partials/post_bar.html?v=5', function (template) {
                var node = document.createElement('div');
                var markup = templates.parse(template, {
                    config: {
                        relative_path: config.relative_path
                    },

                        attendance: response.attendance,
                        yes: (function (v1) {
                            if (v1 == "yes") {
                                return 1
                            } else {
                                return 0
                            }
                        })(response.myAttendance),
                        maybe: (function (v1) {
                            if (v1 == "maybe") {
                                return 1
                            } else {
                                return 0
                            }
                        })(response.myAttendance),
                        no: (function (v1) {
                            if (v1 == "no") {
                                return 1
                            } else {
                                return 0
                            }
                        })(response.myAttendance),
                        tid: topicId
                });
                node.innerHTML = markup; // templates.parse(template, {});
                postBarNode.appendChild(node);
            });
        });
    };
    
    // ende baustelle

    var insertTopicAttendanceNode = function (topicComponentNode, attendanceNode) {
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
            return true;
        }

        var postBarNode = firstPost.querySelector('[class="post-bar"]');

        //only insert attendance if the postbar exists (if this is the first post)
        if (postBarNode) {
            postBarNode.parentNode.insertBefore(attendanceNode, postBarNode);
            
            // todo: hook here to insert decision buttons into post-bar?
            insertDecisionButtons(topicComponentNode);
            // window.alert(postBarCode).
            // postBarNode.parentNode.insertBefore(postBarCode, postBarNode);
            
        } else if (topicComponentNode.children.length === 1) {
            firstPost.appendChild(attendanceNode);
        }

        hideAttendanceDetails();
    };



    var hasAttendanceClasses = function (node) {
        return node.querySelector('.stats-attendance');
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
                            yes: (function (v1) {
                                if (v1 == "yes") {
                                    return 1
                                } else {
                                    return 0
                                }
                            })(response.myAttendance),
                            maybe: (function (v1) {
                                if (v1 == "maybe") {
                                    return 1
                                } else {
                                    return 0
                                }
                            })(response.myAttendance),
                            no: (function (v1) {
                                if (v1 == "no") {
                                    return 1
                                } else {
                                    return 0
                                }
                            })(response.myAttendance),
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
