
/**
 * Bootstrap app.
 */

require.paths.unshift(__dirname + '/../../lib/');

/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , mustache = require('mustache')
  , sio = require('socket.io');

  var tmpl = {
      compile: function (source, options) {
          if (typeof source == 'string') {
              return function(options) {
                  options.locals = options.locals || {};
                  options.partials = options.partials || {};
                  if (options.body) // for express.js > v1.0
                      locals.body = options.body;
                  return mustache.to_html(
                      source, options.locals, options.partials);
              };
          } else {
              return source;
          }
      },
      render: function (template, options) {
          template = this.compile(template, options);
          return template(options);
      }
  };


/**
 * App.
 */

var app = express.createServer();

/**
 * App configuration.
 */
 app.configure(function() {
     app.use(express.methodOverride());
     app.use(express.bodyParser());
     app.use(app.router);
     app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }))
     app.set("views", __dirname);
     app.use(express.static(__dirname + '/public'));
     app.set("view options", {layout: false});
     app.register(".html", tmpl);
     app.use(express.errorHandler({
         dumpExceptions:true, 
         showStack:true
     }));
     function compile (str, path) {
       return stylus(str)
         .set('filename', path)
         .use(nib());
     };
 });
// app.configure(function () {
//   app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }))
//   app.use(express.static(__dirname + '/public'));
//   app.set('views', __dirname);
//   app.set('view engine', 'jade');

//   function compile (str, path) {
//     return stylus(str)
//       .set('filename', path)
//       .use(nib());
//   };
// });

/**
 * App routes.
 */

// app.get('/', function (req, res) {
//   res.render('index', { layout: false });
// });

app.get("/", function(req, res) {
    res.render("index.html", {
        locals: {
            message: "Hello World!",
            items: ["one", "two", "three"]
        },
        partials: {
            foo: "<h1>{{message}}</h1>",
            bar: "<ul>{{#items}}<li>{{.}}</li>{{/items}}</ul>"
        }
    });
});
/**
 * App listen.
 */

app.listen(3000, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(app)
  , nicknames = {};

io.sockets.on('connection', function (socket) {
  socket.on('user message', function (msg) {
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

  socket.on('nickname', function (nick, fn) {
    if (nicknames[nick]) {
      fn(true);
    } else {
      fn(false);
      nicknames[nick] = socket.nickname = nick;
      socket.broadcast.emit('announcement', nick + ' connected');
      io.sockets.emit('nicknames', nicknames);
    }
  });

  socket.on('disconnect', function () {
    if (!socket.nickname) return;

    delete nicknames[socket.nickname];
    socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
    socket.broadcast.emit('nicknames', nicknames);
  });
});
