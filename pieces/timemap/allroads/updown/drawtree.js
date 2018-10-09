var ruler = cheapRuler(0, 'meters');


var testTree = {
	a:{
		b:{
			name: 'a-b',
			delta: 10
		},
		c:{
			name: 'a-c',
			delta: 30	
		}
	},
	b:{
		d:{
			name: 'b-d',
			delta: 5
		},
		e:{
			name: 'b-e',
			delta: 7	
		}
	}
}



function stepLevels(){

	var count = 0;
    state.levels[0] = state.trickleDown[state.origin].children;

	for (var s = state.levels.length-1; s>=0; s--){
		console.log(s)
		stepUp(state.levels[s])
	}

	//stepUp(state.trickleDown[state.origin].children)
	function stepUp(level){

		//iterate through edges of this level
		level.forEach(function(edge){

			var edgeAttributes = state.trickleDown[edge];
			var children = edgeAttributes.children;
			//console.log('bar', children)

			// no children means dead end
			if (children.length === 0){
				state.graph[edge] = {
					thetaEnd: count,
					start: edgeAttributes.total-edgeAttributes.delta,
					total: edgeAttributes.total,
					name: edgeAttributes.name
				};
				count++
			}
 
			else {
				var averagedPosition = average(children.map(function(child){
					return state.graph[child].thetaEnd
				}))
				state.graph[edge] = {
					thetaEnd: averagedPosition,
					start: edgeAttributes.total-edgeAttributes.delta,
					total: edgeAttributes.total,
					name: edgeAttributes.name
				};

				//record segments for children
				children.forEach(function(child){

					var obj = state.graph[child];

					obj.thetaStart = averagedPosition
					state.tree.push(obj)
				})
			}

		})

	};

	console.log('LASTTT');

	state.trickleDown[state.origin].children.forEach(function(edge){
		state.graph[edge].thetaStart = 0
		state.tree.push(state.graph[edge])
	})
	drawTree();
}

function drawTree(){
	var anglePerUnit = 360/state.count;
	var guides = [];
	
	var geojson = turf.featureCollection([])
	for (var s = 0; s < state.count; s++){
		var destination = ruler.destination([0,0], 10000, s*anglePerUnit)
		guides.push(turf.lineString([[0,0], destination]))
	}

	timemap
		.getSource('guidelines')
		.setData(turf.featureCollection(guides))

	var total = 0;

	var dots = [];

	state.tree.forEach(function(segment){
		var end = ruler.destination([0,0], segment.total*10, segment.thetaEnd*anglePerUnit)
		var start = ruler.destination([0,0], segment.start*10, segment.thetaStart*anglePerUnit)
		geojson.features.push(turf.lineString([start, end], segment))
	})

	timemap.getSource('branches').setData(geojson)
}

// // bottom-up traversal of tree to determine optimal placement (derived from Reingold-Tilford theorem)
// function crawler(){
// 	// get the list of terminals sorted by level
// 	var terminalLevels = state.terminals;
// 	var levelNumbers = listOutKeys(terminalLevels).reverse();

// 	var nextParents = {};
// 	var count = 0;
// 	//trickling bottom-up from the lowest level
// 	levelNumbers.forEach(function(num){
// 		var currentLevel = terminalLevels[num];

// 		//iterate through terminals in this level
// 		for (c in currentLevel){
// 			var child = currentLevel[c];
// 			var parent = JSON.stringify(getParent(currentLevel[c])).replace(/[\[\]']+/g,'');

// 			state.graph[child] = count;
// 			count++

// 			nextParents[parent] = true
// 		}


// 	})
// 	state.count = count;
// 	state.graph[state.origin] = count;

// 	for (var p=0; p<99; p++){
// 		console.log('PLACE', p)
// 		placeParents();
// 	};
// 	console.log(listOutKeys(nextParents).map(function(segment){
// 		return state.trickleUp[segment]
// 	}))
// 	function placeParents(){
// 		nextParents = listOutKeys(nextParents)
// 		//console.log('parents are', nextParents)
// 		var hopper = {};

// 		//iterate through parents
// 		nextParents.forEach(function(parent){

// 			// identify all children of this parent
// 			var children = state.trickleDown[parent].children
// 			//console.log('children of this parent are ', children)

// 			//identify positions of all children of this parent
// 			var childPositions = children.map(function(child){
// 				return state.graph[child]
// 			})


// 			//console.log('childpositions of this parent are ', childPositions)

// 			//if we have all child positions, place parent as average of all child positions. add parent's parent to queue for next round
// 			if (!childPositions.includes(undefined)) {
// 				//console.log('parent average is ', average(childPositions))
// 				state.graph[parent] = average(childPositions)
// 				hopper[getParent(parent)] = true;
// 			}
// 			else {
// 				// console.log(parent, 'includes an undefined')
// 				hopper[parent] = true
// 			}
// 		})

// 		nextParents = hopper
// 	}


