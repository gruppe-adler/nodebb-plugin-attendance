<h1><i class="fa {faIcon}"></i> {name}</h1>

<form role="form" class="{nbbId}-settings">
	<fieldset>
		<!-- BEGIN groups -->
		<div class="row">
			<div class="col-sm-6">
				<div class="form-group">
					<label for="categories-r-@value">readable events for @value</label>
					<input title="comma separated category IDs" placeholder="" type="text" class="form-control"
						   id="categories-r-@value"
						   name="categories-r-@value" />
				</div>
			</div>

			<div class="col-sm-6">
				<div class="form-group">
					<label for="categories-w-@value">attendable events for @value</label>
					<input title="comma separated category IDs" placeholder="" type="text" class="form-control"
						   id="categories-w-@value"
						   name="categories-w-@value" />
				</div>
			</div>
		</div>
		<!-- END groups -->
		<hr />
		<button class="btn btn-lg btn-primary" id="save" type="button">Save</button>
	</fieldset>
</form>

<script type="text/javascript">
    require(['settings'], function(Settings) {
        const nbbId = 'attendance';
        const klass = nbbId + '-settings';
        const wrapper = $('.' + klass);

        Settings.load(nbbId, wrapper);

        wrapper.find('#save').on('click', function(e) {
            e.preventDefault();
            Settings.save(nbbId, wrapper, function() {
                socket.emit('admin.restart');
            });
        });
    });
</script>
