var connect = require('connect')
var methods = require('methods')
var pathToRegexp = require('path-to-regexp')

var parse = connect.utils.parseUrl

module.exports = routify

/**
 * routify()
 * routify(app)
 * routify(options)
 * routify(app, options)
 */

function routify(app, options) {
  if (!app) {
    app = connect()
    options = {}
  } else if (app.constructor === Object) {
    options = app
    app = connect()
  } else if (!options) {
    options = {}
  }

  app.routingSensitive = options.sensitive || false
  app.routingStrict = options.strict || false

  methods.forEach(function (method) {
    app[method] = function (path) {
      var options = {
        sensitive: app.routingSensitive,
        strict: app.routingStrict
      }

      flatten(arguments, 1).forEach(function (fn) {
        app.use(routify.create(method.toUpperCase(), path, fn, options))
      })
    }
  })

  app.all = function (path) {
    var options = app.routification

    flatten(arguments, 1).forEach(function (fn) {
      app.use(routify.create(null, path, fn, options))
    })
  }

  app.del = app.delete

  return app
}

routify.create = function (method, path, fn, options) {
  route.keys = []
  route.method = method ? method.toUpperCase() : null
  route.regexp = path.constructor.name === 'RegExp'
    ? path
    : pathToRegexp(path, route.keys, options)
  route.callback = fn
  // can't use .name :(
  route.title = fn.name

  return route

  function route(req, res, next) {
    if (route.method && (
      route.method !== req.method
      && !(route.method === 'GET' && req.method === 'HEAD')
    ))
      return next()

    var pathname = req.path || parse(req).pathname
    var m = route.regexp.exec(pathname)
    if (!m)
      return next()

    var params = req.params = {}
    var key
    var val

    for (var i = 1; i < m.length; i++) {
      key = route.keys[i - 1]
      try {
        val = 'string' === typeof m[i]
          ? decodeURIComponent(m[i])
          : m[i]
      } catch (e) {
        var err = new Error("Failed to decode param '" + m[i] + "'")
        err.status = 400
        err.route = route
        next(err)
        return
      }

      params[i - 1] = val
      if (key)
        params[key.name] = val
    }

    route.callback(req, res, next)
  }
}

function flatten(arr, i, ret) {
  i = i || 0
  ret = ret || []
  for (i; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      flatten(arr[i], 0, ret)
    } else {
      if (typeof arr[i] !== 'function')
        throw new TypeError('callbacks must be a function')

      ret.push(arr[i])
    }
  }
  return ret
}