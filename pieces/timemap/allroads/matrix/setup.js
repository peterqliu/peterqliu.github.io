mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImNqdHE0cXByZDAzaWY0NHBldG9yd3Jld28ifQ.8dISItctShjFnmnVeAgW2A';
var map = new mapboxgl.Map({
    hash:true,
    container: 'map', 
    style: 'mapbox://styles/mapbox/dark-v9',
    center: [-74.50, 40],
    zoom: 9
});

var lines =[];

var currentThreshold = 600
for (var i =0; i<160; i++){
    lines.push(turf.lineString([[i,80], [i,-80]], {total:i+6}))
}


var colorRamp = {
    'property':'total',
    'type':'exponential',
    'stops':[[0,'yellow'], [currentThreshold, 'purple']]
}
map
    .on('load', function(){

        var blank = {
            'type':'geojson',
            'data': turf.featureCollection([])
        };
        map.addSource('progress',blank)
            .addSource('nearest',blank)
            .addSource('offsetdots', blank)
            .addSource('allcircles', blank)

        map
        .addLayer({
            'id':'tileedges',
            'type': 'line',
            'source': blank,
            'paint':{
                'line-width':0
            },
            'paint.debug':{
                'line-color': 'white',
                'line-offset':3,
                'line-width':1,
                'line-opacity':1
            },
            'layout':{
                'line-join': 'bevel',
                'line-cap': 'round'
            }
        })
        .addLayer({
            'id':'progressline',
            'type': 'line',
            'source':'progress',
            'paint':{
                'line-offset':8,
                'line-width':{
                    'base':1,
                    'stops':[[12,1], [22, 1]]
                },
                'line-color': colorRamp
            },
            'layout':{
                'line-join': 'bevel',
                'line-cap': 'round'
            }
        }, 'waterway-label')
        // .addLayer({
        //     'id':'progress arrows',
        //     'type': 'symbol',
        //     'source':'progress',
        //     'minzoom':14,
        //     'layout':{
        //         'text-field':'▶',
        //         'icon-image':'{total}',
        //         'symbol-placement':'line',
        //         'symbol-spacing':160,
        //         'text-keep-upright':false,
        //         'text-size':{
        //             'base':1,
        //             'stops':[[14,8], [22, 40]]
        //         },
        //         'text-allow-overlap':true,
        //         'text-ignore-placement':true
        //     },
        //     'paint':{
        //         'text-halo-color':colorRamp,
        //         'text-color':'#333',
        //         'text-halo-width':20,
        //         'text-opacity':{
        //             'property':'total',
        //             'type':'exponential',
        //             'stops':[[0,1], [9999999, 1]],
        //         }
        //     }
        // })
        // .addLayer({
        //     'id':'durations',
        //     'type': 'symbol',
        //     'source':'progress',
        //     'minzoom':16,
        //     'layout':{
        //         'text-field':'{total} >',
        //         'text-font':['Open Sans Bold', 'Arial Unicode MS Bold'],
        //         'symbol-placement':'line',
        //         'text-size':16,
        //         'text-keep-upright':false
        //     },
        //     'paint':{
        //         'text-color':colorRamp,
        //         'text-halo-color':'#333',
        //         'text-halo-width':3
        //     }
        // })
        // .addLayer({
        //     'id':'progressextrusion',
        //     'type': 'fill-extrusion',
        //     'source':'progress',
        //     'layout':{            
        //         'visibility':'none'
        //     },
        //     'paint':{
        //         'fill-extrusion-opacity-transition':{
        //             'duration':0
        //         },
        //         'fill-extrusion-color': colorRamp,
        //         'fill-extrusion-height':{
        //             'property':'total',
        //             'type':'exponential',
        //             'stops':[[0,5000], [currentThreshold, 10]]
        //         },
        //         'fill-extrusion-base':0
        //     }
        // })
        .addLayer({
            'id':'allcircles',
            'type': 'circle',
            'source': 'allcircles',
            'paint':{
                'circle-radius':3,
                'circle-color': {
                    'property':'elbow',
                    'type':'categorical',
                    'stops':[[true,'black'], [false, 'orange']]
                }
                // 'circle-color': {
                //     'property':'others',
                //     'type':'exponential',
                //     'stops':[[1,'black'], [2, 'orange']]
                // }

            }
        })
        // .addLayer({
        //     'id': 'debugelbow',
        //     'type': 'symbol',
        //     'source':'allcircles', 
        //     'paint':{
        //         'text-color':'white'
        //     },
        //     'layout':{
        //         'text-field':'{streets} {others}'
        //     }
        // })
        .addLayer({
            'id':'origin',
            'type': 'circle',
            'source':'nearest',
            'paint':{
                'circle-color':'red',
                'circle-radius':5
            }
        })
    })
    .on('pitch', function(e){
        map.setPaintProperty('progressextrusion', 'fill-extrusion-opacity', Math.min(1,map.getPitch()/40))
    })


//  TIMEMAP SETUP

var width = window.innerWidth/2,
    height = window.innerHeight,
    root;

