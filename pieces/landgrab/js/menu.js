//Instantiates all menu items on the 3D viewer

var menu = d3.select('#menu')

function addSection(title, boldTitle){
	var section = menu	
		.append('div')
		.attr('class', 'txt-s px18 py12 border-t border--gray clearfix')

	section
		.append('span')
		.text(title)
		.classed('txt-bold', boldTitle);

	return section
}

var labels = 

addSection('SMOOTHEN (GAUSSIAN)', true)
	.attr('id', 'smoothen')
	.classed('hide-visually', true)
	.append('div')
	.attr('class', 'toggle-group fr')
	.selectAll('label')
	.data(['OFF', 'ON'])
	.enter()
	.append('label')
	.classed('toggle-container', true);


labels

	.append('input')
	.attr('name', 'smoothen')
	.attr('type', 'radio')
	.attr('checked',function(d,i){
		if (i ===0) return true
	})

labels
	.append('div')
	.attr('class', 'toggle toggle--white')
	.text(function(d){return d})
	.on('click', function(d,i){
		//setState('preview', 'loading', true)
		setState('preview', 'smoothen', i == true)
	})

//revolve

var labels = 

addSection('REVOLVE')
	.append('div')
	.attr('class', 'toggle-group fr')
	.selectAll('label')
	.data(['OFF', 'ON'])
	.enter()
	.append('label')
	.classed('toggle-container', true);

labels
	.append('input')
	.attr('name', 'revolve')
	.attr('type', 'radio')
	.attr('checked',function(d,i){
		if (i ===0) return true
	})

labels
	.append('div')
	.attr('class', 'toggle toggle--white')
	.text(function(d){return d})
	.on('click', function(d,i){
		controls.autoRotate = i == true;
	})

//textures

var labels = 

addSection('TEXTURE')
	.append('div')
	.attr('class', 'toggle-group align-r txt-capitalize fr')
	.selectAll('label')
	.data(['solid', 'satellite', 'hypsometric'])
	.enter()
	.append('label')
	.classed('toggle-container', true);

labels
	.append('input')
	.attr('name', 'texture')
	.attr('type', 'radio')
	.attr('checked',function(d,i){
		if (d === state.preview.texture) return true
	})

labels
	.append('div')
	.attr('class', 'toggle toggle--white')
	.text(function(d){return d})
	.on('click', function(d,i){
		setState('preview', 'texture', d)
	})



// scale slider
addSection('Z-SCALE (1× ~ 5×)')
	.append('div')
	.attr('class','range range--s range--lighten50 col--8 fr')
		.append('input')
		.attr('type', 'range')
		.attr('value', 1)
		.attr('min', 1)
		.attr('max', 5)
		.attr('step', 0.01)
		.attr('oninput', function(event){
			return "setState('preview', 'scale', this.value)"
		})


// download elevation button

var downloadSection = 
addSection('DOWNLOAD')

downloadSection
	.append('a')
	.attr('id', 'obj')
	.attr('class', 'btn btn--s btn--stroke btn--stroke--2 txt-s mx6 fr hide-visually')
	.text('.OBJ')
	.on('click', function(){
		d3.select('#obj')
			.attr("href", function(){

			    var exporter = new THREE.OBJExporter();
			    var result = exporter.parse(state.mesh);
	        	const blob = new Blob([result], {type: "application/json"});
	            var url = window.URL.createObjectURL(blob);
				return url

			})
			.attr('download', window.location.hash.replace('#','')+'.obj');	
		console.log('getting obj')
		
		d3.select('#obj')
			.on('click')()
	})

downloadSection
	.append('a')
	.attr('id', 'elevation')
	.attr('class', 'btn btn--s btn--stroke btn--stroke--2 txt-s mx6 fr')
	.text('Elevation JSON')




function updateDownloadPayload(){

	// prep elevation JSON
	d3.select('#elevation')
		.attr("href", function(){

        	const blob = new Blob([JSON.stringify(state.output)], {type: "application/json"});
            var url = window.URL.createObjectURL(blob);
			return url

		})
		.attr('download', window.location.hash.replace('#','')+'.json');


}