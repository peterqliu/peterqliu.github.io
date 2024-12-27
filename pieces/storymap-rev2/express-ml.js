class ExpressML {
    
    constructor(ml) {

        this.library = ml;
        return this;
    }

    Map(options) {

        const style = this.#blankStyle;

        class ExpressMLMap extends this.library.Map {

            constructor(o) {
                // use blank style as default
                super({style, ...o});
                this.#whenLoaded(()=>this.initialLoad = true)

            }

            // data structure of a layer object
            #propType = {

                root: ['minzoom', 'maxzoom', 'source', 'source-layer', 'filter'],

                // custom source properties to be bundled into source object
                source: new Set(['geojson', 'vector', 'cluster']),

                // any layer using these props make them layout props
                layout: [
                    'cap', 'join', 'miter', 'round-limit', 'sort', //lines
                    'visibility', 'z-offset', 'elevation-reference'
                ],
            
                noPrefix: new Set(['visibility']),
                
                // props containing these strings are paint properties 
                // (specifically used for symbol layers)
                symbolPaints:[
                    'color', 'opacity', 'halo', 'translate'
                ],

                symbolLayers: new Set(['text', 'icon']),

                // props containing these strings need a `symbol-` prefix,
                // even if they are added as text layers
                obligateSymbolPrefixes: new Set(['placement', 'sort-key', 'avoid-edges', 'spacing', 'z-order']),


                mouseEvents: new Set([                
                    'click',
                    'mousedown',
                    'mouseup',
                    'mouseenter',
                    'mouseleave',
                    'mouseup',
                    'mousemove',
                    'mouseout',
                    'dblclick',
                    'contextmenu'])
                }

            // trigger function if map is loaded, or
            // on load event if it's not yet loaded.
            // lets user call any MLExpress method before loading
            #whenLoaded(fn) {

                if (this.loaded() || this.initialLoad) return fn()
                else return this.once('load', fn)   
            }

            #beta = {
                queryFeatures(event, layer, cb) {
                    this.on(event, e=>{
                        const features = this
                            .queryRenderedFeatures(e.point, {layers: [layer]})
                        cb(features)
                    })
    
                    return this
                },
    
                queryOnClick(layers, cb) {
                    this.on('click', e=>{
                        const features = this
                            .queryRenderedFeatures(e.point, {layers})
                        cb(features)
                    })
    
                    return this        
                },
                
                bbox() {
                    return this.getBounds().toArray()
                    .flat();
                }

            }

            addBackground(id, style, after) {
                return this.#addGenericLayer('background', id, null, style, after)
            }

            addCircle(id, style, after) {
                return this.#addGenericLayer('circle', id, style, after)
            }

            addLine(id, style, after) {
                return this.#addGenericLayer('line', id, style, after)
            }

            addFill(id, style, after) {
                return this.#addGenericLayer('fill', id, style, after)
            }

            addText(id, style, after) {

                return this.#whenLoaded(()=>{
                    this.addLayer({
                        id,
                        type: 'symbol',
                        ...this.#formatStyle(style, 'text')
                    }, after)
                    this.#bindLayerEvents(id, style);

                })

            }

            addIcon(id, style, after) {

                return this.#whenLoaded(()=>{
                    this.addLayer({
                        id,
                        type: 'symbol',
                        ...this.#formatStyle(style, 'icon')
                    }, after)
                    this.#bindLayerEvents(id, style);

                })

            }
            
            remove(id) {
                if (this.getLayer(id)) this.removeLayer(id)
                else console.error(`.remove(): Map has no layer named "${id}"`)
            }

            #addGenericLayer(type, id, style, after) {

                const isVTSource = style?.['source-layer'];

                return this.#whenLoaded(()=>{

                    const layerProps = this.#formatStyle(style, type);
                    this.addLayer({
                        id,
                        type,
                        ...layerProps
                    }, after)

                    this.#bindLayerEvents(id, style);
                })
            }

            
            setSourceData(source, data) {
                return this.#whenLoaded(() => {

                    const s = this.getSource(source);
                    if (s) s.setData(this.#formatGeoJSON(data));
                    else console.error(`Source "${source}" not found.`)
                })

            }

            // handles geojson or geojson features array, or url to a remote geojson
            #formatGeoJSON(raw) {

                // url
                if (typeof raw === 'string') return raw

                else if (typeof raw === 'object') {
                    // array
                    if (raw.length) return {type: 'FeatureCollection', features: raw}
                    // full geojson
                    else return raw
                }
            }

            // given a layer type and a property, determine whether it's a
            // paint, layout, source, or root-level property

            #resolvePropType(layerType, prop) {

                const {root, source, layout, symbolPaints, mouseEvents, noPrefix} = this.#propType;

                // identify root props
                if (root.find(substring=>prop.includes(substring))) return 'root'

                // mouseevent
                if (prop.indexOf('on') === 0) {
                    if (mouseEvents.has(prop.replace('on','').toLowerCase())) return 'mouseevent'
                    return undefined
                }

                // source prop
                if (source.has(prop)) return 'source'
                
                const isSymbolLayer = ('textsymbolicon')
                    .includes(layerType);    

                let isPaintProperty;

                // for symbol layers, check paintprop list 
                if (isSymbolLayer) {
                    isPaintProperty = symbolPaints
                        .find(substring=>prop.includes(substring));
                }

                // for other layer types, check layout props
                else {
                    isPaintProperty = !layout
                        .find(substring=>prop.includes(substring));
                }    

                return isPaintProperty ? 'paint' : 'layout'

            }

            #bindLayerEvents(id, style) {

                const eventProps = Object.keys(style)
                    .filter(k=>k.indexOf('on')===0);

                eventProps.forEach(prop=>{
                    const event = prop.replace('on','').toLowerCase();
                    this.on(event, id, (e)=>style[prop](e.features[0], e))
                })
            }


            #formatStyle(obj, layerType) {

                let formattedStyle = {
                    source: {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                        // cluster: Boolean(obj?.cluster),
                        cluster:true,
                        ...obj?.cluster
                    },
                    layout: {}, 
                    paint: {}
                };

                if (!obj) return formattedStyle

                // iterate through input properties, append their layer prefixes,
                // and arrange them in the root, or source/layout/paint objects
                Object.entries(obj)
                    .forEach(([property,value]) => {

                        const propType = this.#resolvePropType(layerType, property);

                        switch (propType) {

                            case 'root': 
                                formattedStyle[property] = value;
                                break;
                            
                            case 'source':
                                formattedStyle.source = {
                                    type: property,
                                    data: value,
                                    cluster: true
                                };
                                break;

                            case 'layout':
                            case 'paint':

                                const {obligateSymbolPrefixes, symbolLayers, noPrefix} = this.#propType;
                                // apply prefix to property. also handle edge cases where symbol
                                let prefixedProperty = [layerType, property].join('-');
                                if (noPrefix.has(property)) prefixedProperty = property;
                                if (symbolLayers.has(layerType) && obligateSymbolPrefixes.has(property)) prefixedProperty = `symbol-${property}`;

                                else formattedStyle[propType][prefixedProperty] = value;
                                break;

                            // mouseevents won't apply in the layer object
                            case 'mouseevent': break;

                            default: console.error(`Unknown property "${property}"`)

                        }


                    })

                    return formattedStyle
            }

        }

        return new ExpressMLMap(options)
    } 

    #blankStyle = {
        "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        "layers": [],
        "sources": {
    
        },
        "version": 8
    }
}
