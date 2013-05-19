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

        // join room
        socket.join(room);

        // tell the role
        socket.emit('role', role);

        // if admin add to list
        if (role == 'adm') {
            adms[room] = socket.id;

            // clean adm list on disconnect
            // so next client will get to be the admin
            socket.on('disconnect', function () {
                delete adms[room];
            });

            // update stats for new admin
            stats(room);
        }
        else {
            //  call stats on disconnect
            socket.on('disconnect', function () {
                stats(room);
            });
        }    
    });

    // When new instrument joins 
    socket.on('instrument', function(data) {

        // if admin left and no new
        // admin came in THIS IS BUG
        // IN THE WAY WE SELECT NEW ADMIN
        if (!adms[data.room]) {
            return;
        }
        
        // mark socket to generate stats
        socket.set('instrument', data.sound, function () {
            // Report to admin which one
            // this is sent to all clients
            stats(data.room);
        });
    });


    // Once admin requests a HIT
	socket.on('hit', function(data) {
        // Hit the instrument!
		io.sockets.in(data.room).emit('hit', data.sound);
	});

    // Start playing the pattern
    socket.on('start', function (data) {
        var step = 0;
        var interval = setInterval(function () { pattern(data, step++); }, 60000 / data.tempo / 4);
        socket.on('stop', function (data) {
            clearInterval(interval);
        });
    });
});

// pattern step, this is called
// on each of the steps during pattern loop
function pattern (data, step) {
    // if there is anything to play
    if (data.pattern[step % data.pattern.length]) {
        // play all sounds at once
        for (var i in data.pattern[step % data.pattern.length]) {
            io.sockets.in(data.room).emit('hit', data.pattern[step % data.pattern.length][i]);
        }
    }
}

// This is called to update
// stats at the admin side
function stats (room) {
    var stats   = {};
    var clis    = io.sockets.clients(room);
    for (var i in clis) {
        clis[i].get('instrument', function (err, name) {
            if (name) {
                if (!stats[name]) {
                    stats[name] = 1;
                }
                else {
                    stats[name]++;
                }
            }
        })
    }
    // in case of no admin it breaks
    if (!adms[room]) {
        return;
    }
    io.sockets.sockets[adms[room]].emit('instrument', stats);

}