var force = d3.layout.force()
    .linkStrength(1)
    .linkDistance(function(d,i){return d.target.delta/100})
    .charge(-1200)
    .gravity(0.05)
    .size([width, height])
    .on("tick", tick);

var svg = d3.select("#timemap")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.behavior.zoom().scaleExtent([1, 256]).on("zoom", zoom))
    .append("g")
    .append("g");


var link = svg.selectAll(".link"),
    node = svg.selectAll(".node");



function zoom() {
  //svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");

}




//iterative flattening function to avoid stack overflows
function iterativeFlatten(root) {
    var nodes = [], i = 0;
    var toRecurse = [root];

    function recurse() {
        var nextGen = []
        toRecurse.forEach(function(node){
            if (!node.id) node.id = ++i;
            nodes.push(node);

            if (node.children) nextGen = nextGen.concat(node.children);

        })

        toRecurse = nextGen
    }

    while (toRecurse.length>0) {
        recurse();
    }

    console.log(JSON.stringify(nodes))
    return nodes;
}
var json = 
{
   "name": "1",
   "delta": 4000,
   "fixed": true,
   "children": [
    {
     "name": "cluster",
        "delta": 1000,

     "children": [
      {"name": "1a", "delta": 10000},
      {"name": "1b", "delta": 1000},
      {"name": "1c", "delta": 1000},
     ]
    },
    {
     "name": "2",
        "delta": 1000,

     "children": [
      {"name": "2a", "delta": 1000},
      {"name": "2b", "delta": 1000},
     ]
    },
    {
     "name": "3",
        "delta": 1000,

     "children": [
      {"name": "3a", "delta": 1000}
     ]
    }
   ]
}



flattenedRoad = 
[{
    "fixed": true,
    "name": "start",
    "index": 5,
    "children": [{
        "name": "Frederick Douglass Boulevard",
        "index": 1,
        "delta": 100
    }],
}, {
    "name": "Frederick Douglass Boulevard",
    "delta": 100,
    "id": 1,
}]


// Returns a list of all nodes under the root.
function flatten(root) {
  var nodes = [], i = 0;

  function recurse(node) {
    if (node.children) node.children.forEach(recurse);
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }

  recurse(root);
  //nodes = JSON.parse(JSON.stringify(nodes))
  return nodes;
}

var test = {
    'name': 'Main St',
    'fixed': true,
    'delta': 0,
    'children':[
        {
            'name': 'spring st',
            'delta': 1000
        }
    ]
}





//flattenedJson = flatten(json)
flattenedJson = JSON.parse(JSON.stringify(flatten(json)))

//update(flattenedJson)



function update(nodes) {
    console.log(nodes)
    // graph.x = width/2
    // graph.y = height/2
    //flatten(json)

    //console.log(JSON.stringify(nodes))
    links = d3.layout.tree().links(nodes);
    console.log(links)
    // Restart the force layout
    force
      .nodes(nodes)
      .links(links)
      .start();

  // Update links
  link = link
    .data(links, function(d) { return d.target.id; });

  link
    .enter()
    .insert("line", ".node")
    .attr("class", "link");

  // Update nodes
  node = node.data(nodes, function(d) { return d.id; });

  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .call(force.drag);

    nodeEnter.append("circle")
        .attr("r", 5)
        .style("fill", function(d,i){
            var color = d.fixed ? 'orange' :'#abcdef'
            return color
        })

  nodeEnter.append("text")
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });
}

function tick() {

  //apply endpoint locations to link elements
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}



// var timemap = new mapboxgl.Map({
//     container: 'timemap', 
//     style: 'mapbox://styles/mapbox/dark-v9',
//     center: [0,0],
//     zoom: 22,
//     // dragPan: false,
//     // scrollZoom: false,
// });


// document.querySelector('#timemap canvas')
//     .addEventListener('mousewheel', function(e){
//         var z = timemap.getZoom()-e.deltaY/500
//         timemap.setZoom(z)
//     })

// timemap.on('load', function(){

//     timemap.addSource('branches',{
//             'type':'geojson',
//             'data': turf.featureCollection([])
//         })
//     timemap.addLayer({
//         'id': 'back',
//         'type':'background',
//         'paint':{
//             'background-color':'#333',
//             'background-opacity':0.9
//         }
//     })
//     .addLayer({
//         'id':'origin',
//         'type':'circle',
//         'source':{
//             'type':'geojson',
//             'data': turf.point([0,0])
//         },
//         'paint':{
//             'circle-color':'white'
//         }
//     })
//      .addLayer({
//         'id':'branchlines',
//         'type': 'line',
//         'source':'branches',        
//         'paint':{
//             'line-width':2,
//             'line-color': 'white',
//         },
//         'layout':{
//             'line-join': 'bevel',
//             'line-cap': 'round'
//         }
//     })
//     .addLayer({
//         'id':'label',
//         'type': 'symbol',
//         'source':'branches',
//         'layout':{
//             'text-field':'{name}',
//             'symbol-placement':'line',
//             'symbol-spacing':20,
//         },
//         'paint':{
//             'text-color':'white',
//             'text-halo-color':'#333',
//             'text-halo-width':3
//         }
//     })
// })