// 	// map.addLayer({
// 	// 	'id': 'debuglines',
// 	// 	'type':'line',
// 	// 	'source':{
// 	// 		'type':'geojson',
// 	// 		'data': turf.featureCollection(
// 	// 			listOutKeys(state.graph).map(function(string){
// 	// 				var arr = string.split(',')
// 	// 				var coords = [[arr[0], arr[1]], [arr[2], arr[3]]]
// 	// 				return turf.lineString(coords)
// 	// 			})
// 	// 		)
// 	// 	},
// 	// 		paint:{
// 	// 			'line-color': 'blue', 
// 	// 			'line-width': 5
// 	// 		}
// 	// })

// 	insideOut();
// }

// function insideOut(){

// 	var anglePerUnit = 360/state.count;
// 	var guides = [];
	
// 	for (var s = 0; s < state.count; s++){
// 		var destination = ruler.destination([0,0], 10000, s*anglePerUnit)
// 		guides.push(turf.lineString([[0,0], destination]))
// 	}

// 	timemap
// 		.getSource('guidelines')
// 		.setData(turf.featureCollection(guides))

// 	var total = 0;

// 	var dots = [];

// 	var currentParents = state.trickleDown[state.origin].children;

// 	for( var j = 0; j<10; j++){

// 		var nextParents = [];
// 		currentParents.forEach(function(parent){



// 			var newChildren = state.trickleDown[parent].children;
// 			newChildren.forEach(function(newKid){
// 				//console.log(state.graph[parent], state.graph[newKid])
// 				nextParents.push(newKid)
// 			})
// 		})
// 		//console.log(JSON.stringify(nextParents))
// 		currentParents = nextParents
// 	}

// }
// function outsideIn(){

// 	var anglePerUnit = 360/state.count;
// 	var guides = [];
	
// 	for (var s = 0; s < state.count; s++){
// 		var destination = ruler.destination([0,0], 10000, s*anglePerUnit)
// 		guides.push(turf.lineString([[0,0], destination]))
// 	}

// 	console.log(guides)
// 	timemap
// 		.getSource('guidelines')
// 		.setData(turf.featureCollection(guides))

// 	var total = 0;

// 	var dots = [];


// 	listOutKeys(state.graph).forEach(function(child){

// 		var magnitude = state.trickleDown[child].total
// 		var destination = ruler.destination([0,0], magnitude*10, state.graph[child]*anglePerUnit)
// 		dots.push(turf.point(destination))

// 	})
// 	console.log(dots)
// 	timemap.getSource('branches')
// 		.setData(turf.featureCollection(dots))
// 	console.log(total, state.count)
// }

// function drawLinearGraph(){

// 	var accumulator = 0;

// 	var parents = [{segment: state.origin, duration:0, offset:0}];
// 	//console.log(state.trickleDown[state.origin].children, currentEdges)
// 	var currentLevel = 0;
// 	var increment = {x:0.05, y:0.01}





// 	function goDown(){

// 		var newLevel = [];
// 		//iterate through each new branch

// 		parents.forEach(function(parent){

// 			var parentWidth = state.tree[parent.segment]|| 2;
// 			if (!parentWidth) console.log('no parent width', parent.segment)
// 			var parentDuration = state.trickleDown[parent.segment].total;
// 			var children = state.trickleDown[parent.segment].children;

// 			accumulator = parent.offset - parentWidth/2;

// 			children.forEach(function(child){


// 				var childWidth = state.tree[child] || 1;
// 				var childOffset = 0.5 * childWidth + accumulator;
// 				console.log('child w '+ childWidth+', offset '+childOffset+' accumulator '+ accumulator)


// 				var childDuration = state.trickleDown[child].total

// 				var forNext = {
// 					segment: child,
// 					offset: childOffset,
// 					duration: childDuration	
// 				};

// 				newLevel.push(forNext)

// 				var line = {
// 					geometry: [[parent.offset, parentDuration], [childOffset, childDuration]],
// 					total: childDuration,
// 					width: childWidth,
// 					name: state.trickleDown[child].name
// 				}

// 				state.graph.push(line);

// 				accumulator+= childWidth

// 			})
// 		})

// 		parents = newLevel;
// 		currentLevel++

// 	}

// 	while (parents.length>0){
// 		goDown();
// 	}

// 	var geojson = turf.featureCollection(
// 		state.graph.map(function(line){

// 			geom = line.geometry.map(function(pt){
// 				return [pt[0]*increment.x, -pt[1]*increment.y]
// 			})
// 			return turf.lineString(geom, {total: line.total, width:line.width, name: line.name})
// 		})
// 	)

// 	timemap.getSource('branches')
// 		.setData(geojson)
// }

// function drawRadialGraph(){

// 	var accumulator = 0;

// 	var parents = [
// 		{
// 			segment: state.origin, 
// 			position:[0,0],
// 			duration:0, 
// 			bearing:0
// 		}
// 	];

// 	var anglePerUnit = 360/state.tree[state.origin];
// 	var guides = [];
	
