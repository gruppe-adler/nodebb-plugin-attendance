# nodebb-plugin-attendance
plugin which adds ability to show whether you attend a event by a single mouse click


## API

the following endpoints are added:

### GET /api/attendance/:tid 

ex. 

	wget --progress=dot --save-headers -O - http://localhost:4567/api/attendance/1
	
### POST /api/attendance/:tid

body:

	{
		"type": commitment|firm_commitment|canceled
	}
	

ex.

	wget --progress=dot --method=POST --header="Content-Type:application/json" --body-data='{"type":"commitment"}' --save-headers  -O - "http://localhost:4567/api/attendance/1"