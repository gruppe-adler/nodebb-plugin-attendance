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


                    var postsDiv = categoryItem.querySelector('[class="col-md-1 hidden-sm hidden-xs stats"]');
                    var viewsDiv = (categoryItem.querySelectorAll('[class="col-md-1 hidden-sm hidden-xs stats"]'))[1];

                    var firm_commitments = viewsDiv.querySelector('[component="topic/firm-commitments"]').getAttribute('data-firmcomm');
                    var own_commitment = postsDiv.querySelector('[component="topic/own-commitment"]').getAttribute('data-owncomm');

                    console.log(own_commitment);

                    var color = "#777"; //GREY
                    switch (own_commitment) {
                         case "1":
                              color = "#96D21F"; //GREEN
                              break;
                         case "2":
                              color = "#D2A51F"; //ORANGE
                              break;
                         case "3":
                              color = "#D21F1F"; //RED
                              break;
                    }

                    //delete post count
                    var height = postsDiv.style.clientHeight;
                    postsDiv.innerHTML = "";

                    //own commitment
                    var img = document.createElement("i");
                    postsDiv.appendChild(img);
                    img.setAttribute('class', 'fa fa-fw fa-user');
                    img.style.height = height;
                    img.style.paddingTop = "25%";
                    img.style.paddingBottom = "25%";
                    img.style.color = color;

                    //firm commitments
                    viewsDiv.querySelector('small').innerHTML = "ZUSAGEN";
                    viewsDiv.querySelector('[class="human-readable-number"]').innerHTML = firm_commitments;
               }
          });
     }

     $(window).bind('action:topics.loaded', topicsLoaded);
     $(window).bind('action:topic.loaded', topicLoaded);
}());
