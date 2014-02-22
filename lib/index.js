exports.name = 'hapi-navigation';
exports.version = '0.0.1';

var internals = {};

exports.register = function (plugin, options, callback) {

  internals.cache = plugin.cache({
    shared: true,
    expiresIn: 24 * 60 * 60 * 1000 // 1 day
  });

  internals.plugin = plugin;

  plugin.ext('onPreResponse', internals.setContext);
};

internals.getPaths = function(request, callback) {

  internals.cache.get('paths', function(err, result) {

    if(err) {
      internals.plugin.log(['plugin', 'hapi-navigation', 'error', 'cache', 'get'], err);
    }

    if(result && result.item) {
      return callback(null, result.item);
    }

    var paths = {};
    var table = request.server.table();

    for(var route in table) {
      route = table[route];
      var name = route.settings.app.name;
      var path = route.settings.app.path || route.settings.path;
      if(name && path) paths[name] = path;
    }
    callback(null, paths);

    internals.cache.set('paths', paths, 24 * 60 * 60 * 1000, function(err) {
      if(err) internals.plugin.log(['plugin', 'hapi-navigation', 'error', 'cache', 'set'], err);
    });
  });
};

internals.setContext = function(request, next) {
  var response = request.response;

  if(response.variety === 'view') {
    var context = response.source.context;
    context = context || {};
    context.nav = {};

    // Populate nav.paths
    internals.getPaths(request, function(err, paths) {
      if(err) throw err;
      context.nav.paths = paths;
      context.nav.current = request.route.app.name || request.route.path;
      next();
    });
  }
  else {
    return next();
  }
};

