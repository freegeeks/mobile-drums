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

app.get('/:room', function (req, res) {
  res.sendfile(__dirname + '/room.html');
});

// On new connections (from admin or instrument)
io.sockets.on('connection', function (socket) {

    // When new instrument joins 
	socket.on('instrument', function(data) {
        // Report to admin
		io.sockets.emit(data.room + '-instrument', { wav: data.wav });
	});

    // Once admin requests a HIT
	socket.on('hit', function(data) {
        // Hit the instrument!
		io.sockets.emit(data.room + '-hit-' + data.wav);
	});

    // Client self discovery
    socket.on('ping', function (data) {
        io.sockets.emit('ping', { id: data.id, room: data.room });
    });
    socket.on('pong', function (data) {
        io.sockets.emit('pong', { id: data.id, room: data.room });
    });
});
