// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	url = require('url'),
	path = require('path'),
	mime = require('mime');
	fs = require("fs");
//var express = require("express");
//var app = express();
 
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	//Bellow creates a filepath for fs to read
	var filename = path.join(__dirname, "chatRoom", url.parse(req.url).pathname);
		(fs.exists || path.exists)(filename, function(exists){
			if (exists){
				fs.readFile(filename, function(err, data){
				// This callback runs when the client.html file has been read from the filesystem.
					//if the chat room is not accessable
					if(err){
						resp.writeHead(500, {"Content-Type":"text/plain"});
						resp.write("Internal server error: could not access chat room");
						resp.end();
						return;
					}
					//chat room exists and is readable
					var mimetype = mime.lookup(filename);
					resp.writeHead(200, {"Content-Type": mimetype});
					resp.end(data);
				});
			}
			else{
				//chat room does not exist
				resp.writeHead(404, {"Content-Type": "text/plain"});
				resp.write("Client Inaccessable");
				resp.end();
				return;
			}
		});
});
app.listen(3456);
//var screenNamesArr = {};
//var rooms = ['General', 'News', 'A&E', 'Features', 'Opinions', 'Sports'];

//creates a Room object with a name and an owner
	function Room(name, owner) {  
		this.name = name;
		//this.id = id;
		this.owner = owner;
		this.people = [];
		this.ids = [];
		//this.status = "available";
	}
	
	var gen = new Room('General', 'Default');
	var news = new Room('News', 'Default');
	var ae = new Room('AE', 'Default');
	var features = new Room('Features', 'Default');
	var opinions = new Room('Opinions', 'Default');
	var sports = new Room('Sports', 'Default');
	
	var createdRooms = {
		General: gen,
		News: news,
		AE: ae,
		Features: features,
		Opinions: opinions,
		Sports: sports
	};
	
	var privateRooms = {};


	



// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	
	
	
	//adds a specific person to a room
	Room.prototype.addPerson = function(personSN) {  
		this.people.push(personSN);
		
	};	
	
	// This callback runs when a new Socket.IO connection is established.
	socket.on('adduser', function(data){
		
		//if(rooms.size > 0){		
		//	for(var r in rooms){
		//		var newRoom = new Room(r, Default);
		//		console.log("Default room: " + r);
		//		createdRooms[r] = newRoom;
		//	}
		//}
		console.log("read this");
		socket.screenName = data;
		var currID = socket.id;
		socket.room = createdRooms.General.name;
		console.log(data + " HAS JOINED " + socket.room);
		
		
		//console.log(data.nameArray[data.currName] + "cant read this?");
		socket.join(socket.room);
		//createdRooms[General].people.push(socket.screenName);     //KEEPS ACCOUNT OF THE PEOPLE IN THE ROOM
		createdRooms.General.addPerson(socket.screenName);
		createdRooms.General.ids.push(currID);
		console.log(createdRooms.General.people[0] + " ARE IN " + socket.room);
		socket.emit('updatechat', 'chatbot', 'you have connected to General');
		socket.broadcast.to(socket.room).emit('updatechat', 'chatbot', data + ' has joined the chat');
		socket.emit('updaterooms', {
			//defaultRooms: rooms,
			otherRooms: createdRooms,
			current_room: socket.room
		});
		io.sockets.in(socket.room).emit('updateusers', {
			people: createdRooms.General.people,
			currRoom: createdRooms[socket.room]
		});
	});
	
	
	socket.on('allow', function(data){
		if(data.entered == data.real){
			var array = createdRooms;
			if((socket.room in createdRooms) === false){
				array = privateRooms;			
			}
			var index = array[socket.room].people.indexOf(socket.screenName);
			array[socket.room].people.splice(index, 1);
			socket.broadcast.to(socket.room).emit('updateusers', {
				people: array[socket.room].people,
				currRoom: array[socket.room]
			});
			socket.broadcast.to(socket.room).emit('updatechat', 'chatbot', socket.screenName+' has left this room');
		
			socket.leave(socket.room);
			socket.room = data.door;
			socket.join(socket.room);
			privateRooms[socket.room].addPerson(socket.screenName);
			io.sockets.in(socket.room).emit('updateusers', {
				people: privateRooms[socket.room].people,
				currRoom: privateRooms[socket.room]
			});
			
			socket.broadcast.to(socket.room).emit('pmjoined', {
				scname: 'chatbot',
				infoo: socket.screenName+' has joined this room'
			});
		
			socket.emit('goAhead', {
				sname: 'chatbot',
				info: 'you have connected to '+ socket.room,
				
			});
		}else{
			var msg = 'Wrong password. Acess denied.';
			socket.emit('denied', msg);
		}
		
	});
	
	
	socket.on('deleteroom', function(data){
		delete privateRooms[data];
		
		
	});
	
	socket.on('createPrivateRoom', function(data){
		var index = createdRooms[socket.room].people.indexOf(socket.screenName);
		createdRooms[socket.room].people.splice(index, 1);
		
		socket.broadcast.to(socket.room).emit('updatechat', 'chatbot', socket.screenName+' has left this room');
		
		var newRoom = new Room(data.room, socket.screenName);
		privateRooms[data.room] = newRoom;
		socket.broadcast.to(socket.room).emit('updateusers', {
			people: createdRooms[socket.room].people,
			currRoom: createdRooms[socket.room]
		});
		privateRooms[data.room].addPerson(socket.screenName);
		socket.leave(socket.room);
		socket.room = data.room;
		socket.join(socket.room);
		//socket.emit('joinUrRoom', data.room);
		
		io.emit('updateprivaterooms', {
			pRooms: privateRooms,
			password: data.pass,
			curr_room: socket.room
		});
		console.log("private list is update");

		socket.emit('goAhead', {
				sname: 'chatbot',
				info: 'you have connected to '+ socket.room,
				
		});
		
		io.sockets.in(data.name).emit('updateusers', {
			people: privateRooms[data.room].people,
			currRoom: privateRooms[data.room]
		});
	});

	//users can creat new rooms by using the option below the list of rooms
	socket.on('createRoom', function(name) {
		console.log("the create room emission has been detected");
		var newRoom = new Room(name, socket.screenName);
		console.log("name of new room is: " + name + "which should be the same as" + newRoom.name);
		createdRooms[name] = newRoom;
		//createdRooms[name].push(newRoom);
		console.log("the array of new rooms should be set? " + createdRooms[name].name);
		console.log("owner of "+ createdRooms[name].name + " is " + createdRooms[name].owner);
		//socket.room = name;
		//socket.join(socket.room);
		
		socket.emit('joinUrRoom', name);
		
		//createdRooms[name].addPerson(socket.screenName);
		
		io.emit('updaterooms', {
			//defaultRooms: rooms,
			otherRooms: createdRooms,
			current_room: newRoom.name
		});
		
		
		io.sockets.in(name).emit('updateusers', {
			people: createdRooms[name].people,
			currRoom: createdRooms[name]
		});
	});
	
	//when a user presses send, their message is sent to the rest of the users in the chatroom
	socket.on('sendchat', function(data){
		io.sockets.in(socket.room).emit('updatechat', socket.screenName, data);
		console.log("message: " + data);
	});
	
	
	//when a user clicks on a chatroom, they are placed in that chatroom
	socket.on('switchRoom', function(newroom){
		var array = createdRooms;
		if((socket.room in createdRooms) === false){
			array = privateRooms;			
		}
			
		var index = array[socket.room].people.indexOf(socket.screenName);
		array[socket.room].people.splice(index, 1);
		console.log("here is the private room " + socket.screenName + " is being kicked out of: " + array[socket.room].name);
		io.sockets.to(socket.room).emit('updateusers', {
			people: array[socket.room].people,
			currRoom: array[socket.room]
		});
		socket.broadcast.to(socket.room).emit('updatechat', 'chatbot', socket.screenName+' has left this room');
		socket.leave(socket.room);
		socket.room = newroom;
		socket.join(socket.room);
		socket.emit("goAhead",{
			sname: 'chatbot',
			info: 'you have connected to '+ newroom
		});
		//socket.emit('updatechat', 'chatbot', 'you have connected to '+ newroom);
		// sent message to OLD room
		
		// update socket session room title
		console.log(newroom +" AND " + createdRooms[newroom].name+ " is name of room  DADADADADADADADA.");
		if((createdRooms[newroom].people.includes(socket.screenName)) === false){
			createdRooms[newroom].addPerson(socket.screenName);
			createdRooms[newroom].ids.push(socket.id);
		}
		socket.broadcast.to(newroom).emit('updatechat', 'chatbot', socket.screenName+' has joined this room');
		socket.emit('updaterooms', {
			//defaultRooms: rooms,
			otherRooms: createdRooms,
			current_room: newroom
		});
		//socket.emit('updateList', createdRooms);
		io.sockets.in(socket.room).emit('updateusers', {
			people: createdRooms[newroom].people,
			currRoom: createdRooms[newroom]
		});
	});
	
	socket.on('pmuser', function(data){
		var index = createdRooms[socket.room].people.indexOf(data.uname);
		var pmid = createdRooms[socket.room].ids[index];
		var pmessage = data.pm;
		console.log(socket.screenName + " is getting a direct message");
		socket.broadcast.to(pmid).emit('readpm', {
			message: pmessage,
			sender: socket.screenName
		});
		
	});
	
	socket.on('removeuser', function(data){
		var array = createdRooms;
		if((socket.room in createdRooms) === false){
			array = privateRooms;			
		}
		var idarray = array[socket.room].ids;
		var index = array[socket.room].people.indexOf(data);
		var removeid = array[socket.room].ids[index];
		idarray.splice(index, 1);
		console.log("this user is being kicked out: " + data + " with userID " + removeid);
		//io.sockets.connected[removeid].disconnect();
		socket.broadcast.to(removeid).emit('joinUrRoom', 'General');
	});
	
	
	//disconnects user from socket
	socket.on('disconnect', function(){
		// remove the username from global usernames list		
		// update list of users in chat, client-side
		
		var index = createdRooms[socket.room].people.indexOf(socket.screenName);
		createdRooms[socket.room].people.splice(index, 1);
		// echo globally that this client has left
		io.sockets.in(socket.room).emit('updatechat', 'chatbot', socket.screenName + ' has disconnected');
		io.sockets.in(socket.room).emit('updateusers', {
			people: createdRooms[socket.room].people,
			currRoom: createdRooms[socket.room]
		});
		socket.leave(socket.room);
		
	});
	
});