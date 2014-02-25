exports.name = 'hapi-navigation';
exports.version = '0.4.1';

var internals = {};
var useragent = require('useragent');

internals.isMobile = {
  'iOS': true,
  'Windows Phone': true,
  'Android': true,
  'BlackBerry OS': true,
  'BlackBerry Tablet OS': true,
  'Symbian OS': true
};

internals.setUserAgent = function(request, callback) {
  request.plugins['hapi-navigation'] = request.plugins['hapi-navigation'] || {};
  request.plugins['hapi-navigation'].agent = useragent.lookup(request.raw.req.headers['user-agent']);

  request.plugins['hapi-navigation'].isMobile = function() {
    return internals.isMobile[request.plugins['hapi-navigation'].agent.os.family] || false;
  };

  return callback();
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

exports.register = function (plugin, options, callback) {

  internals.cache = plugin.cache({
    shared: true,
    expiresIn: 24 * 60 * 60 * 1000 // 1 day
  });

  internals.plugin = plugin;

  plugin.ext('onRequest', internals.setUserAgent);
  plugin.ext('onPreResponse', internals.setContext);
};
