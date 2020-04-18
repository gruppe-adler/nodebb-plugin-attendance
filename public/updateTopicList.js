/*global $, templates, _ */

(function () {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.type = 'text/css';
    css.href = '/plugins/nodebb-plugin-attendance/css/styles.css?v=2';
    document.head.appendChild(css);
}());

(function () {

    $(document).on('dragstart', '[component="topic/attendance"] .avatar[data-uid]', function (event) {
        const originalEvent = event.originalEvent;
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

                const myfuckingButtonForReal = document.querySelectorAll('button.attendance-control');
                Array.prototype.forEach.call(myfuckingButtonForReal, function (myfuckingButtonForReal) {
                    myfuckingButtonForReal.setAttribute('data-value', value);
                });

                topicLoaded();
            },
            error: function () {
                console.error(arguments);
            }
        });
    }

    $(document).on('click', '.attendance-control[data-value]', function () {
        const $button = $(this);
        let value = getCurrentButtonValue($button);
        const probability = $button.data('probability');
        const tid = $button.attr('data-tid');
        const isMasterButton = $button.hasClass('attendance-master-button');

        if (isMasterButton) {
            if (value === 'unknown' || value == '' || value === 'no') { // TODO verify if we really need the fuzzy equality
                value = 'yes';
                $button.data("value", "yes");
            } else {
                value = 'no';
                $button.data("value", "no");
            }
        }

        setAttendance(tid, value, probability, function () {
            $(window).trigger('action:attendance.set', probability);
            $button.disabled = true;

            const valueToMeldung = {
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

const probabilityToYesMaybeNo = {
    1: "yes",
    0.5: "maybe",
    0: "no",
    2: "unknown"
};

const cachebuster = '4';
const getTemplates = function (templatePaths /*array of paths relative to public/templates*/) {
    if (typeof templatePaths === 'string') {
        templatePaths = [templatePaths];
    }
    return Promise.all(
        templatePaths.map(function (templatePath) {
            return getTemplate(templatePath + '?' + cachebuster)
        })
    );
};

const getTemplate = (function () {
    const loadedTemplates = {};
    return async function (templateName) {
        templateName = '/plugins/nodebb-plugin-attendance/ejs-templates/' + templateName;
        return new Promise((resolve, reject) => {
            if (loadedTemplates[templateName]) {
                return resolve(loadedTemplates[templateName]);
            }
            $.get(templateName, function (response) {
                loadedTemplates[templateName] = response;
                resolve(loadedTemplates[templateName]);
            });
        });
    }
}());

const isMission = function (title) {
    return title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
};

const symbolMap = {
    unknown: 'fa fa-fw fa-circle-o',
    yes: 'fa fa-fw fa-check-circle',
    maybe: 'fa fa-fw fa-question-circle',
    no: 'fa fa-fw fa-times-circle'
};

const getUserSymbolElement = function (color, myAttendance) {
    const img = document.createElement("i");
    img.setAttribute('class', symbolMap[myAttendance]);
    img.style.height = '24px';
    img.style.color = color;

    return img;
};

const colorMap = {
    unknown: "#eee",
    yes: "#66aa66",
    maybe: "#d18d1f",
    no: "#c91106"
};

const addCommitmentCountToTopicHeader = function (categoryItem, yesCount, possibleTotalCount, myAttendance) {
    if (hasAttendanceClasses(categoryItem)) {
        return;
    }

    const statsDivs = categoryItem.querySelectorAll('.stats');
    const oneStatsDiv = statsDivs[0];
    const myAttendanceDiv = document.createElement('div');
    myAttendanceDiv.className = oneStatsDiv.className + ' stats-attendance';
    myAttendanceDiv.appendChild(getUserSymbolElement(colorMap[myAttendance] || '#777', myAttendance));
    oneStatsDiv.parentNode.insertBefore(myAttendanceDiv, oneStatsDiv);

    function numberRangeMarkup(lower, upper) {
        let markup = '<span class="range-from">%d</span>'.replace('%d', lower);
        if (!isNaN(upper) && (upper !== lower)) {
            markup += ' <span class="range-to">– %d</span>'.replace('%d', upper);
        }
        return markup;
    }

    const viewsDiv = document.createElement('div');
    viewsDiv.className = oneStatsDiv.className + ' stats-attendance';
    viewsDiv.innerHTML = oneStatsDiv.innerHTML;
    viewsDiv.querySelector('small').innerHTML = "Zusagen";
    viewsDiv.querySelector('[class="human-readable-number"]').innerHTML = numberRangeMarkup(yesCount, possibleTotalCount);

    oneStatsDiv.parentNode.insertBefore(viewsDiv, oneStatsDiv);

    Array.prototype.forEach.call(statsDivs, function (statsDiv) {
        statsDiv.parentNode.removeChild(statsDiv);
    })
};

function getTopicTitle(categoryTopicComponentNode) {
    const titleElement = categoryTopicComponentNode.querySelector('[component="topic/header"] a, [component="topic/title"]');
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
const refreshToolTips = function () {
    const attendanceAvatar = document.querySelectorAll(".avatar-list-item");
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
    const postBarNode = document.querySelectorAll(".post-bar .clearfix");
    const topicId = parseInt(topicNode.getAttribute('data-tid'), 10);

    Array.prototype.forEach.call(postBarNode, async function(postBarNode) {

        const templates = await getTemplates('partials/post_bar.ejs');

        const buttonsNode = document.createElement('div');
        const existingButtonsNode = postBarNode.querySelector('.attendance-master-button') ? postBarNode.querySelector('.attendance-master-button').parentNode : null;
        const templateString = templates[0];

        const topicDateString = isMission(getTopicTitle(document))[1];
        console.debug("topicDateString: " + topicDateString);
        const isLocked = checkDateLock(topicDateString);
        console.debug("isLocked: " + isLocked);

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
}

// ende baustelle

const insertTopicAttendanceNode = function (topicComponentNode, attendanceNode, myAttendanceState, canAttend) {

    const firstPost = topicComponentNode.querySelector('[component="post"]');

    //exit if isn't first page
    if (firstPost.getAttribute("data-index") != "0") { // TODO check data-index type
        return false;
    }

    //replace we updated data if the attendance component already exists
    const existingAttendanceComponentNode = firstPost.querySelector('[component="topic/attendance"]');
    if (existingAttendanceComponentNode) {
        firstPost.replaceChild(attendanceNode, existingAttendanceComponentNode);
        hideAttendanceDetails();
        insertDecisionButtons(topicComponentNode, myAttendanceState);
        refreshToolTips();
        return true;
    }

    const postBarNode = firstPost.querySelector('[class="post-bar"]');

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

const hasAttendanceClasses = function (node) {
    return node.querySelector('.stats-attendance');
};

const topicLoaded = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[component="topic"]'), function (topicNode) {

        if (isMission(getTopicTitle(document))) {
            const topicId = parseInt(topicNode.getAttribute('data-tid'), 10);
            getCommitments(topicId, function (response) {
                getTemplates(['topic.ejs', 'partials/topic_userbadge.ejs', 'partials/topic_detailsRow.ejs']).then(templates => {
                    const template = templates[0],
                        userbadgeTemplate = templates[1],
                        userRowTemplate = templates[2];
                    const getUserMarkupList = function (compiledTemplate, attendanceState) {
                        return response.attendants.sort(function (a, b) {
                            if (a.isSlotted && !b.isSlotted) {
                                return -1;
                            } else if (!a.isSlotted && b.isSlotted) {
                                return 1;
                            }
                            return b.timestamp - a.timestamp;
                        }).filter(function (attendant) {
                            return probabilityToYesMaybeNo[attendant.probability] === attendanceState;
                        }).map(function (attendant) {
                            return compiledTemplate({
                                attendant: attendant,
                                attendanceState: attendanceState,
                                config: config
                            });
                        });
                    };
                    const compiledUserbadgeTemplate = _.template(userbadgeTemplate);
                    const compiledUserRowTemplate = _.template(userRowTemplate);

                    const markup = _.template(template)({
                        config: config,
                        yesListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'yes'),
                        maybeListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'maybe'),
                        noListMarkup: getUserMarkupList(compiledUserbadgeTemplate, 'no'),
                        userRowsMarkupYes: getUserMarkupList(compiledUserRowTemplate, 'yes'),
                        userRowsMarkupMaybe: getUserMarkupList(compiledUserRowTemplate, 'maybe'),
                        userRowsMarkupNo: getUserMarkupList(compiledUserRowTemplate, 'no'),
                        tid: topicId
                    });

                    const node = document.createElement('div');
                    node.setAttribute('component', 'topic/attendance');
                    node.innerHTML = markup;

                    insertTopicAttendanceNode(topicNode, node, response.myAttendance, response.canAttend);
                }).catch(err => {
                    console.error(err);
                });
            });
        }
    });
};

const topicsLoaded = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (topicItem) {
        if (hasAttendanceClasses(topicItem)) {
            return;
        }
        if (isMission(getTopicTitle(topicItem))) {
            const topicId = parseInt(topicItem.getAttribute('data-tid'), 10);
            getCommitments(topicId, function (response) {
                const yesCount = response.attendants.filter(function (attendant) {
                    return probabilityToYesMaybeNo[attendant.probability] === 'yes'
                }).length;
                const maybeCount = response.attendants.filter(function (attendant) {
                    return probabilityToYesMaybeNo[attendant.probability] === 'maybe'
                }).length;
                addCommitmentCountToTopicHeader(
                    topicItem,
                    yesCount,
                    yesCount + maybeCount,
                    probabilityToYesMaybeNo[response.myAttendance ? response.myAttendance.probability : 2]);
            });
        }
    });
};

$(window).bind('action:topic.loaded', topicLoaded);
$(window).bind('action:arma3-slotting.set', function () { setTimeout(topicLoaded, 50); });
$(window).bind('action:arma3-slotting.unset', function () { setTimeout(topicLoaded, 50); });
$(window).bind('action:topics.loaded', topicsLoaded);
$(document).ready(function () {
    switch (app.template) {
        case 'category':
        case 'views/events':
            topicsLoaded();
            break;
        case 'topic':
            topicLoaded();
            break;
    }
});

const showAttendanceDetails = function () {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'block';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'block';
};
const hideAttendanceDetails = function () {
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
    const now = (new Date());

    const fillDate = new Date(d);
    fillDate.setHours(20);
    fillDate.setMinutes(0);

    const itsHistory = (now.getTime() > fillDate.getTime());
    console.log("now is: " + now + " - fillDate is: " + fillDate);

    return itsHistory;
}

function nodebbPluginAttendanceTotalPotentialAttendees(min, pot) {
    return min + pot;
}
