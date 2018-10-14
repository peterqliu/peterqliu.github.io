var fs = require('fs');
var request = require('request');

console.log('usin node!');

fs.readFile('randompoints.json', encoding='utf8', function (err, data) {
  if (err) throw err;
  var points=JSON.parse(data);
	var jsonoutput= [];
	for (var i=0; i<points.features.length; i++){

		var n=points.features[i];
		var coord= n.geometry.coordinates;
		var queryURL='http://api.tiles.mapbox.com/v4/geocode/mapbox.places/'+coord+'.json?access_token=pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g'
		request(queryURL, function (error, response, body) {
			if (error) {console.log(queryURL)};
			if (!error && response.statusCode == 200) {
		    	console.log([JSON.parse(body).features[0]['text']])
		    	jsonoutput.push([JSON.parse(body).features[0]['address']+' '+JSON.parse(body).features[0]['text'],JSON.parse(body).features[0]['place_name']]);
		    	fs.writeFileSync('addresses.json', JSON.stringify(jsonoutput))
		  	}
		})
	}
});

