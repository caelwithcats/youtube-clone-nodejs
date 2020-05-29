var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
var multer = require('multer');
var crypto = require('crypto');
var cors = require('cors');
var urlencodedParser =  bodyParser.urlencoded({extended: true});
var port = 8081;
const fileUpload = require('express-fileupload');
app.use('/static', express.static('static'));
app.use('/raw_video', express.static('videos'));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());
var uuid = require('uuid');
const uuidv4 = require('uuid/v4');
const media_thumb = require('media-thumbnail')
var ffmpeg = require('fluent-ffmpeg');
///----------------------------------------------
//
// ---------------------------------  

app.get('/', function (req, res) {
	var home = __dirname + '/index.html';
	res.sendFile(home);
})
app.get('/upload', function (req, res) {
	res.sendFile(__dirname + '/pages/uploadpage.html');
})
app.post('/video-upload', urlencodedParser, function(req, res, next) {

	var videoName = req.body.video_name;
	console.log("new video called \"" + videoName + "\"");
	let video = req.files.video_source;
	console.log(video.mimetype);
	let vidValid;
	let vidId = crypto.randomBytes(4).readUInt32LE(0);
	let vidUUID = uuidv4();
	let randFileName  = "video_" + vidId + '-' + vidUUID;
	let randThumbFilename  = "thumb_" + vidUUID;
	let fileExtention;
	if(video != null){
	if(String(video.mimetype) == "video/x-msvideo"){
		vidValid = true;
		fileExtention = "avi";
	}else if(String(video.mimetype) == "video/quicktime"){
		vidValid = true;
		fileExtention = "mov";
	}else if(String(video.mimetype) == "video/3gpp"){
		vidValid = true;
		fileExtention =  "3gp"
	}else if(String(video.mimetype) == 'video/mp4'){
		vidValid = true;
		fileExtention = "mp4";
	}else{
		vidValid = false;
	}
	}else{
		vidValid = false;
	}
	console.log(vidValid);
	if(vidValid == false){
		console.log("Not a valid video format");
	}else{
	console.log(video);
	video.mv(__dirname + "/videos/" + randFileName + "." + fileExtention , function(err) {
		if(err){
			console.log(err);
		}else{
	   		console.log("video uploaded");
   	}
	  });
	}
	ffmpeg(__dirname + "/videos/" + randFileName + "." + fileExtention).on('end', function() {console.log('Thumbnails taken');
	  })
	  .on('error', function(err) {
		console.error(err);
	  })
	  .screenshots({
		// Will take screenshots at 20%, 40%, 60% and 80% of the video
		count: 0.1,
		size: "200x150",
		filename: randThumbFilename + ".png",
		folder: __dirname + "/static/photos"
	  });//  + randThumbFilename + ".png"
	let videoMetadata = {
		"video_id": vidId,
		"video_uuid": vidUUID,
		"video_source": "/raw_video/" + randFileName + "." + fileExtention,
		"views": 0,
		"title": videoName,
		"thumbnail": "/static/photos/" + randThumbFilename + ".png"
	};
	var rawData = JSON.stringify(videoMetadata, null, 2);
	fs.writeFileSync(__dirname + "/videos/metadata/" + randFileName + ".json", rawData)
	console.log();
	res.redirect("/");
});
app.get('/api', function (req, res) {
	const dir = fs.opendirSync(__dirname + "/videos/metadata/")
	let dirfile;
	let loopNumber;
	let returnJson = {
		"total": 1,
		"videos": []
	};
	while ((dirfile = dir.readSync()) !== null) {
		console.log(dirfile.name)
	  	if (dirfile.name.substring(0,6) == "video_") {
		  console.log("detected video from API");
		  let tmpData = fs.readFileSync(__dirname + "/videos/metadata/" + dirfile.name);
		  let videoMetadata = JSON.parse(tmpData);
		  let currentVidMetadata = {
			  "video_metadata": "/raw_video/metadata/" + dirfile.name,
			  "video_id": videoMetadata.video_id,
			  "video_uuid": videoMetadata.video_uuid,
			  "video_title": videoMetadata.title,
			  "video_source": videoMetadata.video_source,
			  "video_thumbnail": videoMetadata.thumbnail,
			  "video_views": videoMetadata.views
		  }
		  returnJson.videos.push(currentVidMetadata);
		  console.log(returnJson.videos[loopNumber]);
	  }
	}


	returnJson.total = returnJson.videos.length;
	console.log(returnJson)
    res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(returnJson, null, 2))
});
app.get('/api/video/:id', function (req, res) {
	const dir = fs.opendirSync(__dirname + "/videos/metadata/");
	let dirfile;
	let isMatch;
	while ((dirfile = dir.readSync()) !== null) {
		var x = String(dirfile.name);
		var startValue = x.search("_") + 1;
		var endValue = x.search("-");
		var r = x.substring(startValue,endValue);
		console.log(r + " " + x + " = " + req.params.id);
		if(req.params.id === r){
			isMatch = true;
			break;
		}else{
			isMatch = false;
		}
	}
	//console.log(dirfile.name);
	if(isMatch){
		res.sendFile(__dirname + "/videos/metadata/" + dirfile.name);
	}else{
		res.send("Not found");
	}
});
app.get('/api/video/:id/:UUID', function (req, res) {
	let completeFileName = __dirname + "/videos/metadata/video_" + req.params.id + "-" + req.params.UUID + ".json";
	console.log(completeFileName)
	if (fs.existsSync(completeFileName)) {
		res.sendFile(completeFileName);
	}else{
		res.send("Not Found")
	}
});
var server = app.listen(port, function () {
	server.host = "9.9.9"
	var host = server.address().address
	var port = server.address().port
	console.log("App listening at http://%s:%s", host, port)
})
