import React, { useState } from 'react'
import Head from 'next/head'
import {Input, Form, Button, Table} from 'antd'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import 'antd/dist/antd.css'

const Home = () => {
  const [data, setData] = useState({})
  const [isLoading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [valArtist, setArtist] = useState('')
  const [valAlbum, setAlbum] = useState('')

  const onStartClick = async () => {
    const request = new  XMLHttpRequest()
    setLoading(true)
    const base = '/start/?url='
    
    request.open('GET', base + url, true)
    request.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        // Success!
        setLoading(false)
        document.getElementById('startForm').style.display = 'none'
        document.getElementById('setTagsForm').style.display = ''
        buildForm(JSON.parse(this.response))
      } else {
        // We reached our target server, but it returned an error
        console.error('err')
      }
    }
    request.send()
  }

  const onDownloadClick = async () => {
    for (const el of document.getElementsByTagName('input')) {
      el.setAttribute('disabled', true)
    }
    for (const el of document.getElementsByTagName('button')) {
      el.setAttribute('disabled', true)
    }
    getAlbumArt(data)
    .then(buildPromises)
		.then(createZip)
		.catch(function(err) {
			console.log(err);
		});
  }

  const getAlbumArt = (data) => {
    return new Promise(function(resolve, reject) {
			const xhr = new XMLHttpRequest();
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

  const buildPromises = (data) => {
		const arr = [];

		data.tracks.map((v, i) => {
			const seq = Promise.resolve();
			const tmp = function() {
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
  
  const getTrack = (url) => {
		return new Promise(function(resolve, reject) {
			const xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = function() {
				if (xhr.status === 200) {
					resolve(xhr.response)
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
  
  const createZip = (files) => {
		let i = 0;
		const zip = new JSZip();
		const fileName = document.getElementById('album').value
		
		next();

		function next() {
			if (i < files.length) {
				files[i]().then(function(track) {
					zip.file(track.name + '.mp3', track.blob, {binary: true});
				})
				.then(() => {
					i+=1;
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
  
  const setTags = (data) => {
		const writer = new ID3Writer(data.file);
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

		const blob = writer.getBlob();
		const savdat = {
			'name': data.filename,
			'blob': blob
		};
		return savdat;
	}

  const buildForm = (tracks) => {
    setArtist(tracks.artist)
    setAlbum(tracks.album)
    
    tracks.tableData = []
    tracks.tracks.map((v, i) => {
      tracks.tableData.push({
        key: v.track,
        track: v.track,
        title: v.title,
        link: v.file
      })
    })

    setData(tracks)
  }

  return (
    <div>
      <Head>
        <title>Home</title>
        <script src={'https://unpkg.com/browser-id3-writer@4.0.0'} />
      </Head>

      <Container>
        <StartForm setUrl={setUrl} onStartClick={onStartClick} isLoading={isLoading} />

        <SetTagsForm data={data} onDownloadClick={onDownloadClick} isLoading={isLoading} artist={valArtist} album={valAlbum} />
      </Container>
    </div>
  )
}

const Container = (props) => (
  <div>
    {props.children}

    <style jsx>{`
      text-align: center;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      margin-bottom: 20px;
      padding: 30px 50px;
      margin: 20px 0;
    `}</style>
  </div>
)

const StartForm = (props) => {
  const {setUrl, onStartClick, isLoading} = props

  return (
    <div id="startForm">
      <h2>Download Bandcamp</h2>

      <Input id="url" onChange={(e) => {setUrl(e.target.value)}} />
      <Button id="btnStart" type="primary" onClick={onStartClick} loading={isLoading}>
        Start
      </Button>
    </div>
  )
}

const SetTagsForm = (props) => {
  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 14 },
  }
  const columns = [
    {
      title: 'Track #',
      dataIndex: 'track',
      key: 'track'
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title'
    },
    {
      // DL
      title: '',
      dataIndex: 'link',
      key: 'link',
      render: link => (
        <Button type="primary" url={link}>
          DL
        </Button>
      )
    }
  ]
  const {data, onDownloadClick, isLoading, artist, album} = props

  return (
    <div id="setTagsForm" style={{
      display: 'none'
    }}>
      <h2>Confirm ID3 Tags</h2>
      <Form layout='horizontal'>
      <Form.Item label='Artist' {...formItemLayout}>
          <Input placeholder='Artist' id='artist' value={artist} />
        </Form.Item>

        <Form.Item label='Album' {...formItemLayout}>
          <Input placeholder='Album' id='album' value={album} />
        </Form.Item>
      </Form>

      <Table dataSource={data.tableData} columns={columns} pagination={false} />

      <Button id="btnDownload" type="primary" onClick={onDownloadClick} loading={isLoading}>
        Download Files
      </Button>
    </div>
  )
}



export default Home
