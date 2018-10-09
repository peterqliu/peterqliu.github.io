//Instantiates all menu items on the 3D viewer

var menu = d3.select('#menu')

//revolve

var section = menu	
	.append('div')
	.attr('class', 'txt-s px18 py12 border-t border--gray clearfix');

section
	.append('span')
	.text('REVOLVE')
	.attr('class', 'fl')

var labels = 

section
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

var section = menu	
	.append('div')
	.attr('class', 'txt-s px18 py12 border-t border--gray clearfix');

section
	.append('span')
	.text('TEXTURE')
	.attr('class', 'fl')

var labels = section
	.append('div')
	.attr('class', 'toggle-group align-r txt-capitalize fr')
	.selectAll('label')
	.data(['solid', 'wireframe', 'satellite'])
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

var section = menu	
	.append('div')
	.attr('class', 'px18 py12 border-t border--gray clearfix');

section
	.append('span')
	.text('Z-SCALE (1× ~ 5×)')
	.attr('class', 'txt-s')

section
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
menu
	.append('div')
	.attr('class', 'px18 py12 border-t border--gray clearfix')
	.append('a')
	.attr('id', 'download')
	.attr('class', 'btn txt-s col--12')
	.text('Download elevation JSON')




function updateDownloadPayload(){
	d3.select('#download')
		.attr("href", function(){

        	const blob = new Blob([JSON.stringify(state.output)], {type: "application/json"});
            var url = window.URL.createObjectURL(blob);
			return url

		})
		.attr('download', 'data.json')
}