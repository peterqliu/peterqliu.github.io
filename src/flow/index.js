

const app = {
    constants:{
        rasterGridRatio:15,
        distanceDecayFunction: d=>1/Math.pow(d,1.5),
        impulseCoefficient: 10,
        lookup: {
            atan2:[],
            sine:[],
            cosine:[],
            distance:[]
        }
    },

    setup: () => {

        // using var to work around a WebKit bug
        var canvas = document.getElementById('canvas'); // eslint-disable-line
        const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);

        //update retina
        canvas.width = innerWidth * pxRatio;
        canvas.height = innerHeight * pxRatio;

        // wind.resize();


        var dC = document.getElementById('drawCanvas');
        dC.width = state.width;
        dC.height = state.height;

        var ctx = dC.getContext('2d');
        ctx.fillStyle='rgb(128,128,128)';
        ctx.fillRect(0,0, state.width, state.height)

        var img = document.createElement("img");
        windData.image = img;
        img.onload = () => wind.setWind(windData);


        state.draw = {
            rawImgData: new Array(state.width*state.height*4).fill(128),
            imgData: ctx.getImageData(0,0,state.width, state.height),
            drawingTexture: dC,
        }

        app.updateImage();

        const gl = canvas.getContext('webgl', {antialiasing: false});


        const wind = window.wind = new WindGL(gl, {
            // speedFactor:1
        });
        wind.numParticles = 40000;

        window.addEventListener('resize', () => {
            wind.resize()
        })
        // const gui = new dat.GUI();
        // gui.add(wind, 'numParticles', 1, 999999);
        // gui.add(wind, 'fadeOpacity', 0, 0.999).step(0.001).updateDisplay();
        // gui.add(wind, 'speedFactor', 0.05, 1.0);
        // gui.add(wind, 'dropRate', 0, 0.1);
        // gui.add(wind, 'dropRateBump', 0, 0.2);


       
        // precalculate lookups
        for (var r=0; r<=state.height; r++) {
            var rawDistance = []
            for (var c=0; c<=state.width; c++) {
                const d = Math.pow(Math.pow(r,2) + Math.pow(c,2),0.5);
                rawDistance.push(d)
            }

            app.constants.lookup.distance.push(rawDistance)
        }

        for (var r= -state.height; r<=state.height; r++){
            var row = {}
            for (var c= -state.width; c<= state.width; c++) {
                var at2 = Math.atan2(r,c)*180/Math.PI;

                at2 = at2>=0 ? at2 : 360 + at2
                row[c] = Math.round(at2);
            }   
            app.constants.lookup.atan2[r] = row;
        }

        for (var a=0; a<=360; a++){
            app.constants.lookup.sine.push(sine(a))
            app.constants.lookup.cosine.push(cosine(a))
        }


        //bind events to drawing surface
        window.addEventListener('mousemove', (e)=>{
            app.registerGesture(e, 'fan');
            state.longPress = false;
        })
        window.addEventListener('mousedown', (e)=>{
            state.longPress = e;
        })
        window.addEventListener('mouseup', ()=>{
            state.lastImpulse = null;
            state.longPress = false;
        })
        // window.addEventListener('wheel', (e)=>console.log(event.deltaX,event.deltaY))

        app.render();

    },

    decay: (factor, msInterval) => {
        
        if (!state.lastDecayEvent || Date.now() - state.lastDecayEvent > msInterval) {

            state.lastDecayEvent = Date.now();

            for (var i = 0; i<state.draw.rawImgData.length; i+=4) {

                const currentRedChannel = state.draw.rawImgData[i];
                const currentBlueChannel = state.draw.rawImgData[i+1];

                if (currentRedChannel === currentBlueChannel === 128) continue

                else {

                    const xDifferential = currentRedChannel-128;
                    const yDifferential = currentBlueChannel-128;

                    state.draw.rawImgData[i] = Math.abs(xDifferential)<1 ? 128 : 128 + xDifferential*factor
                    state.draw.rawImgData[i+1] = Math.abs(yDifferential)<1 ? 128 : 128 + yDifferential*factor

                    state.imageNeedsUpdate = true
                }

            }
            
        }
    },

    lookupSine: theta =>{
        const sanitized = Math.abs(Math.round(theta))%360
        return app.constants.lookup.sine[sanitized]
    },

    lookupCosine: theta =>{
        const sanitized = Math.abs(Math.round(theta))%360
        return app.constants.lookup.cosine[sanitized]
    },

    lookupDistance: (a,b) =>{
        const sanitized = input => Math.abs(Math.round(input))
        return app.constants.lookup.distance[sanitized(a)][sanitized(b)]
    },

    lookupAtan2: (a,b) =>{

        const needsDownscaling = a > state.height || b > state.width;

        a = Math.min(Math.abs(a), state.height) * Math.sign(a);
        b = Math.min(Math.abs(b), state.width) * Math.sign(b);

        return app.constants.lookup.atan2[a][b]
    },


    getPixelPosition: e => [
        e.offsetX/app.constants.rasterGridRatio,
        e.offsetY/app.constants.rasterGridRatio
    ],

    registerGesture: (e, brush) =>{

        const pxPosition = app.getPixelPosition(e);

        // if part of a long drag, calculate rasterized line and apply impulse on each pixel
        // otherwise, just apply on current px

        const line = state.lastImpulse ? bresenham(pxPosition, state.lastImpulse) : [pxPosition]

        var options;

        if (brush === 'fan') {
            options = {
                scalar: e.which ? 2 : 0.1,
                impulseAngle: app.lookupAtan2(e.movementY, e.movementX),
                decayPower: e.which ? 0.5 : 0.1
            }
        }

        line.forEach(px => app.applyImpulse(
            brush, 
            ...px, 
            options
        ))

        state.lastImpulse = pxPosition;
        state.lastImpulseTime = Date.now();
        state.imageNeedsUpdate = true;

    },

    // update canvas image with current velocity data
    updateImage: (e) =>{

        for (var a=0; a<state.draw.imgData.data.length; a++)state.draw.imgData.data[a] = state.draw.rawImgData[a]
        const drawContext = state.draw.drawingTexture.getContext('2d');

        drawContext.putImageData(state.draw.imgData, 0, 0)
        
        // apply canvas contents to winddata image via dataurl
        windData.image.src = state.draw.drawingTexture.toDataURL("image/png");
    },

    // apply a certain function over all pixels of each column of each row
    // takes a rowFn to avoid recomputing a row property for every column therein
    iterateRowsColumns: (rowFn, columnFn) => {

        for (var r=0; r<state.height; r++) {

            const rowVal = rowFn(r)
            for (var c=0; c<state.width; c++) columnFn(r, c, rowVal)
        }
    },

    // given velocity vectors mX/mY at position x/y, apply brush to imgData

    applyImpulse: (brush, x, y, o) => {

        const imgData = state.draw.rawImgData;

        app.iterateRowsColumns(

            r => Math.floor(r-y),   // define dY below as the difference in Y direction

            (r,c, dY) => {

                const dX = Math.floor(c-x);

                const relativeAngle = app.constants.lookup.atan2[dY][dX];
                const distance = Math.max(1, app.lookupDistance(dY, dX));

                const delta = brushes[brush](
                    relativeAngle,
                    distance, 
                    o
                )

                const fourChannelPixelIndex = (r*state.width+c) * 4;

                imgData[fourChannelPixelIndex] += delta.x
                imgData[fourChannelPixelIndex + 1] += delta.y  

            }
        )

    },

    render: () => {

        if (!state.paused) {
        
            if (state.imageNeedsUpdate) {
                app.updateImage()
                state.imageNeedsUpdate = false;
            }

            if (state.longPress) {


                // app.iterateRowsColumns(
                //     r => Math.floor(r-y),

                // )
                app.applyImpulse('gyre', ...app.getPixelPosition(state.longPress), {scalar:10})
                state.imageNeedsUpdate = true;

            }

            if (Date.now()-state.lastImpulseTime < 10000) app.decay(0.9, 200)
            if (wind.windData) wind.draw();
        }

        requestAnimationFrame(app.render);
    },
}

