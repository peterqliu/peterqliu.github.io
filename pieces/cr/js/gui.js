import * as THREE from '../../build/three.module.js';

var pane;

export const gui = {};

export function setUpApp() {

	state.version = app.version;
	state.name = app.makeString();

	const projectUI = new Tweakpane.Pane({
		title: 'project',
		container: document.getElementById('project'),
	});

	projectUI.registerPlugin(TweakpaneEssentialsPlugin);

	projectUI
		.addBlade({
		  view: 'buttongrid',
		  size: [2,1],
		  cells: (x, y) => ({
		    title: ['Load', 'Save'][x],
		  }),
		  label: 'actions',
		})
		.on('click', e=>{
			if (e.index[0] === 0) document.querySelector('#upload').click()
			if (e.index[0] === 1) downloadProject()
		});

	document.querySelector('#upload')
		.addEventListener('change', loadProject);

	document.querySelector('#obj')
		.addEventListener('change', app.loadSky);

	gui.systemsList = new Tweakpane.Pane({
		title: 'systems',
		container: document.getElementById('systemList'),
	});

	gui.systemsList.registerPlugin(TweakpaneEssentialsPlugin);

	addSystem();

	gui.systemsList.addSeparator();

	gui.systemsList
		.addBlade({
		  view: 'buttongrid',
		  size: [3,1],
		  cells: (x, y) => ({
		    title: ['New', 'Clone', 'Delete'][x],
		  }),
		  label: 'actions',
		})
		.on('click', e=>{
			const sys = app.activeSystem;

			if (e.index[0] === 0) addSystem()
			if (e.index[0] === 1) addSystem(sys)
			if (e.index[0] === 2) {

				if (Object.keys(state.systems).length === 1) {
					alert('Scene must have at least one system.')
					return
				}
				if (!confirm(`Delete system "${sys.name}"?`)) return
				deleteSystem()
			}

		});

};

export function setUpBloomGUI() {

	gui.bloomPane?.dispose();

	// BLOOM PANE

	gui.bloomPane = new Tweakpane.Pane({
			// title: 'effects',
			container: document.getElementById('bloom'),
		})
  	// gui.bloomPane._ui.registerPlugin(TweakpaneRotationInputPlugin);
	new UI(gui.bloomPane.addFolder({title: 'bloom'}))
		.add( state.bloomParams, 'exposure', {min: 0.5, max: 6, step:0.01})
		.on('change', ({value})=>renderer.toneMappingExposure = Math.pow(value, 4))
		.separate()
		.addSection(state.bloomParams, 
			(['strength', 'radius', 'threshold'])
				.map((d,i)=>[d, {min:0, max:5, step: 1/Math.pow(10, i+1)} ]),
			(['strength', 'radius', 'threshold'])
				.map(d=>({value}) => bloomPass[d] = value)
		)


	new UI(gui.bloomPane.addFolder({title: 'sky'}))
		.add(app.obj.sky, 'visible')
		.addFromUniform(state.sky, 'layers', {step: 1, max:10})
		.addFromUniform(state.sky, 'moveSpeed', {step: 0.01, min:-Infinity})
		.addFromUniform(state.sky, 'brightness', {step: 0.1, min:0})
		.addFromUniform(state.sky, 'colorVariation', {step: 0.01, min:0})

};

export function addSystem(copySystem) {

	const key = Date.now();
	let source = constants.defaultParams;

	// if cloning, copy all but the obj object
	if (copySystem) {
		const {name, unit, system, deformation} = copySystem
		source = {
			name: `New System #${app.makeString()} (clone)`,
			unit: unit,
			system: system,
			deformation: deformation
		}
	}
	else source.name = `New System #${app.makeString()}`;
	const params = clone(source);

	setUpGroup.call(params);
	onChange.geometry.call(params);	

	state.systems[key] = params;

	state.activeSystem = key;
	onChange.systems.call(state);
	setUpSystemGUI();

}

export function deleteSystem() {

	// remove objects from scene
	app.activeSystem
		.obj.group.removeFromParent();

	// remove from state
	delete state.systems[state.activeSystem];

	// reset active system to first one
	state.activeSystem = Object.keys(state.systems)[0];

	// update system gui to ^
	setUpSystemGUI()

	onChange.systems();
}

