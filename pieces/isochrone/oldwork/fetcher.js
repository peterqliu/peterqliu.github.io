var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var xhr = require('xhr');
var zlib = require('zlib');
var cover = require('tile-cover');


// given the isochrone polygon, identify the relevant tiles (via tile-cover), request those tile pbfs, translate into geoJSONs of block data as polygons, and return one geoJSON with all the block data
function getBlocks(polygon, time){
	var limits = {
	    min_zoom: 10,
	    max_zoom: 14
	  }

	// identify tiles
	var tilesCovered = cover.tiles(polygon.geometry, limits)


	var geojson={"type":"FeatureCollection","features":[]};
	var queryCount = 0;

	//for each tile, download corresponding PBF and convert to geoJSON
	tilesCovered.forEach(function(zoompos){
		var queryURL='https://a.tiles.mapbox.com/v4/enf.i4lvj9k9/'+zoompos[2]+'/'+zoompos[0]+'/'+zoompos[1]+'.vector.pbf?access_token='+L.mapbox.accessToken;
		xhr({uri:queryURL,responseType:'arraybuffer'}, function (error, response, buffer) {
			queryCount++
			if (response.statusCode===404) {console.log('404 detected');return}
			if (error) {
				alert(error)
				return
			};

		    var tile = new VectorTile(new Pbf(buffer));
			//populate geoJSON
			for (var i=0; i<tile.layers.population.length; i++){
				//convert each feature (within #population) into a geoJSON polygon, and push it into our variable
				var feature = tile.layers.population.feature(i).toGeoJSON(zoompos[0], zoompos[1], zoompos[2]);
				geojson.features.push(feature);
			}

			if(queryCount===tilesCovered.length) {
				calculateOverlap(polygon, geojson)
			}
		})
	})
}

function calculateOverlap(polygon, geojson){
	var totalPopulation = 0
	var mergedBlocks = turf.featurecollection([]);
	geojson.features.forEach(function(feature){
		try {
			var intersect = turf.intersect(polygon, feature)
			console.log(intersect)
			if (typeof intersect==='object') {
				var overlapArea = turf.area(feature)
				totalPopulation+=(overlapArea * feature.properties.density)
				mergedBlocks.features.push(intersect)
			}
		}
		catch(err){console.log('skipped invalid geometry');return}
	})
	mergedBlocks = turf.merge(mergedBlocks)
	L.mapbox.featureLayer().setGeoJSON(mergedBlocks).addTo(map)
	$('#population').show();
	$('#number').text(numberWithCommas(totalPopulation.toFixed(0)))
	//console.log(totalPopulation+' people within a '+time+'-minute drive')
}

//HELPER FUNCTIONS
function numberWithCommas(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}

function reverseCoords(coords) {return [coords[1],coords[0]]}

function getMin(array){
	return Math.min.apply(null,Object.keys(array))
}

function getMax(array){
	return Math.max.apply(null,Object.keys(array))
}
L.mapbox.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g';

var colorScheme = ["#F221E0", "#DA2AD5", "#C22FC9", "#AC31BD", "#9632B0", "#8231A2", "#6E2F94", "#5C2C86", "#4B2877", "#3B2368", "#2C1E59", "#1F194A"]
var altColor = ['#6c054c','#a04a9a','#9b81bd','#5d64b1','#a7d8f5','#a1e2c0','#d2dc20', '#e09d00','#e86300','#e91800','#910003'].reverse();


var threshold = [2];
var isochrones = [];
var origin =[37.7307,-122.426];
var map = L.mapbox.map('map', 'mapbox.light') //
    .setView(origin, 14);
var hash = L.hash(map);
var marker= L.marker(origin, {draggable:true})
	.addTo(map);
marker.on('dragend',function(){
	var startLocation = marker.getLatLng()
	buildIsochrones([startLocation.lat, startLocation.lng])
});
buildIsochrones(origin)







//iterate through all the grid points

