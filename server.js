var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8443);

// Index
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Static files
app.use('/css', express.static(__dirname + '/css'));
app.use('/img', express.static(__dirname + '/img'));
app.use('/snd', express.static(__dirname + '/snd'));

// Room needs to be after sound files
// for precedence reasons
app.get('/:room', function (req, res) {
  res.sendfile(__dirname + '/room.html');
});

// hold all adm for the rooms
var adms = {};

// On new connections (from admin or instrument)
io.sockets.on('connection', function (socket) {

    // once a new client joins the server
    socket.on('join', function (room) {

        // define role
        var role = adms[room] ? 'cli' : 'adm';

        // if admin add to list
        if (role == 'adm') {
            adms[room] = socket.id;

            // clean adm list on disconnect
            // so next client will get to be the admin
            socket.on('disconnect', function () {
                delete adms[room];
            });
        }
        
        // join room
        socket.join(room);

        // tell the role
        socket.emit('role', role);
    });

    // When new instrument joins 
    socket.on('instrument', function(data) {

        // if admin left and no new
        // admin came in THIS IS BUG
        // IN THE WAY WE SELECT NEW ADMIN
        if (!adms[data.room]) {
            return;
        }

        // Report to admin which one
        // this is sent to all clients
        io.sockets.sockets[adms[data.room]].emit('instrument', data.sound);


    });


    // Once admin requests a HIT
	socket.on('hit', function(data) {
        // Hit the instrument!
		io.sockets.in(data.room).emit('hit', data.sound);
	});
});
