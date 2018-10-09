var fs = require('fs');

console.log('usin node!');

fs.readFile('worldstarbucks.json', encoding='utf8', function (err, data) {
  if (err) throw err;
  var output=JSON.parse(data).data;
  //[[lat,lng],phone, street, city, subcountry, country]
	var geojson= {
		"type": "FeatureCollection",
		"features": []
	};
  geojson.features= output.map(function(entry){
  	if (entry[23] && entry[24]) {
	  	return {
	    	"type": "Feature",
	    	"properties": {
	    		"phone": entry[12][0],
	    		"street": entry[15],
	    		"city": entry[18],
	    		"subcountry": entry[19],
	    		"country":entry[20]
	    	},
	      "geometry": {
	        "type": "Point",
	        "coordinates": [parseFloat(entry[24]), parseFloat(entry[23])]
	      }
	    }
	}
  })
  geojson.features=geojson.features.filter(function(elem){return elem != null})
fs.writeFileSync('test.geojson', JSON.stringify(geojson))
});