var express = require('express');
var http = require('http');
var path = require('path');
var socketio = require("socket.io");
var OpenTok = require('opentok');

var apiKey = 45197682,
    apiSecret = "b6e1a5c600faf08cdb498a173582a8eaf83cf9ac";


var opentok = new OpenTok(apiKey, apiSecret);


var rooms = {},
	roomMembers = {},
	roomKeys = {},
	archives = {};

var app =express();

app.use(express.static(path.join(__dirname, 'web')));

app.get("/",function(req,res) {
	res.send("Hello world nodemon!!!");
});

var server = http.createServer(app);
var io = socketio.listen(server);

io.on('connection', function (socket) {

	socket.on("disconnect",function() {

			var roomName = socket.roomName,
				nickName = socket.nickName,
				members = rooms[roomName];

			if(!socket.nickName) return;

			members.splice(members.indexOf(socket),1);
			roomMembers[roomName].splice(roomMembers[roomName].indexOf(nickName),1);

			if(members.length === 0) {
				delete rooms[roomName];
				delete roomMembers[roomName];
				delete roomKeys[roomName];
			}
			else {
				for(var i = 0;i<members.length;i++) {
					if(members[i].nickName !== nickName) {
						members[i].emit("member-disconnected",nickName);
					}
				}		
			}
			
	});

	socket.on("enter-room",function(data,errCallback) {

		var roomName = data.roomName;
		var members = rooms[roomName];
		var nickName = data.nickName,
			first = false;

		socket.nickName = nickName;
		socket.roomName = roomName;

		if(!members) {
			first = true;
			members = [];
			members.push(socket);
			rooms[roomName] = members;
			roomMembers[roomName] = [];
			roomMembers[roomName].push(nickName);
			createSession(roomName);
		}
		else {

			if(roomMembers[roomName].indexOf(nickName) >= 0) {
				errCallback("The nick name "+nickName + " has already been taken");
				return;	
			}
			else {
				roomMembers[roomName].push(nickName);
				members.push(socket);

				if(roomKeys[roomName]) {
					var keys = roomKeys[roomName];
					socket.emit("keys-generated",{sessionId :keys.sessionId,token : keys.token,apiKey : apiKey });
				}		
			}
			
		}

		if(first) {
			socket.emit("first-member");
		}
		else {
			for(var i = 0;i<members.length;i++) {
				if(members[i].nickName !== nickName) {
					members[i].emit("new-member",nickName);
					socket.emit("new-member",members[i].nickName);
				}
				
			}
		}

		console.log("Added a connection "+nickName + " into the room "+roomName);
	});

	socket.on("make-video-call",function(data) {

		var caller = data.caller,
			callee = data.callee,
			roomName = data.roomName;

		var socket = getSocket(roomName,callee);
		
		socket.emit("receive-video-call",caller);	

	});

	socket.on("make-audio-call",function(data) {

		var caller = data.caller,
			callee = data.callee,
			roomName = data.roomName;

		var socket = getSocket(roomName,callee);
		
		socket.emit("receive-audio-call",caller);	

	});

	socket.on("make-text-chat",function(data) {

		var caller = data.caller,
			callee = data.callee,
			roomName = data.roomName;

		var socket = getSocket(roomName,callee);
		
		socket.emit("receive-text-chat",caller);	

	});

	socket.on("call-rejected",function(data) {

		var rejecter = data.rejecter,
			rejected = data.rejected,
			roomName = data.roomName;

		var socket = getSocket(roomName,rejected);
		
		socket.emit("call-rejected",rejecter);	

	});

	socket.on("video-call-accepted",function(data) {

		var accepter = data.accepter,
			accepted = data.accepted,
			roomName = data.roomName;

		var socket = getSocket(roomName,accepted);
		
		socket.emit("video-call-accepted");	

	});

	socket.on("audio-call-accepted",function(data) {

		var accepter = data.accepter,
			accepted = data.accepted,
			roomName = data.roomName;

		var socket = getSocket(roomName,accepted);
		
		socket.emit("audio-call-accepted");	

	});

	socket.on("start-recording",function() {

		var roomName = socket.roomName,
			sessionId = roomKeys[roomName].sessionId;

		opentok.startArchive(sessionId, function(err, archive) {
		  if (err) return console.log(err);
		  archives[sessionId] = archive.id;
		});

	});

	socket.on("stop-recording",function() {

		var roomName = socket.roomName,
			sessionId = roomKeys[roomName].sessionId,
			archiveId = archives[sessionId];

		opentok.stopArchive(archiveId, function(err, archive) {
		  if (err) return console.log(err);
		  console.log("Stopped archive:" + archive.id);
		});

	});

	socket.on("call-ended",function(callback) {

		var roomName = socket.roomName,
			sessionId = roomKeys[roomName].sessionId,
			archiveId = archives[sessionId];

		if(archiveId) {
			opentok.getArchive(archiveId, function(err, archive) {
				if (err) {
					callback(false,null);
				  	return console.log(err);
				}
			    callback(true,archive.url);
			});
		}
		else {
			callback(false,null);
		}	
	});

}); 

function getSocket(roomName,nickName) {

	var members = rooms[roomName];

	for(var i =0;i<members.length;i++) {

		if(members[i].nickName === nickName) {
			return members[i];
		}
	}

}


function createSession(roomName) {

	opentok.createSession({mediaMode:"routed"},function(err, session) {

		if (err) {
			console.log("Hmmm unable to create session");
		} else {
			
			token = opentok.generateToken(session.sessionId);
			roomKeys[roomName] = {
				sessionId : session.sessionId,
				token : token
			};

			var members = rooms[roomName];

			for(var i = 0; i< members.length ;i++) {
				var currentSocket = members[i];
				currentSocket.emit("keys-generated",{sessionId :session.sessionId,token : token,apiKey : apiKey });
			}
		}
	});

}

server.listen(3000,function() {
	console.log("express server running");
});
