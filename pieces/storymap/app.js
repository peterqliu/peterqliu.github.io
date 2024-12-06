// const sessionBbs = sessionData.map(s=>{
//     if (s) {

//         //bboxes of all dists in session
//         const bbs = s.map(r=>geomData[r.id].b);

//         const metaBb = [
//             Math.min(...bbs.map(b=>b[0])),
//             Math.min(...bbs.map(b=>b[1])),
//             Math.max(...bbs.map(b=>b[2])),
//             Math.max(...bbs.map(b=>b[3])),
//         ]

//         return metaBb
//     }
//     else return null
// })

// sessionInfo.forEach((s,i)=>{
//     s.b = sessionBbs[i+1]
// })

// INIT

const toggles = d3.select('#mapToggles')
    .selectAll('.toggle')
    .data(Object.entries(ui.dropdown))
    .enter()
    .append('div')
    .attr('class', 'toggle m20')
    .attr('id', d=>d[0])
    .on('change', ([param])=>{
        const value = (d3.selectAll(`.toggle#${param} select`).property('value'));
        state.vis[param] = value;
    });

toggles.append('span')
    .text(d=>d[1][0]);

toggles.append('select')
    .style('float', 'right')
    .selectAll('option')
    .data(([key, [name, ...options]])=>options)
    .enter()
    .append('option')
    .text(d=>d)
    .attr('value', d=>d)

d3.select('.mapboxgl-popup-content')
    .append('b')
    .attr('id', 'popupTitle')
function setSession(num) {


    d3.select('h1')
        .text(sessionInfo[num].congress+' Congress')
    d3.select('#sessionDate')
        .text(sessionInfo[num].date)
    state.activeSession = num+1;
    const {activeSession} = state;

    console.warn('session', activeSession, sessionData[activeSession])

    // state.popup?.remove();    
    // setMapFocus();
    clearPreviousHover();
    const portraits = [];
    sessionData[activeSession]
        .map(d=>{

            const {name, id, party} = d;
            const image = imageLookup(name);

            if (!image) return

            setPortraitSprite(name, image.replace('.jpg', '.png'));

            portraits.push({
                'type': 'Feature',
                properties:{icon:name},
                'geometry': {
                    'type': 'Point',
                    'coordinates': geomData[id].p
                }
            })


            // const img = document.createElement('img');
            // img.setAttribute('src', `./${image.replace('.jpg', '.png')}`);
            // img.setAttribute('style', `border: 3px solid ${partyColor[party]}`)
            // const el = document.createElement('div')
            // el.className = 'marker';
            // el.appendChild(img);
            // new mapboxgl.Marker(el)
            //     .setLngLat(geomData[id].p)
            //     .addTo(map);

            
            // else console.warn(d.name)
        });

    map.setSourceData('portraits', portraits)

    // portraits
    // const portraits = sessionData[activeSession]
    //     .map(d=>{
    //         const directReference = images[d.name.toLowerCase()];
    //         if (directReference) return directReference[0]
    //         const [surname] =  d.name.toLowerCase().split(',');
    //         const surnameOnly = Object.entries(images)
    //             .find(([k, [path, session]]) => k.indexOf(surname)===0 && session ===state.activeSession );

    //         if (surnameOnly) {console.log('surname match!'); return images[surnameOnly]}
    //         // else console.warn(d.name)
    //     });

    // d3.selectAll('.portrait')
    //     .remove();

    // d3.select('#portraits')
    //     .selectAll('img')
    //     .data(portraits)
    //     .enter()
    //     .append('img')
    //     .attr('src', d=> `https://raw.githubusercontent.com/voteview/member_photos/refs/heads/main/${d}`)
    //     .classed('portrait', true)


    const sessionReps = {};
    
    sessionData[activeSession]
        .forEach(rep=>{
            const {party} = rep;

            if (!sessionReps[party]) sessionReps[party] = [];
            sessionReps[party].push(rep)
        })

    
    
    // dot summary

    d3.selectAll('#dotSummary *')
        .remove()

    d3.select('#dotSummary')
        .selectAll('span')
        .data(Object.entries(sessionReps))
        .enter()
        .append('span')
        .attr('class', 'partyCount')
        .style('background', ([party])=>partyColor[party] ||'gray')
        .text(([party, reps])=>`${reps.length} ${party}`)

    // dot vis

    d3.selectAll('#dots span')
        .remove();

    const parties = d3.select('#dots')
        .selectAll('span')
        .data(Object.keys(sessionReps))
        .enter()
        .append('span')
        .style('overflow-wrap', 'break-word')
        .attr('party', d=>d)
        .style('color', d=>partyColor[d] || 'gray');

    parties
        .selectAll('.dot')
        .data(d=>sessionReps[d])
        .enter()
        .append('span')
        .attr('class', 'dot')
        .text('⬤')



    const colorRule = [];
    const atLargeTracker = {};
    const blacklistedIds = [];

    const exclusiveAtLarges = {};
    const polePoints = [];
    sessionData[activeSession].forEach(d=>{

        const {party, id, district, statename} = d;
        const stateExists = atLargeTracker[statename]

        if (!stateExists) {
            atLargeTracker[statename] = {
                total: 0,
                atLarge: 0
            }
        }

        atLargeTracker[statename].total++

        if (district===0) {
            console.warn('0 dist!', d)
        }
        // "98" districts are statewide at-large, with no other districts
        if (district === "98") {
            const alreadyTracked = exclusiveAtLarges[id]
            if (!alreadyTracked) exclusiveAtLarges[id] = []
            exclusiveAtLarges[id].push(party)
        }

        // "99" districts are at-large when there are also smaller districts, so they will not render
        else if (district === "99") blacklistedIds.push(id)
        
        else polePoints.push({
            "type": "Feature",
            "properties": {id, dots:'●'},
            "geometry": {
              "coordinates": geomData[id].p,
              "type": "Point"
            }
        })
        if (!colorRule.includes(id)) colorRule.push(id, partyColor[party])

    });

    console.log('COUNTS', blacklistedIds)
    Object.entries(exclusiveAtLarges)
        .forEach(([id, parties])=>{
            let dotString = '';
            const splitPosition = Math.ceil(parties.length/2);
            for (var i=0;i<parties.length; i++) {
                if (i===splitPosition) dotString+='\n'
                dotString+='●';
            }

            polePoints.push({
                "type": "Feature",
                "properties": {id, dots: dotString},
                "geometry": {
                  "coordinates": geomData[id].p,
                  "type": "Point"
                }
            })
        })
    // console.log('atlarge', blacklistedIds)
    // console.log('exclusiveatlarge', exclusiveAtLarges)
    // console.log(polePoints)
    const ddsColor = [
        'match', 
        ['get','id'],
        ...colorRule,
        'rgba(0,0,0,0)'
    ];

    map.setPaintProperty('district-fill', 'fill-color', ddsColor)
    map.setPaintProperty('poles', 'text-color', ddsColor)
    map.setPaintProperty('atLarge', 'line-color', ddsColor)

    const extantSession = [        
        'all',
        ['<=', ['to-number', ['get', 'startcong']], activeSession],
        ['>=', ['to-number', ['get', 'endcong']], activeSession],
        // ['!=',['get', 'district'], '-1']
    ];
    const atLargeStates = ['in', ['get', 'id'], ['literal', blacklistedIds]];

    // update at large outlines, and pole points
    // map.setFilter('atLarge', [...extantSession, atLargeStates])
    map.setSourceData('poles', polePoints)
    // update district fills and lines
    const filter = [
        ...extantSession,
        ['!', atLargeStates],
        // ['!=',['get', 'district'], '0']
    ]
    map.setFilter('district-lines', [...filter, ['!=',['get', 'district'], '-1']])
        .setFilter('district-fill', filter)
        .setFilter('native-land', [...filter,['==',['get', 'district'], '-1']])

    // map.once('sourcedata', ()=>{getPoles();console.log('load')})
}





