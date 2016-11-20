/*global $ */
(function updateTopicList() {
     var isMission = function (title) {
          var matches = title.trim().match(/([0-9]{4}-[0-9]{2}-[0-9]{2})([^0-9a-z])/i);
          if (!matches) {
               return false;
          } else {
               return true;
          }
     }
     var topicLoaded = function () {
          var topicID = parseInt(app.currentRoom.replace("topic_",""));
          if (isMission(document.querySelector('[component="topic/title"]').getAttribute('content') || document.querySelector('[component="topic/title"]').textContent || '')) {

          }
     };
     var topicsLoaded = function () {

          //for all shown topics
          Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (categoryItem) {

               //check wheather topic is a mission
               if (isMission(categoryItem.querySelector('[component="topic/header"] a').getAttribute('content') || categoryItem.querySelector('[component="topic/header"] a').textContent || '')) {

                    var topicID = parseInt(category.getAttribute("data-tid"));

                    var postsDiv = categoryItem.querySelector('[class="col-md-1 hidden-sm hidden-xs stats"]');
                    var viewsDiv = (categoryItem.querySelectorAll('[class="col-md-1 hidden-sm hidden-xs stats"]'))[1];

                    //delete posts
                    var height = postsDiv.style.clientHeight;
                    postsDiv.innerHTML = "";

                    //own commitment
                    var img = document.createElement("i");
                    postsDiv.appendChild(img);
                    img.setAttribute('class', 'fa fa-fw fa-user');
                    img.style.height = height;
                    img.style.paddingTop = "25%";
                    img.style.paddingBottom = "25%";

                    //firm commitments
                    viewsDiv.querySelector('small').innerHTML = "ZUSAGEN";
                    var firm_commitments = 0;
                    viewsDiv.querySelector('span').innerHTML = firm_commitments.toString();
               }
          });
          console.log("Topics Updated");
     }

     $(window).bind('action:topics.loaded', topicsLoaded);
     $(window).bind('action:topic.loaded', topicLoaded);
}());
