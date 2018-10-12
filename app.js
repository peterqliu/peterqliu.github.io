d3.json('data.json', function(err,resp){
	console.log(err,resp)
	var doc = d3.select('.container')

	var section = doc
		.selectAll('.section')
		.data(Object.keys(resp))
		.enter()
		.append('div')
		.classed('section',true);


	section
		.append('div')
		.classed('bigger secondary lowercase weakest', true)
		.text(function(d,i){
			return d
		})

	section
		.selectAll('.work')
		.data(function(d){return resp[d]})
		.enter()
		.append('div')
		.classed('work a big', true)
		.text(function(d){return d.name})
		.on('click', function(d,i){

			lightbox.update(d);

		})


	//lightbox functionality

	d3.select('#close')
		.on('click', function(d,i){
			lightbox.close();
		})

	lightbox = {
		box: d3.select('#lightbox'),

		close: function(){
			this.box
				.classed('hidden', true)
				.select('iframe')
				.attr('src', '')
		},

		update: function(work){
			this.box
				.classed('hidden', false)
				.select('#title')
				.text(work.name);

			this.box
				.selectAll('p')
				.remove();
			this.box
				.select('#blurb')
				.selectAll('p')
				.data(work.blurb)
				.enter()
				.append('p')
				.text(function(d){return d});

			this.box
				.select('iframe')
				.attr('src', 'https://peterqliu.github.io/pieces/'+work.url);

			this.box
				.select('#press')
				.classed('hidden', !work.press)

			if (work.press){
	
				this.box
					.select('#pressLink')
					.text(work.press)
					.attr('href', work.pressUrl)

			}
		}
	}
})



