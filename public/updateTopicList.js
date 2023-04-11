/*global $, templates, _template */

(function () {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.type = 'text/css';
    css.href = '/assets/plugins/nodebb-plugin-attendance/css/styles.css?' + app.cacheBuster;
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
            if (!value || ['unknown', 'no'].indexOf(value) !== -1) { // TODO verify if we really need the fuzzy equality
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

const getTemplates = function (templatePaths /*array of paths relative to public/templates*/) {
    if (typeof templatePaths === 'string') {
        templatePaths = [templatePaths];
    }
    return Promise.all(
        templatePaths.map(function (templatePath) {
            return getTemplate(templatePath + '?' + app.cacheBuster)
        })
    );
};

const getTemplate = (function () {
    const loadedTemplates = {};
    return async function (templateName) {
        templateName = '/assets/plugins/nodebb-plugin-attendance/ejs-templates/' + templateName;
        return new Promise((resolve, reject) => {
            if (loadedTemplates[templateName]) {
                return resolve(loadedTemplates[templateName]);
            }
            $.get(templateName, function (response) {
                if (response) {
                    loadedTemplates[templateName] = response;
                    resolve(loadedTemplates[templateName]);
                } else {
                    reject();
                }
            });
        });
    }
}());

const getEventTopicDateMatch = function (title) {
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

    function removeClass(node, className) {
        node.className = node.className.split(' ').filter(c => c !== className).join(' ');
    }
    function addClass(node, className) {
        node.className = node.className + ' ' + className;
    }

    const statsDivs = categoryItem.querySelectorAll('.stats');
    const oneStatsDiv = statsDivs[0];
    const myAttendanceDiv = document.createElement('div');
    myAttendanceDiv.className = oneStatsDiv.className;
    addClass(myAttendanceDiv, 'stats-attendance');
    removeClass(myAttendanceDiv, 'stats-votes');
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
    viewsDiv.className = oneStatsDiv.className;
    addClass(viewsDiv, 'stats-attendance');
    removeClass(viewsDiv, 'stats-votes');
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

function getEventDate(categoryTopicComponentNode) {
    const topicTitle = getTopicTitle(categoryTopicComponentNode);
    const dateMatch = getEventTopicDateMatch(topicTitle);

    return dateMatch ? new Date(dateMatch[1]) : undefined;
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

async function insertDecisionButtons(myAttendance) {
    const mainButtonsContainer = getTopicMainButtonsContainerOnTopicPage();
    if (!mainButtonsContainer) {
        console.warn('could not find topic main buttons container');
        return;
    }

    const templates = await getTemplates('partials/post_bar.ejs');

    const buttonsNodeParent = document.createElement('div');
    buttonsNodeParent.innerHTML = _template(templates[0])({
        config: {
            relative_path: config.relative_path
        },
        myAttendanceState: probabilityToYesMaybeNo[myAttendance ? myAttendance.probability : 2],
        isLockedMarkup: checkDateLock(getEventDate(document)),
        tid: getTopicId(),
    });


    const existingButtonsNode = mainButtonsContainer.querySelector('[component="topic/attendance-buttons"]');
    if (existingButtonsNode) {
        mainButtonsContainer.replaceChild(buttonsNodeParent.firstElementChild, existingButtonsNode);
    } else {
        mainButtonsContainer.prepend(buttonsNodeParent.firstElementChild);
    }
}

// ende baustelle

const insertAfter = function (newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling)
}

const insertOrReplaceTopicAttendanceNode = function (attendanceNode) {
    const topicHeaderNode = getTopicHeaderOnTopicPage();
    const topicNode = topicHeaderNode.parentNode;


    const existingAttendanceComponentNode = topicNode.querySelector('[component="topic/attendance"]');
    if (existingAttendanceComponentNode) {
        existingAttendanceComponentNode.parentNode.replaceChild(attendanceNode, existingAttendanceComponentNode);
    } else {
        const firstPost = document.querySelector('[component="post"][data-index="0"]');
        const slottingNode = topicNode.querySelector('[component="topic/arma3-slotting"]');
        if (slottingNode) {
            topicNode.insertBefore(attendanceNode, slottingNode)
        } else {
            insertAfter(attendanceNode, firstPost)
        }
    }
};

const hasAttendanceClasses = function (node) {
    return node.querySelector('.stats-attendance');
};

const getTopicMainButtonsContainerOnTopicPage = function () {
    return document.querySelector('.topic-main-buttons');
}

const getTopicHeaderOnTopicPage = function () {
    // previously document.querySelector('[component="topic"]')
    return document.querySelector('.topic-header')
}

const getTopicId = function (topicNode) {
    if (!topicNode) {
        topicNode = document.querySelector('[component="topic"]');
    }
    return parseInt(topicNode.getAttribute('data-tid'), 10);
}

const topicLoaded = function () {
    const topicHeader = getTopicHeaderOnTopicPage();
    if (!topicHeader) {
        console.warn('cannot find topic header node');
        return;
    }

    if (!getEventDate(topicHeader)) {
        return;
    }

    const topicId = getTopicId()

    getCommitments(topicId, function (attendance) {
        getTemplates(['topic.ejs', 'partials/topic_userbadge.ejs', 'partials/topic_detailsRow.ejs']).then(templates => {
            const template = templates[0],
                userbadgeTemplate = templates[1],
                userRowTemplate = templates[2];
            const getUserMarkupList = function (compiledTemplate, attendanceState) {
                return attendance.attendants.sort(function (a, b) {
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
            const compiledUserbadgeTemplate = _template(userbadgeTemplate);
            const compiledUserRowTemplate = _template(userRowTemplate);

            const markup = _template(template)({
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

            insertOrReplaceTopicAttendanceNode(node);
            hideAttendanceDetails();
            if (attendance.canAttend) {
                console.info('inserting decision buttons, go!')
                insertDecisionButtons(attendance.myAttendance);
            }
            refreshToolTips()
        }).catch(err => {
            console.error(err);
        });
    });
}

const topicsLoaded = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (topicItem) {
        if (hasAttendanceClasses(topicItem)) {
            return;
        }
        if (getEventDate(topicItem)) {
            const topicId = getTopicId(topicItem);
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
$(window).bind('action:events.loaded', topicsLoaded);
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

window.showAttendanceDetails = () => {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'block';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'block';
};
window.hideAttendanceDetails = () => {
    document.querySelector('[component="topic/attendance/details"]').style.display = 'none';
    document.querySelector('[component="topic/attendance/backdrop"]').style.display = 'none';
};

window.nodebbPluginAttendanceCustomISODateString = (d) => {
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

window.nodebbPluginAttendanceTotalPotentialAttendees = (min, pot) => {
    return min + pot;
}
