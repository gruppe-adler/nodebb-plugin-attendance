<div class="tag">
	<div class="clearfix">
		<div class="pull-left">
			<ul class="nav nav-pills">
				<li class=""><a href="/events" id="events_all" class="btn">Alle Einsätze</a></li>
				<li class=""><a href="/events/cid-3" id="events_general" class="btn">Unsere Einsätze</a></li>
				<li class=""><a href="/events/cid-20" id="events_intern" class="btn">Interne Einsätze</a></li>
				<li class=""><a href="/events/cid-27" id="events_extern" class="btn">Einladungen anderer Gruppen</a></li>
			</ul>
		</div>

		<div class="pull-right">
			<!-- IF loggedIn -->
			<button component="category/post" id="new_topic" class="btn btn-primary">[[category:new_topic_button]]</button>
			<!-- ELSE -->
			<a component="category/post/guest" href="{config.relative_path}/login" class="btn btn-primary">[[category:guest-login-post]]</a>
			<!-- ENDIF loggedIn -->
		</div>
	</div>

	<hr class="hidden-xs"/>

	<!-- IF !topics.length -->
	<div class="alert alert-warning">[[tags:no_tag_topics]]</div>
	<!-- ENDIF !topics.length -->

	<div class="category">
		<!-- IMPORT partials/topics_list.tpl -->
		<button id="load-more-btn" class="btn btn-primary hide">[[unread:load_more]]</button>
		<!-- IF config.usePagination -->
		<!-- IMPORT partials/paginator.tpl -->
		<!-- ENDIF config.usePagination -->
	</div>
</div>