export function setUpSystemGUI() {

	pane?.dispose();

	const params = app.activeSystem;
	const {obj: {wire, solid, point, ball, tube, group}, unit, deformation } = params;

	pane = new Tweakpane.Pane({
		container: document.getElementById('system'),
	});

	pane.registerPlugin(TweakpaneEssentialsPlugin);

	const tabs = pane.addTab({
		pages: [
			{title: 'unit'},
			{title: 'system'}
		]
	});

	const [geometryTab, systemTab, bloomTab] = tabs.pages;

	geometryTab.addInput(params, 'name')
		.on('change', onChange.systems);

	const o = arrayToObject(Object.keys(constants.defaultGeometryValues))

	geometryTab.addInput(unit, 'geometry', {options: o})
		.on('change', ({value})=>{

			if (value === 'Custom OBJ') {
				document.querySelector('#obj').click();
				return
			}

			params.unit.geomParams = clone(constants.defaultGeometryValues[value]);

			onChange.geometry.call(params)			
			setupGeomPanels.call(params);
		});

	geometryTab.addInput(group, 'visible');

	gui.geometryStructure = geometryTab.addFolder({title:'structure'});

	new UI(geometryTab.addFolder({title: 'static transforms (XYZ)'}))
		.add(unit.scale, 'value', {
			...constants.scaleUIParams,
			label: 'scale', 
		})
		.separate()
		.add(unit.translation, 'value', {...constants.translationUIParams,label: 'translation'})
		.separate()
		.add(unit.rotation, 'value', {
			label: 'rotation',
		})

	const unitDynamic = geometryTab.addFolder({title:'dynamic/periodic'});
	new UI(unitDynamic)
		.add(unit.rotationSpeed, 'value', {label: 'rotation XYZ'})
		.separate()

		.add(unit.scaleAmplitude, 'value', {label: 'scale amplitude', min:0, max: 1, step:0.01})
		.add(unit.scaleFrequency, 'value', {...constants.frequencyUIParams, label:'frequency'})

		.separate()
		.add(deformation.deformType, 'value', {label: 'deformation', options:{ 'Noise': 0, 'Pulse': 1, 'Wiggle':3}})
		.add(deformation.dfAFW, 'value', {
			...constants.afwUIParams,
			label: 'amp/freq/wvln', 
		})

	const frame = new UI(geometryTab.addFolder({title:'frame'}))
		.setMode('line')
		.add(unit.frame, 'type', {
			view: 'radiogrid',
			groupName: 'type',
			size: [2, 1],
			cells: (x) => ({
			    title: (['line', 'tube'])[x],
			    value: x,
			}),
		})
			.on('change', ({value}) => {
				const modes = ['line', 'tube'];
				onChange.frameType.call(params)
				frame.setMode(modes[value]);
			})
		.separate()
		.add(unit.frame, 'color', { view: 'color'})
			.on('change', v=>wire.material.color = group.children[3].material.color = new THREE.Color(v.value))

		.add(unit.frame.width, 'value', {min:0, max: Infinity, step:0.001, label: 'width'})
			.on('change', ({value})=>{
				wire.material.linewidth = value;
				// onChange.geometry.call(params)
				// app.updateTubes.call(params)
				// .call(params, mesh=>mesh.geometry = new THREE.CylinderBufferGeometry(value, value, 1, unit.frame.tube.facets))
			})

		.separate().store('tube')
		.add(tube.material, 'flatShading').store('tube')
		.add(unit.frame.tube, 'facets', {step:1, min:3}).store('tube')
			.on('change', ({value})=> 
				app.updateTubes.call(params)
			)
		.add(tube.material, 'roughness', constants.opacityUIParams).store('tube')
		.add(tube.material, 'clearcoat', constants.opacityUIParams).store('tube')
		.add(tube.material, 'sheen', constants.opacityUIParams).store('tube')
		.add(tube.material, 'metalness', constants.opacityUIParams).store('tube')

	const fill = new UI(geometryTab.addFolder({title:'fill'}))
		.add(unit.fill, 'color', {label:'fill', view: 'color'})
			.on('change', v => {
				solid.material.color = new THREE.Color(v.value).multiplyScalar(unit.fill.bloom.value);
			})
		.add(unit.fill, 'opacity', constants.opacityUIParams)
			.on('change', ({value}) => {
				solid.material.opacity = value;
				solid.visible = value > 0;
			})
		.separate()
		.add({filler:'Revolve'}, 'filler', {label: 'opacity flux', options:{Revolve:'Revolve'}})
		.add(unit.fill.opacityFlux.ofAFW, 'value', {
			...constants.afwUIParams,
			label: 'amp/freq/wvln', 
		})

	const pU = point.material.uniforms;
	const {point:{brightnessFlux, opacity, radiusFlux: {t, afw}, radius, bloom}} = unit;
	
	const vertexFolder = new UI(geometryTab.addFolder({title: 'vertex'}))
		.setMode(0)
		.add(unit.point, 'type', {
			view: 'radiogrid',
			groupName: 'vertexType',
			size: [2, 1],
			cells: (x) => ({
			    title: (['point', 'ball'])[x],
			    value: x,
			}),
		})
			.on('change', ({value}) => {
				onChange.vertexType.call(params);
				vertexFolder.setMode(value)				
			})
		.separate()
		.add(unit.point, 'color', {view: 'color'})
			.on('change', ({value}) => {
				pU.color.value = group.children[2].material.color = new THREE.Color(value)
			})
		.add(radius, 'value', {label: 'radius', min:0, max:1, step:0.001})
		.add(opacity, 'value', {...constants.opacityUIParams, label: 'opacity'}).store(0)
		.separate().store(0)
		.add(t, 'value', {...constants.animationUIParams, label: 'radius flux'}).store(0)
		.add(afw, 'value', {
			...constants.afwUIParams,
			label: 'amp/freq/wvln', 
		}).store(0)

		.separate().store(0)		

		.add(brightnessFlux.t, 'value', {...constants.animationUIParams, label: 'brightness flux'}).store(0)
		.add(brightnessFlux.afw, 'value', {
			...constants.afwUIParams,
			label: 'amp/freq/wvln', 
		}).store(0)

		.separate().store(1)
		.add(ball.material, 'roughness', constants.opacityUIParams).store(1)
		.add(ball.material, 'clearcoat', constants.opacityUIParams).store(1)
		.add(ball.material, 'sheen', constants.opacityUIParams).store(1)
		.add(ball.material, 'metalness', constants.opacityUIParams).store(1)

	// SYSTEM

	const arrangement = new UI(systemTab.addFolder({title: 'arrangement'}))

		.setMode('circle')
		.add(
			params.system, 
			'geometry', 
			{options: arrayToObject(constants.systemGeometries, {'Multi-ring': 'Sphere'})}
		)
		.on('change', ({value})=>{
			app.buildSystem.call(params);
			if (value === 'Circle') arrangement.setMode('circle')
			else if (value === 'Sphere') arrangement.setMode('sphere')
			else arrangement.setMode('hedron')
		})

		.add(params.system, 'quantity', {min:1, max:150, step:1})
		.on('change', () => app.buildSystem.call(params))
		.store('circle')

		.add(
			params.system, 
			'radius', 
			{min:0, step:0.1}
		)
		.on('change', () => app.buildSystem.call(params))


		.add(params.system, 'rings', {step:1, hidden: true})
		.on('change', () => app.buildSystem.call(params))
		.store('sphere')

		.add(params.system, 'unitsPerRing', {label: 'units per ring', step:2, hidden: true})
		.on('change', () => app.buildSystem.call(params))
		.store('sphere')

		.add(params.system, 'complexity', {step:1, min: 0})
		.on('change', () => app.buildSystem.call(params))
		.store('hedron')
	// system static
	new UI(systemTab.addFolder({title: 'static transform'}))
		.add(params.system.translation, 'value', {label: `translation XYZ`})
		.separate()
		.add(params.system.rotation, 'value', {label: `rotation XYZ`})



	// system dynamic

	new UI(systemTab.addFolder({title: 'dynamic (rotation & radius)'}))
		.add(params.system.rotationSpeed, 'value', {label: `rotation XYZ °/s`})
		.separate()
		.add(
			params.system.radiusAnimationAmplitude, 
			'value', 
			{label: 'amplitude (%)', min:0, max: 1, step:0.001}
		)
		.add(
			params.system.radiusAnimationFrequency, 
			'value', 
			{...constants.frequencyUIParams, label: 'frequency'}
		)

	setupGeomPanels.call(params,geometryTab);

}

