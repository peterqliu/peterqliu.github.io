var util = {

	'token': 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g',
	
	defineMap: function(map){
		this.map = map
	},

	center: function(map){
		return [map.getCenter().lng, map.getCenter().lat]
	},

	makeGeojson: function(arr){


	},

	get: function(url,cb){

		fetch(url)
			.then(
				function(response) {

					if (response.status !== 200) {
						console.log('Looks like there was a problem. Status Code: ' + response.status);
						return;
					}

					// Examine the text in the response
					response.json().then(function(data) {
						cb(data);
					});
				}
			)		
	},

	directions: function(coords, mode, cb){

		var url = 'https://api.mapbox.com/directions/v5/mapbox/' + mode + '/' + coords.join(';') + '?continue_straight=false&steps=true&geometries=geojson&overview=full&access_token=' + this.token;

		this.get(url, cb)
	},

	matrix: function(coords, mode, cb){
		var url = 'https://api.mapbox.com/directions-matrix/v1/mapbox/'+ mode + '/' +coords.join(';')+'?&access_token=' + this.token
	
		this.get(url, cb)
	},

	addLine: function(id, data, properties){
		this.map.addLayer({
			'id': id,
			'type': 'line',
			'source': data, 
			'paint': properties
		})
	},

	sigmoid: function(start,end, resolution){
		var delta = {x: end[0] - start[0], y: end[1] - start[1]};
		var output = [];


		resolution = Math.max(delta.x/resolution,0.01)
		
		for (var dx = 0; Math.abs(dx)<=Math.abs(delta.x); dx+=resolution){

			var scaledProgress = dx/delta.x
			var dy = (1 - Math.cos(scaledProgress*Math.PI)) * delta.y/2
			output.push([start[0]+dx, start[1]+dy])

		}
		output[0][1] = Math.round(output[0][1])

		output[output.length-1][1] = Math.round(output[output.length-1][1])

		return output
	}

}