/******************************************************
 * hapi-to-express
 * ---------------
 *
 * This module returns a function that creates
 * mocked Express request and response objects
 * that internally call the Hapi objects passed
 * to the function.
 *
 * @params
 *      request: a Hapi request object, ideally
 *               within a 'onPostAuth' server
 *               extension point so that
 *               `request.payload` can be read
 *               and written to.
 *      reply:   a Hapi reply object, also hopefully
 *               in the 'onPostAuth' extension point.
 * @returns
 *      { res: ..., req: ... } - an object where `res`
 *      represents an Express response object and `req`
 *      represents an Express request object. Very limited
 *      API at the moment
 *
 * Notes: currently supporting a limited API based on
 *      Hapi 8.* and Express 4.* APIs
 ******************************************************/
var through = require('through2');

var hapiToExpress = function hapiToExpress(request, reply) {
  var res, req, responseStream, headers = {}, status = 200;

  function createStream () {
      if (responseStream) return;
      responseStream = through();
      responseStream.on('error', reply);
  }

  req = request.raw.req;
  req.body = request.payload || {};
  req.query = request.query;

  res = {
    getHeader: function(headerName) {
      return headers[headerName.toLowerCase()];
    },

    setHeader: function(headerName, headerValue) {
      headers[headerName.toLowerCase()] = headerValue;
    },
    removeHeader: function(headerName) {
      delete headers[headerName.toLowerCase()]
    },

    writeHead: function(resStatus, resHeader) {
      for (var header in resHeader) {
        if (resHeader.hasOwnProperty(header)) {
          res.setHeader(header, resHeader[header]);
        }
      }
      status = resStatus;
    },

    end: function() {
      var response;

      if (responseStream) {
        responseStream.end.apply(responseStream, arguments);
        response = reply(responseStream);
      }
      else {
	response = reply(arguments[0]);
      }

      response.code(status);
      for (header in headers) {
        if (headers.hasOwnProperty(header)) {
          response.header(header, headers[header]);
        }
      }
    },

    write: function() {
      createStream();
      responseStream.write.apply(responseStream, arguments);
    },

    redirect: function() {
      if (typeof arguments[0] === 'string') {
        reply.redirect(arguments[0]);
      }
      else {
        reply.redirect(arguments[1]).code(arguments[0]);
      }
    },

    // // Untested
    // on: function() {
    //   createStream();
    //   // TODO some events (like end) can be triggered even when not using the stream as a response.
    //   s.on.apply(responseStream, arguments);
    // }

  };

  return {
    res: res,
    req: req
  };
};

module.exports = hapiToExpress;
