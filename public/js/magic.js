$(document).ready(() => {
	let trackData = null;

	$("#btnStart").click(() => {
		$("#startForm").hide();
		$("#loading").show();

		let url = $("#url").val();
		$.ajax({
			url: '/start/?url=' + url,
			cache: false,
			success: function(data) {
				$("#startForm").hide();
				$("#setTagsForm").show();
				trackData = data;
				buildForm(trackData);
			},
			complete: function() {
				$('#loading').hide();
			}
		});
	});

	$("#btnDownload").click(() => {
		$('input').attr('disabled', true);
		$('button').attr('disabld', true);

		getAlbumArt(trackData)
		.then(buildPromises)
		.then(createZip)
		.catch(function(err) {
			console.log(err);
		});
	});


	function buildForm(data) {
		let html = '';
		$("#artist").val(data.artist);
		$("#album").val(data.album);
		$.each(data.tracks, function(i, v){
			let startRow = '<tr>';
			let trackNum = '<td><input type="text" id="track-' + v.track + '" value="' + v.track + '" class="form-control"></td>';
			let title = '<td><input type="text" id="title-' + v.track + '" value="' + v.title + '" class="form-control"></td>';
			let link = '<td><a href="' + v.file + '" id="file-' + v.track + '" class="dllink">DL</a></td>';
			let endRow = '</tr>';
			let row = startRow + trackNum + title + link + endRow;
			html += row;
		});
		$('#tagFormBody').append(html);
	}

	function getAlbumArt(data) {
		return new Promise(function(resolve, reject) {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', data.image, true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = function() {
				if (xhr.status === 200) {
					data.image = xhr.response;
					resolve(data);
				} else {
					reject({
						status: this.status,
						statusText: xhr.statusText
					});
					console.error(xhr.statusText);
				}
			};
			xhr.onerror = function() {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
				console.error(xhr.statusText);
			};
			xhr.send();
		});
	}

	function getTrack(url) {
		return new Promise(function(resolve, reject) {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = function() {
				if (xhr.status === 200) {
					// data.file = xhr.response;
					// resolve(data);
					resolve(xhr.response)
					// return xhr.response;
				} else {
					reject({
						status: this.status,
						statusText: xhr.statusText
					});
					console.error(xhr.statusText);
				}
			};
			xhr.onerror = function() {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
				console.error(xhr.statusText);
			};
			xhr.send();
		});
	}

	function setTags(data) {
		console.log(data);

		let writer = new ID3Writer(data.file);
		writer.setFrame('TIT2', data.title)
		.setFrame('TPE1', [data.artist])
		.setFrame('TPE2', data.artist)
		.setFrame('TCOM', [data.artist])
		.setFrame('TALB', data.album)
		.setFrame('TRCK', data.track)
		.setFrame('TYER', data.year)
		.setFrame('APIC', {
			type: 3,
			data: data.image,
			description: 'cover'
		});
		writer.addTag();

		let blob = writer.getBlob();
		let savdat = {
			'name': data.filename,
			'blob': blob
		};
		return savdat;
	}

	function buildPromises(data) {
		let arr = [];

		$.each(data.tracks, (i, v) => {
			let seq = Promise.resolve();
			let tmp = function() {
				return new Promise(function(resolve, reject) {
					v.image = data.image;
					seq.then(() => {
						return getTrack(v.file);
					})
					.then((buffer) => {
						v.file = buffer;
						return v;
					})
					.then((track) => {
						return setTags(track);
					})
					.then((taggedTrack) => {
						resolve(taggedTrack);
					});
				});
			}
			arr.push(tmp);
		});
		return arr;
	}

	function createZip(files) {
		let i = 0;
		let zip = new JSZip();
		let fileName = $('#album').val();
		
		next();

		function next() {
			if (i < files.length) {
				files[i]().then(function(track) {
					zip.file(track.name + '.mp3', track.blob, {binary: true});
				})
				.then(() => {
					i++;
					next();
				});
			} else {
				zip.generateAsync({type: 'blob'})
				.then(function(blob) {
					saveAs(blob, fileName + '.zip');
				})
			}
		}
	}
});