function buildIsochrones(startingPosition) {

	//clear the existing stuff
	$('path').remove()
	$('.css-icon').remove()
	$('#population').hide();
	$('.loader').toggleClass('hidden')

	threshold.forEach(function(cutoff, thresholdIndex){

		//build the pointSet grid
		var radius = Math.pow(cutoff,1.4)
		var gridDistance = Math.pow(cutoff,0.5)* 0.05;
		var southWest = turf.destination(turf.point(reverseCoords(startingPosition)), radius, 225, 'kilometers')
		var northEast = turf.destination(turf.point(reverseCoords(startingPosition)), radius, 45, 'kilometers')

		var minMaxBounds = [southWest.geometry.coordinates[0],southWest.geometry.coordinates[1],
		northEast.geometry.coordinates[0],northEast.geometry.coordinates[1]]

		var pointSet = turf.pointGrid(minMaxBounds, gridDistance, 'kilometers')

		console.log('about to batch ('+pointSet.features.length+' points)')

		batchRequests(reverseCoords(startingPosition),pointSet.features.map(
			function(point){
				return point.geometry.coordinates
			}
		))




		var arrCols = {}
		var arrRows = {}

		pointSet.features.forEach(function(pt){
		  arrCols[pt.geometry.coordinates[0]] = true
		  arrRows[pt.geometry.coordinates[1]] = true
		})

		var colRange= [getMin(arrCols),getMax(arrCols)];
		var rowRange= [getMin(arrRows),getMax(arrRows)];

		var arrCols = Object.keys(arrCols).length
		var arrRows = Object.keys(arrRows).length

		var durations= [];
		for (var i=0;i<pointSet.features.length;i++) durations.push('blank');

		//batch up to 99 queries into one HTTP call
		function batchRequests(origin, destinations) {
			//divide destinations into groups of 99
			for (var k=0; k<destinations.length; k+=99){
				var batchEnd = Math.min(k+99, destinations.length)

				fireBatch(
					origin,
					destinations.slice(k, batchEnd),
					k
				)


			}

			//fire query for 99 points from origin, and also feed in the batchIndex so we know where to insert into the overall set
			function fireBatch(origin, partialDestinations, batchIndex){
				partialDestinations.unshift(origin)
				//console.log(partialDestinations)
				var queryURL = 'https://api.mapbox.com/distances/v1/mapbox/driving?access_token=pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g'

			    $.ajax({
			        type: "POST",
			        url: queryURL,
			        processData: false,
			        contentType: "application/json",
			        data: JSON.stringify({ coordinates: partialDestinations}),
			        success: function(err, response, data){
			        	var data = JSON.parse(data['responseText'])['durations'][0]
			        	//console.log('starting at '+batchIndex+' '+ JSON.stringify(data))
			        	for (var i=1; i<data.length; i++){
			        		durations[batchIndex+i-1] = data[i]
			        	}
					    if (durations.indexOf('blank')===-1) marchingSquares(cutoff)
			        }
			    });
			}
		}


		//build a series of convex hulls around each  pointSet point, and then merge them into one large polygon
		function marchingSquares(time) {
			console.log('startmarch')
			var startMarch = Date.now()

			//draw labels for each point in pointSet (optional)

			pointSet.features.forEach(function(point, number){
				var coord= reverseCoords(point.geometry.coordinates)
			    var textColor = durations[number]>threshold[0]*60 ? 'gray' : 'steelblue'

			    var number= L.divIcon({
			      className: 'css-icon',
			      iconSize: [10, 10],
			      html:'<div style="color:'+textColor+'">'+durations[number]+'</div>'
			    });

				L.marker(coord,{icon:number}).addTo(map)
			})

			//for each duration figure...
		  	durations.forEach(function(point, currentIndex) {

		  		//identify positions above, right, and above-right of it in a 2x2 square
		        var indexAbove = currentIndex + 1
		        var indexRight = currentIndex + arrRows
		        var indexAboveRight = currentIndex + arrRows + 1


		        //for each point, prepare a space to store vertices of the convex hull around it
		    	pointSet.features[currentIndex].properties.convexPoints = [];
		    	//except the top row of points, check it with the point directly north of it
		    	if (currentIndex%arrRows<arrRows-1) checkPair(currentIndex, indexAbove, cutoff*60)

		    	//except the last column of points, check it with the point directly east of it
		    	if (currentIndex<arrRows*(arrCols-1)) checkPair(currentIndex, indexRight, cutoff*60)

		    	//...and for each cutoff, if 
		        var quartet = [currentIndex,indexAbove,indexAboveRight,indexRight]
		        quartet.forEach(
		        	function(number){
			        	if (durations[number]<=cutoff*60) {
			        		pointSet.features[currentIndex].properties.convexPoints
			        			.push(pointSet.features[number])
			        	}
		        	}
		        )

		        //given a pair of grid point indices and a threshold cutoff, 1) determines whether the cutoff happens between these points, and if so, 2) locates that point
		        function checkPair(referentIndex, indexToCompare, cutoff){

		        	//if the two points straddle the cutoff (one is above and other is below), interpolate.
		        	if (durations[referentIndex]<cutoff !== durations[indexToCompare]<cutoff) {
			            function coordInterpolator(coord1, coord2, val1, val2, cutoff) {

			            	var weightedAverage = (cutoff-val1)/(val2-val1)

			            	var interpolatedPoint = [weightedAverage*Math.abs(coord2[0]-coord1[0])+Math.min(coord1[0], coord2[0]),
			                      weightedAverage*Math.abs(coord2[1]-coord1[1])+Math.min(coord1[1], coord2[1])]

			                //push to the geoJSON
			                pointSet.features[currentIndex].properties.convexPoints
			                	.push(turf.point(interpolatedPoint))

			                //starting at the second column, push our indexAbove value to the point directly west of reference, since they share that edge
				            if (indexToCompare === indexAbove && currentIndex>arrRows){
				            	pointSet.features[currentIndex-arrRows].properties.convexPoints
				            	.push(turf.point(interpolatedPoint))
				            }

			                //if this value isn't on the bottommost row, push our indexRight value to the point directly south of reference, since they share that edge
				            if (indexToCompare === indexRight && currentIndex%arrRows>0){
				            	pointSet.features[currentIndex-1].properties.convexPoints
				            	.push(turf.point(interpolatedPoint))
				            }

				            return interpolatedPoint
			            }

			            var location = coordInterpolator(
				            pointSet.features[currentIndex].geometry.coordinates,
				            pointSet.features[indexToCompare].geometry.coordinates,
				            durations[referentIndex],
				            durations[indexToCompare],
				            cutoff)

			            //L.marker(reverseCoords(location)).addTo(map)
		          	}
		        }

		  	})

			//draw convex hulls for all points, merge hulls, draw resultant polygon

		    var mergedPolygon = turf.featurecollection([]);

		    pointSet.features.forEach(function(point, index){
		        if (point.properties.convexPoints.length>2){
		        	convexPoints = turf.featurecollection(point.properties.convexPoints)
		        	mergedPolygon.features.push(turf.convex(convexPoints))
		        	L.mapbox.featureLayer().setGeoJSON(turf.convex(convexPoints)).addTo(map)

		        }
		    })
		    //console.log(mergedPolygon)
		    //L.mapbox.featureLayer().setGeoJSON(turf.merge(mergedPolygon)).addTo(map)

		    //getBlocks(turf.merge(mergedPolygon), time)
		}

	})
			$('.loader').toggleClass('hidden')

}