// 	for (var s=0; s<state.tree[state.origin]; s++){
// 		var destination = ruler.destination([0,0], 10000, s*anglePerUnit)
// 		guides.push(turf.lineString([[0,0], destination]))
// 	}

// 	timemap
// 		.getSource('guidelines')
// 		.setData(turf.featureCollection(guides))
// 	var currentLevel = 0;
// 	var increment = {x:0.05, y:0.01}





// 	function goDown(){

// 		var newLevel = [];
// 		//iterate through each new branch

// 		parents.forEach(function(parent){

// 			var parentWidth = state.tree[parent.segment]|| 2;
// 			if (!parentWidth) console.log('no parent width', parent.segment)
			
// 			var parentDuration = state.trickleDown[parent.segment].total;
// 			var children = state.trickleDown[parent.segment].children;

// 			accumulator = parent.bearing - parentWidth/2;

// 			children.forEach(function(child){

// 				var childWidth = state.tree[child] || 1;
// 				var childOffset = 0.5 * childWidth + accumulator;
// 				//console.log('child w '+ childWidth+', offset '+childOffset+' accumulator '+ accumulator)


// 				var childDuration = state.trickleDown[child].total

// 				var newLine = drawBranch(
// 					parent.position, 
// 					childOffset * anglePerUnit, 
// 					{
// 						total: childDuration,
// 						width: childWidth,
// 						delta: state.trickleDown[child].delta,
// 						name: state.trickleDown[child].name
// 					}
// 				);

// 				var forNext = {
// 					segment: child,
// 					position:newLine.geometry.coordinates[1],
// 					duration: childDuration, 
// 					bearing: childOffset
// 				};

// 				newLevel.push(forNext)
// 				state.graph.push(newLine);

// 				accumulator+= childWidth

// 			})
// 		})

// 		parents = newLevel;
// 		currentLevel++

// 	}

// 	goDown();
// 	while (parents.length>0){
// 		goDown();
// 	}

// 	// var geojson = turf.featureCollection(
// 	// 	state.graph.map(function(line){

// 	// 		geom = line.geometry.map(function(pt){
// 	// 			return [pt[0]*increment.x, -pt[1]*increment.y]
// 	// 		})
// 	// 		return turf.lineString(geom, {total: line.total, width:line.width, name: line.name})
// 	// 	})
// 	// )

// 	timemap.getSource('branches')
// 		.setData(turf.featureCollection(state.graph))
// }


function getAggregateDescendantWidth(segment){
	var childrenWidths = state.trickleDown[segment].children.map(function(child){
		return state.tree[child] || 1
	});

	var total = childrenWidths.reduce(function(sum, value) {
  		return sum + value;
	}, 0);


	return Math.max(total, 1)
};

function getParent(segment){
	return state.trickleUp[segment];
}
function getSiblings(segment){
	var parent = getParent(segment);
	return state.trickleDown[parent].children
}

function looper(i){
	for (var j=0; j<i; j++){
		console.log(j)
		stepTree(treeState.nextStep)
	}
	console.log(geojson)
	timemap.getSource('branches')
		.setData(geojson)	
}
// while (!treeState.done){
// 	stepTree(treeState.nextStep)
// }

// timemap.getSource('branches')
// 	.setData(geojson)

function stepTree(nextStep){
	treeState.done = true;
	treeState.nextStep = [];
	
	nextStep.forEach(function(step){
		placeBranches(step)
	})

};

function placeBranches(step){

	var branchList = listOutKeys(step.obj);
	var branches = objectToArray(step.obj);
	var anglePerBranch = branchList.length === 1 ? 0 : 0.5*step.allotted/branches.length;

	branches.forEach(function(d,i){
		var newAngle = step.startAngle + (i-0.5)*anglePerBranch;
		var newBranch = drawBranch(step.origin, newAngle, d);
		geojson.features.push(newBranch);

		if (state.tree[branchList[i]]) {
			treeState.done = false;
			treeState.nextStep.push({
				obj: state.tree[branchList[i]],
				origin: newBranch.geometry.coordinates[1],
				startAngle: newAngle,
				allotted: branchList.length === 1 ? 180 : anglePerBranch
			})
		}


	})
}

// takes a starting point, bearing, and branch cost, and returns a linestring 
function drawBranch(start, bearing, props){
	var destination = ruler.destination(start, props.delta, bearing);
	return turf.lineString([start, destination], props)
}

function objectToArray(obj){
    var keys = listOutKeys(obj)

    return keys.map(function(key){
        return obj[key]
    })
}

function listOutKeys(obj){
	return Object.keys(obj)
}

function average(array){
	return array.reduce(function (p, c) {
    	return p + c;
  	}) / array.length;
}
//takes an object of key-number pairs, and turns it into a new object where the numbers are now keys, and each numerical key has a value of the array of original keys that had that numerical value
function invertObject(obj){
	var output = {}
	listOutKeys(obj).forEach(function(key){
		var numericalKey = obj[key]
		if (!output[numericalKey]) output[numericalKey] = [];
		output[numericalKey].push(key)
	})
	return output
}