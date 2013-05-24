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
        var timeout = setTimeout(function () { pattern(data, step++); }, 60000 / data.tempo / 4);
        socket.on('stop', function (data) {
            clearTimeout(timeout);
        });
    });
});

// pattern step, this is called
// on each of the steps during pattern loop
function pattern (data, step) {

    // get list of patterns for this step
    var pattern = data.pattern[step % data.pattern.length];

    // if nothing to play we JUMP jump jump! Everybody jump!
    if (!pattern) {
        return;
    }
    // play all sounds in this step at once
    for (var i in pattern) {
        // Hit the instrument!
        io.sockets.in(data.room).emit('hit', pattern[i]);
    }
    var timeout = setTimeout(function () { pattern(data, step++); }, 60000 / data.tempo / 4);
}

// This is called to update
// stats at the admin side
function stats (room) {

    // this is the stats we return (emit)
    var stats   = {};

    // get all sockets in this room
    var clis    = io.sockets.clients(room);

    // loop through them
    for (var i in clis) {

        // get data we assign to socket and do something in the callback
        clis[i].get('instrument', function (err, name) {

            // only count if there is an instrument assigned
            if (!name) {
                return;
            }

            // if first time we see this name ZERO it
            if (!stats[name]) {
                stats[name] = 0;
            }
            
            // update stat counter
            stats[name]++;
        })
    }

    // in case of no admin it breaks
    if (!adms[room]) {
        return;
    }

    // send STATS updated to admin
    io.sockets.sockets[adms[room]].emit('instrument', stats);
}
