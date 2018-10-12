
window.state = {
  buoySize:10,
  inspectorLookup:{},
  ruler: ruler(37.76, 'meters'),
  buoys: [
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.51685976982115,
           37.76780576567041
         ]
       }
     },
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.51710653305052,
           37.77142712256029
         ]
       }
     },
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.5181794166565,
           37.7756843223483
         ]
       }
     },
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.51871585845946,
           37.782586910155075
         ]
       }
     },
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.44691848754883,
           37.80858030567975
         ]
       }
     },
     {
       "type": "Feature",
       "properties": {},
       "geometry": {
         "type": "Point",
         "coordinates": [
           -122.4754,
           37.8099026214036
         ]
       }
     }
  ],
  competitors: [{
    "bib": 1,
    "first_name": "Kai",
    "last_name": "Lenny",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFQ45347",
    "finish": 5444,
    "final_position": 7
  },
  {
    "bib": 2,
    "first_name": "Mo",
    "last_name": "Freitas",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFC20686",
    "finish": 5780,
    "final_position": 9
  },
  {
    "bib": 3,
    "first_name": "Connor",
    "last_name": "Baxter",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFS39192",
    "finish": 5587,
    "final_position": 8
  },
  {
    "bib": 4,
    "first_name": "Casper",
    "last_name": "Steinfath",
    "category": "APP World Tour",
    "nationality": "Denmark",
    "Qollector ID": "AFS27098",
    "finish": 4501,
    "final_position": 1
  },
  // {
  //   "bib": 5,
  //   "first_name": "Arthur",
  //   "last_name": "Arutkin",
  //   "category": "APP World Tour",
  //   "nationality": "France",
  //   "Qollector ID": "AFQ23019",
  //   "finish": 9999,
  //   "final_position": 99
  // },
  {
    "bib": 6,
    "first_name": "Michael",
    "last_name": "Booth",
    "category": "APP World Tour",
    "nationality": "Australia",
    "Qollector ID": "AFQ22194",
    "finish": 5267,
    "final_position": 5
  },
  {
    "bib": 7,
    "first_name": "Ryan",
    "last_name": "Funk",
    "category": "APP World Tour",
    "nationality": "USA",
    "Qollector ID": "AFS52755",
    "finish": 4560,
    "final_position": 2
  },
  {
    "bib": 8,
    "first_name": "Travis",
    "last_name": "Grant",
    "category": "APP World Tour",
    "nationality": "Australia",
    "Qollector ID": "AFQ31123",
    "finish": 4718,
    "final_position": 3
  },
  {
    "bib": 9,
    "first_name": "Zane",
    "last_name": "Schweitzer",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFQ29877",
    "finish": 5962,
    "final_position": 10
  },
  {
    "bib": 10,
    "first_name": "Slater",
    "last_name": "Trout",
    "category": "APP World Tour",
    "nationality": "USA",
    "Qollector ID": "AFS26102",
    "finish": 5315,
    "final_position": 6
  },
  //{"bib":11,"first_name":"Leonard","last_name":"Nika","category":"APP World Tour","nationality":"Italy","Qollector ID":"AFQ40920"},
  {
    "bib": 12,
    "first_name": "Martin",
    "last_name": "Vitry",
    "category": "APP World Tour",
    "nationality": "France",
    "Qollector ID": "AFQ47746",
    "finish": 6099,
    "final_position": 11
  },
  //{"bib":13,"first_name":"Josh","last_name":"Riccio","category":"APP World Tour","nationality":"USA","Qollector ID":"AFS30089"},
  //{"bib":14,"first_name":"Chuck","last_name":"Glynn","category":"APP World Tour","nationality":"USA","Qollector ID":"AFQ15670"},
  {
    "bib": 15,
    "first_name": "Kody",
    "last_name": "Kerbox",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFQ62198",
    "finish": 5056,
    "final_position": 4
  },
  {
    "bib": 16,
    "first_name": "Riggs",
    "last_name": "Napoleon",
    "category": "APP World Tour",
    "nationality": "Hawaii",
    "Qollector ID": "AFQ22906",
    "finish": 8160,
    "final_position": 13
  },
  //{"bib":17,"first_name":"Itzel","last_name":"Delgado","category":"APP World Tour","nationality":"Peru","Qollector ID":"AFQ25754"},
  {
    "bib": 18,
    "first_name": "Christian",
    "last_name": "Anderson",
    "category": "APP World Tour",
    "nationality": "Denmark",
    "Qollector ID": "AFS20337",
    "finish": 6185,
    "final_position": 12
  },
  //{"bib":19,"first_name":"Claudio","last_name":"Nika","category":"APP World Tour","nationality":"Italy","Qollector ID":"AFS12870"},
  //{"bib":20,"first_name":"Mark","last_name":"Alfaro","category":"APP World Tour","nationality":"USA","Qollector ID":"AFS58127"},
  //{"bib":21,"first_name":"John","last_name":"Hadley","category":"APP World Tour","nationality":"USA","Qollector ID":"AFQ55940"}
],

  livePositions: [
  ],
  flagConvert:{
    'Denmark':'🇩🇰',
    'Hawaii': '',//'🇺🇸',
    'USA':'',//'🇺🇸',
    'South Africa':'🇿🇦',
    'Peru': '🇵🇪',
    'Italy': '🇮🇹',
    'Australia': '🇦🇺',
    'Japan': '🇯🇵',
    'France': '🇫🇷'
  },
  routeLine: {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          -122.51849661923745, 
          37.76411050624246
        ],
        [
          -122.5130081176758,
          37.76513415921181
        ],
        [
          -122.51788,37.76733
        ],
        [-122.51291,37.76836],
        [-122.51918,37.76995],

        [
          -122.5191879272461,
          37.785
        ],
        [
          -122.5,
          37.802
        ],
        [
          -122.47828960418701,
          37.811343579524525
        ],
        [
          -122.47622966766357,
          37.81147919766449
        ],
        [
          -122.475,
          37.81
        ],
        [
          -122.44657516479494,
          37.808
        ]
      ]
    }
  },
  shots: {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "url": "finish.jpg",
          "video": 241252969
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            -122.44602262973785,
            37.80740206851487
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "url": "bridge.jpg",
          "video": 241253030
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            -122.47323,
            37.81203
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "url": "ft point.jpg",
          "video": 241252990
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            -122.48,
            37.81395418496248
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "url": "windmill.jpg",
          "video": 241262517
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            -122.51860857009889,
            37.78
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "url": "waves.jpg",
          "video": 241253012
        },
        "geometry": {
          "type": "Point",
          "coordinates": [-122.5131,37.7911]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "url": "push.jpg",
          "video": 241253020
        },
        "geometry": {
          "type": "Point",
          "coordinates": [-122.455,37.81]
        }
      }
    ]
  }
}


state.polygonizedRoute = turf.buffer(state.routeLine, 10, 'meters');
