/*global $ */
(function updateTopicList() {
     var topicsLoaded = function () {

          //for all shown topics
          Array.prototype.forEach.call(document.querySelectorAll('[component="category/topic"]'), function (categoryItem) {

               //check wheather topic is a mission
               if (isMission(categoryItem.querySelector('[component="topic/header"] a').getAttribute('content') || categoryItem.querySelector('[component="topic/header"] a').textContent || '')) {

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
}());
