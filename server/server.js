const express = require('express')()
const cheerio = require('cheerio')
const request = require('request')
const bodyParser = require('body-parser')
const cors_proxy = require('cors-anywhere').createServer()
const next = require('next')
const app = next({ dev: false })

const routes = require('./routes')
const routerHandler = routes.getRequestHandler(app)

app.prepare().then(() => {
  express.use(bodyParser.urlencoded({extended: false}))
  express.use(bodyParser.json())

  // Allows for cross origin domain request:
  express.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    next()
  })

  express.get('/start/', function(req, res) {
    const url = req.query.url;
  
    if (!url) res.send('error')

    makeRequest(url, function(html) {
      const $ = cheerio.load(html);
      const albumData = parseAlbumData($);
      const metaData = getMetadata($);
      const fileList = getFileList(albumData, metaData);

      res.send(fileList);
    });
    
  });
  
  express.get('/get', (req, res) => {
    const url = req.query.url;
  
    makeRequest(url, (html) => {
      res.json({
        'src': html
      });
    });
  });
  
  express.get('/isup', (req, res) => {
    res.send("OK");
  });
  
  express.get('/proxy/:proxyUrl*', (req, res) => {
    req.url = req.url.replace('/proxy/', '/')
    cors_proxy.emit('request', req, res)
  })

  // Next.js page routes
  express.get('*', routerHandler)

  // Start express
  const server = express.listen(process.env.PORT || 5000, () => {
    const host = server.address().address
    const port = server.address().port
  
    console.log('Server is listening on port %d in %s mode', port, express.settings.env);
  })
})



function makeRequest(url, callback) {
  request(url, function(error, response, html) {
		if (!error) {
			callback(html);
		} else {
      new Error(error);
		}
	});
} 

function parseAlbumData($) {
	return $('script:contains("TralbumData")').html();
}

function getFileList(albumData, metaData) {
	const list = {
		artist: metaData.artist,
		album: metaData.album,
		image: '/proxy/' + metaData.image,
		tracks: []
	};
	const tmpArr = albumData.match(/(\[{)(.)+(}\])/g)[0];
	const tmpList = JSON.parse(tmpArr);

    for (let i = 0; i < tmpList.length; i++) {
        if (tmpList.length > 0) {
            if (tmpList[i].track_num < 10) {
            	tmpList[i].track_num = tmpList[i].track_num;
            }
            
            const data = {
              'title': tmpList[i].title,
              'artist': metaData.artist,
            	'album': metaData.album,
            	'year': metaData.year,
            	'track': tmpList[i].track_num,
              'file': '/proxy/' + tmpList[i].file['mp3-128'],
              'filename': tmpList[i].track_num + ' - ' + tmpList[i].title
            };

            list.tracks.push(data);
        }
    }
    return list;
}

function getMetadata($) {
	const artist 	= $("span[itemprop='byArtist']").text().trim() || '';
	const album 	= $(".trackTitle[itemProp='name']").text().trim() || '';
	const year 	  = $("meta[itemprop='datePublished']").attr('content').substr(0,4) || '';
	const image 	= $('#tralbumArt > a > img').attr('src') || '';

	return {
		artist: artist,
		album: album,
		year: year,
		image: image
	};
}