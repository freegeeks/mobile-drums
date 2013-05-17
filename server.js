var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8443);

// Index
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Instruments
app.get('/coin.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/coin.wav');
});
app.get('/tom.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/tom.wav');
});
app.get('/sn.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/sn.wav');
});
app.get('/bd.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/bd.wav');
});
app.get('/hh1.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/hh1.wav');
});
app.get('/hh2.wav', function (req, res) {
  res.sendfile(__dirname + '/wav/hh2.wav');
});

// Room needs to be after instruments
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
        io.sockets[adms[data.room]].emit('instrument', data.wav);
    });


    // Once admin requests a HIT
	socket.on('hit', function(data) {
        // Hit the instrument!
		io.sockets.in(data.room).emit('hit', data.wav);
	});
});

// clean adm list on disconnect
// so next client will get to be the admin
io.sockets.on('disconnect', function (socket) {
    for (var room in io.sockets.manager.roomClients[socket.id]) {
        if (adms[room.substring(1)] == socket.id) {
            adms[room.substring(1)] == null;
        }
    }
});