export function setupGeomPanels() {

	const ui = gui.geometryStructure;
	ui.geomPanel?.forEach(p=>p.dispose());
	ui.geomPanel = [];

	const {unit:{geometry, geomParams}} = this;

	constants.defaultGeometryParams[geometry]
		.forEach((prop, index)=>{
			const input = ui.addInput(
				geomParams, 
				index, 
				{
					label: prop, 
					min:0, 
					max: Infinity, 
					step: prop.includes('adius') ? 0.1 : 1
				}
			)
			.on('change', ({value})=>{
				onChange.geometry.call(this, {value: geometry});
			})

			ui.geomPanel.push(input)
		})

}

// once app is fully initialized, set up current project
// runs on first load as well as new project loads

export function setUpProject() {

	app.bindBloom();
	setUpBloomGUI();
	setUpSystemGUI();
	app.setBackground(state.sky?.img);
};

export function loadProject(event) {

	const fileList = event.target.files;
	const reader = new FileReader();

	reader.addEventListener('load', (event) => {

		// parse new state
		const newState = JSON.parse(event.target.result);

		// check version compatibility
		if (newState.version !== app.version) {
			alert(`This project was created with version #${newState.version} of the tool. Please use that version to load the project.`)
			return
		}

		// remove all groups from scene
		app.iterateSystems(state, s=>s.obj.group.removeFromParent());

		// create groups for each new system,
		// create geometries, create system assets

		app.iterateSystems(newState, s=>{
			if (s.unit.geometry === 'Custom') s.unit.obj = new THREE.BufferGeometryLoader().parse(s.unit.obj)
			console.log(s.unit.obj)
			setUpGroup.call(s);
			onChange.geometry.call(s);	

			app.buildSystem.call(s);
		})

		state = newState;
		onChange.systems.call(state);
		setUpProject();

	});

	reader.readAsText(fileList[0]);
}