function imageLookup(name) {
    const directReference = images[name.toLowerCase()];
            
    if (directReference) return directReference[0]
    const [surname] =  name.toLowerCase().split(',');
    const surnameOnly = Object.entries(images)
        .find(([k, [path, session]]) => k.indexOf(surname)===0 && session ===state.activeSession );

    if (surnameOnly) {console.log('surname match!'); return images[surnameOnly]}
    // else console.warn('not found:', name)
}

function setPortraitSprite(name, imgPath){

    if (map.hasImage(name)) return
    map.loadImage(
        imgPath,
        (error, image) => {
            if (error) throw error;
            map.addImage(name, image);
        }
    );
}


function setModalFocus(ft){
    
    d3.selectAll('.zoomed')
    .style('display',ft? 'block' : 'none')

    if (!ft) return

    console.log(ft.properties)

    const {statename, district, id, startcong, endcong} = (ft.properties)

    const districtNotation = parseFloat(district) ? `${sessionInfo[parseFloat(district)-1].congress} district` : 'At large'
    d3.select('#detailPanel #head')
        .text(`${districtNotation}, ${statename}`)

    // representatives from that district and session
    const reps = sessionData[state.activeSession]
        .filter(dist=>dist.id===id)

    d3.selectAll('.repEntry')
        .remove();
    const repEntries = d3.select('#detailPanel .content')
        .selectAll('div')
        .data(reps)
        .enter()
        .append('div')
        .attr('class', 'repEntry inlineBlock')
        .style('padding-right', '15px')
        // .style('padding-bottom', '15px')

    repEntries
        .append('img')
        .attr('class', 'portrait')
        .attr('src', r=>imageLookup(r.name)?.replace('.jpg', '.png')||'./images/placeholder.jpg')
        // .style('display', r=>imageLookup(r.name) ? 'block':'none')
        .style('border', r=>`3px solid ${partyColor[r.party] || '#333'}`)
        .style('float', 'left');

    
    const repText = repEntries
        .append('div')
        .attr('class', 'inlineBlock')
        .style('margin-top', '7px')

    repText
        .append('b')
        .html(r=>r.name.split(', ').reverse().join(' '));

    repText
        .append('div')
        .append('i')
        .text(r=>r.party)


}