var connect = require('connect')
var methods = require('methods')
var request = require('supertest')
var assert = require('assert')

var routify = require('./')

function okay(req, res, next) {
  res.statusCode = 204
  res.end()
}

function noop(req, res, next) {
  next()
}

describe('Routification', function () {
  methods.forEach(function (method) {
    if (method === 'delete') method = 'del'

    describe('app.' + method + '()', function () {
      var app = routify()
      app[method]('/asdf', okay)
      app[method]('/multiple', noop, noop, okay)
      app[method]('/:a/:b/:c/:d?', okay)

      it('should match', function (done) {
        request(app)
        [method]('/asdf')
        .expect(204, done)
      })

      it('should throw if any callbacks are not functions', function () {
        assert.throws(function () {
          app[method]('/kljasdf', 'klajsdflkjasdf', noop, okay)
        })
      })

      it('should work with multiple callbacks', function (done) {
        request(app)
        [method]('/multiple')
        .expect(204, done)
      })

      it('should populate req.params', function (done) {
        app[method]('/:a/:b', function (req, res, next) {
          var params = req.params
          params[0].should.equal('one')
          params[1].should.equal('two')
          params.a.should.equal('one')
          params.b.should.equal('two')
          next()
        }, okay)

        request(app)
        [method]('/one/two')
        .expect(204, done)
      })

      it('should work with optional params', function (done) {
        request(app)
        [method]('/a/b/c')
        .expect(204, function (err) {
          if (err) return done(err)

          request(app)
          [method]('/a/b/c/d')
          .expect(204, done)
        })
      })

      it('should work with a regexp', function (done) {
        app[method](/^\/user\/([0-9]+)\/(view|edit)?$/, okay)

        request(app)
        [method]('/user/10/edit')
        .expect(204, done)
      })
    })
  })

  describe('app.get()', function () {
    var app = routify()
    app.get('/asdf', okay)

    it('should match HEAD as well', function (done) {
      request(app)
      .head('/asdf')
      .expect(204, done)
    })
  })

  describe('app.all()', function () {
    var app = routify()

    app.all('/asdf', okay)

    describe('should match method: ', function () {
      methods.forEach(function (method) {
        if (method === 'delete') method = 'del'

        it(method, function (done) {
          request(app)
          [method]('/asdf')
          .expect(204, done)
        })
      })
    })
  })

  describe('routify(app)', function () {
    it('should wrap a connect instance', function () {
      var app = connect()
      routify(app)
      methods.forEach(function (method) {
        app[method].should.be.a.Function
      })
    })
  })

  describe('case sensitivity', function () {
    it('should be disabled by default', function (done) {
      var app = routify()
      app.get('/user', okay)
      request(app)
      .get('/USER')
      .expect(204, done)
    })

    describe('when enabled', function (done) {
      var app = routify({
        sensitive: true
      })
      app.get('/uSeR', okay)

      it('should match identical casing', function (done) {
        request(app)
        .get('/uSeR')
        .expect(204, done)
      })

      it('should not match otherwise', function (done) {
        request(app)
        .get('/user')
        .expect(404, done)
      })
    })
  })
})