d3.json('src/data.json', function(err,resp){

	var doc = d3.select('#portfolio');
	var pieces = resp.pieces;


	//portfolio section

	var section = doc
		.selectAll('.section')
		.data(Object.keys(pieces))
		.enter()
		.append('div')
		.classed('section',true);


	section
		.append('span')
		.classed('bigger secondary lowercase weakest', true)
		.text(function(d,i){
			return d
		})

	section
		.selectAll('.work')
		.data(function(d){return pieces[d]})
		.enter()
		.append('div')
		.classed('work a bigger underline inlineBlock', true)
		.append('a')
		.text(function(d){return d.name})
		.on('click', function(d,i){
			if (d.directLink) open(d.url, '_blank')
			else {
				lightbox.update(d);
				state.paused = true;
			}


		})

	d3.select('.container')
		.classed('hidden', false)

	d3.selectAll('a')
		.attr('target', "_blank")
	//lightbox functionality

	d3.select('#close')
		.on('click', function(d,i){
			state.paused = false;
			lightbox.close();
		})


	lightbox = {
		box: d3.select('#lightbox'),

		close: function(){
			this.box
				.classed('hidden', true)
				.select('iframe')
				.attr('src', '')
				.classed('hidden', true)
		},

		update: function(work){
			
			this.box
				.classed('hidden', false)
				.select('#title')
				.text(work.name);

			this.box
				.select('#subhed')
				.text(work.tagline);
			this.box
				.selectAll('p')
				.remove();


			this.box
				.select('#blurb')
				.selectAll('p')
				.data(work.blurb)
				.enter()
				.append('p')
				.classed('big', true)
				.html(function(d){
					return d
				});

			this.box
				.select('iframe')
				.attr('src', ()=>work.url.includes('https')? work.url : './pieces/'+work.url)
				.classed('hidden', false)

			this.box
				.select('#press')
				.classed('hidden', !work.press)

			if (work.press){
	
				this.box
					.select('#pressLink')
					.text(work.press)
					.attr('href', work.pressUrl)

			}

			d3.selectAll('a')
				.attr('target', "_blank")
		}
	}
})

/*!
 * Sanitize and encode all HTML in a user-submitted string
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {String} str  The user-submitted string
 * @return {String} str  The sanitized string
 */

var sanitizeHTML = function (str) {
	var temp = document.createElement('div');
	temp.textContent = str;
	return temp.innerHTML;
};

