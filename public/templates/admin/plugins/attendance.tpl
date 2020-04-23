<h1><i class="fa {faIcon}"></i> {name}</h1>

<form role="form" class="{nbbId}-settings">
	<fieldset>
		<!-- BEGIN groups -->
		<div class="row">
			<div class="col-sm-6">
				<div class="form-group">
					<label for="categories-r-{groups.groupName}">readable event categories for {groups.groupName}</label>
					<input title="comma separated category IDs" placeholder="comma separated list of event category IDs" type="text" class="form-control"
						   id="categories-r-{groups.groupName}"
						   name="categories-r-{groups.groupName}"
						   value="{groups.r}"
					/>

				</div>
			</div>

			<div class="col-sm-6">
				<div class="form-group">
					<label for="categories-w-{groups.groupName}">attendable event categories for {groups.groupName}</label>
					<input title="comma separated category IDs" placeholder="comma separated list of event category IDs" type="text" class="form-control"
						   id="categories-w-{groups.groupName}"
						   name="categories-w-{groups.groupName}"
						   value="{groups.w}"
					/>
				</div>
			</div>
		</div>
		<!-- END groups -->
	</fieldset>
	<hr />
	<fieldset>
		<div class="row">
			<div class="col-sm-6">
				Events title
			</div>
			<div class="col-sm-6">
				<input title="'all events' title (if you put anything here, this string will be used for the /events link)" placeholder="events link title"
					   type="text"
					   class="form-control"
					   id="events-title"
					   name="events-title"
					   value="{eventsTitle}"
				/>
			</div>
		</div>
	</fieldset>

	<button class="btn btn-lg btn-primary" id="save" type="button">Save</button>

</form>

<script type="text/javascript">
	require(['settings'], function(settings) {
		const nbbId = '{nbbId}';
		const klass = nbbId + '-settings';
		const wrapper = $('.' + klass);

		wrapper.find('#save').on('click', function(e) {
			e.preventDefault();
			settings.save(nbbId, wrapper, function() {
				socket.emit('admin.restart');
			});
		});
	});
</script>