export function downloadProject() {

	const systemIds = Object.keys(state.systems);
	const systems = systemIds
		.map(k=>{
			const {name, unit, system, deformation} = state.systems[k];
			return {name, unit, system, deformation}
		});

	const output = (({version, name, now, bloomParams, activeSystem, sky}) => ({version, now, bloomParams, activeSystem, sky}))(state);
	output.systems = {};

	systemIds
		.forEach((k,i)=> output.systems[k] = systems[i])

	const button = document.querySelector('#download');
	const blob = new Blob([JSON.stringify(output)], {type : 'application/json'});
	var url = window.URL.createObjectURL(blob);
	button.setAttribute('href', url)
	button.setAttribute('download', `Project ${state.name} ${new Date().toLocaleString()}.json`)
	button.click();
};


// convenience class for method chaining and eliminate
// repetition with Tweakpane

class UI {

	constructor(ui) {
		this._ui = ui;
		this._store = {};
	}

	dispose() {
		this._ui.dispose();
	}

	add(...params) {
		const input = this._ui.addInput(...params)
		this._lastInput = input;
		return this
	}

	addFromUniform(obj, key, params) {
		const input = this._ui.addInput(obj[key], 'value', {...params, label:key})
		this._lastInput = input;
		return this
	}
	addButton(...params) {
		const input = this._ui.addButton(...params)
		this._lastInput = input;
		return this
	}

	separate() {
		const s = this._ui.addSeparator();
		this._lastInput = s;
		return this
	}

	// multiple adds with the same object to bind to
	addSection(obj, inputParams, onChange) {
		inputParams.forEach(
			(d,i)=>{
				const input = this._ui.addInput(obj, ...d)
				if (onChange) input.on('change', onChange[i])
				if (i!== inputParams.length-1) this.separate();

				this._lastInput = input;
			}
		)

		return this
	}

	on(...params) {
		this._lastInput.on(...params)
		return this
	}

	onChange(fn) {
		this._lastInput
			.on('change', fn)
		return this
	}

	// stash the last input with a unique id into the pane/folder
	// for ease of toggling visibility later
	store(id) {
		if (!this._store[id]) this._store[id] = []
		this._store[id].push(this._lastInput);
		this._lastInput.hidden = id !== this._mode;
		return this
	}

	iterateStore(id, fn) {
		this._store[id].forEach(fn)
		return this
	}

	hide() {
		this._lastInput.hidden = true
		return this
	}

	setMode(mode) {
		this._mode = mode;
		Object.keys(this._store)
			.forEach(k=>this.iterateStore(k, item=> item.hidden = k!==mode));

		return this
	}
}
