const fs = require('fs');
const path = require('path');
const polylabel = require('polylabel')
const turf = require('turf')


// Path to the folder containing the GeoJSON files
const inputFolder = './cong-bounds'; // Change this to your folder path
const sessionOutput = './sessionData.js';
const geomOutput = './geomData.js';
const districtGeoms = {};

// Helper function to read and parse GeoJSON files
const readGeoJSONFiles = (folderPath) => {
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.geojson'));
    const sessions = [];
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(filePath)

        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            data.features.forEach(ft=>{

                const {properties, geometry:{type, coordinates}} = ft;

                // populate session metadata
                const {member, statename, id} = properties;
                Object.entries(member)
                    .forEach(([k,v])=>{
                        const sessionNumber = parseFloat(k);
                        if (!sessions[sessionNumber]) sessions[sessionNumber] = [];
                        Object.entries(v)
                            .forEach(([k,v])=>{
                                sessions[sessionNumber].push({...v, id, statename})
                            })
                    })

                // console.log(coordinates)
                // console.log('----')

                let loop = coordinates;

                if (type === 'MultiPolygon') {
                    const longestLoop = Math.max(...coordinates.map(l=>{return l[0].length}));
                    loop = coordinates.find(l=>l[0].length===longestLoop)
                }

                // console.log('loop:', loop)
                // populate district geometry metadata
                districtGeoms[id] = {
                    p: polylabel(loop, 0.0001).map(n=>Math.round(n*10000)/10000),
                    b: turf.bbox(ft)
                }
            })
        } 
        
        else console.warn(`Skipping ${file}: Not a valid FeatureCollection`);
        
    }

    return sessions;
};

// Main function to combine features
const combineGeoJSONFeatures = () => {
    try {
        const combinedFeatures = readGeoJSONFiles(inputFolder);

        fs.writeFileSync(sessionOutput, `const sessionData = ${JSON.stringify(combinedFeatures, null, 2)}`);
        fs.writeFileSync(geomOutput, `const geomData = ${JSON.stringify(districtGeoms, null, 2)}`);

        // console.log(`Combined GeoJSON file saved to: ${outputFile}`);
    } catch (error) {
        console.error('Error combining GeoJSON files:', error);
    }
};

// Run the script
combineGeoJSONFeatures();