const sine = angle => Math.sin(Math.PI * angle/180);
const cosine = angle => Math.cos(Math.PI * angle/180);
const tangent = angle => Math.tan(Math.PI * angle/180);

const arcsine = ratio => 360 * Math.asin(ratio) / (Math.PI * 2)
const arccosine = ratio => 360 * Math.acos(ratio) / (Math.PI * 2)
const arctan = ratio => 360 * Math.atan(ratio) / (Math.PI * 2)

const state = {
    width: Math.round(innerWidth/app.constants.rasterGridRatio),
    height: Math.round(innerHeight/app.constants.rasterGridRatio),
}

var windData = {
  "source": "http://nomads.ncep.noaa.gov",
  "date": "2016-11-20T00:00Z",
  "width": state.width,
  "height": state.height,
  "uMin": -100,
  "uMax": 100,
  "vMin": -100,
  "vMax": 100
}


const brushes = {

    attract: (deltaAngle, d, scalar) => {

        scalar = scalar || 1
        const d2 = Math.pow(d,2)

        return {
            x: scalar * app.lookupCosine(deltaAngle) / d,
            y: -scalar * app.lookupSine(deltaAngle) / d
        }
    },

    fan: (relativeAngle, distance, options) => {

        var deltaAngle = relativeAngle - options.impulseAngle 
        if (deltaAngle<0) deltaAngle+=360

        // bearing of point vector relative to impulseAngle
        const theta = 2 * deltaAngle + options.impulseAngle;

        const multiplier = options.scalar * Math.min(Math.abs(cosine(deltaAngle)),1) / Math.pow( distance, options.decayPower);
        const sin = app.lookupSine(theta);
        const cos = app.lookupCosine(theta);


        return {
            x: cos * multiplier,
            y: -sin * multiplier    
        }
    },

    gyre: (relativeAngle, distance, options) => {

        const scalar = options.scalar || 1
        const sin = app.lookupSine(relativeAngle);
        const cos = app.lookupCosine(relativeAngle);

        const multiplier = distance/scalar +1

        return {
            y: cos / multiplier,
            x: sin / multiplier
        }        
    }
}



function bresenham(pos1, pos2) {
    var delta = pos2.map(function(value, index) { return value - pos1[index]; });
    var increment = delta.map(Math.sign);
    var absDelta = delta.map(Math.abs);
    var absDelta2 = absDelta.map(function(value) { return 2 * value; });
    var maxIndex = absDelta.reduce(function(accumulator, value, index) { return value > absDelta[accumulator] ? index : accumulator; }, 0);
    var error = absDelta2.map(function(value) { return value - absDelta[maxIndex]; });

    var result = [];
    var current = pos1.slice();
    for (var j = 0; j < absDelta[maxIndex]; j++)
    {
        result.push(current.slice());
        for (var i = 0; i < error.length; i++)
        {
            if (error[i] > 0)
            {
                current[i] += increment[i];
                error[i] -= absDelta2[maxIndex];
            }
            error[i] += absDelta2[i];
        }
    }
    result.push(current.slice());
    return result;
}




app.setup()
