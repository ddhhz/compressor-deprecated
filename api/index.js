var express      = require('express');
var morgan       = require('morgan');
var compression  = require('compression');
var bodyParser   = require('body-parser');
var UglifyJS     = require('uglify-js');
var CleanCSS     = require('clean-css');
var HTMLMinifier = require('html-minifier');
var errorhandler = require('errorhandler');
var zlib         = require('zlib');
var api          = express();

if (process.env.NODE_ENV === 'development') {
  api.use(errorhandler());
  api.use(morgan('dev'));
} else {
  api.use(morgan('combined'));
}

api.use(compression());

/**
 * CORS support.
 */

api.all('*', function(req, res, next){
  if (!req.get('Origin')) {
    return next();
  }

  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

  if ('OPTIONS' === req.method) {
    return res.send(200);
  }
  next();
});

api.use(bodyParser.urlencoded({
  extended: true,
  limit: '1mb'
}));

api.get('/', function (req, res) {
  res.redirect(301, 'https://compressor.wei.technology');
});

api.get('/status', function (req, res) {
  res.status(200).json({status: 'ok'});
});

api.post('/javascript/', function (req, res) {

  if (!req.body.code) {
    res.status(500).json('No code. :(').end();
    return;
  }

  var mangleKeys = ['toplevel'];

  var compressOptions = {};
  var mangleOptions = {};

  Object.keys(req.body.options).forEach(function (key) {
    var value = req.body.options[key];
    if (value === 'true') {
      value = true;
    }
    if (value === 'false') {
      value = false;
    }
    if (value === '') {
      value = null;
    }
    if (~mangleKeys.indexOf(key)) {
      mangleOptions[key] = value;
    } else {
      compressOptions[key] = value;
    }
  });

  try {
    res.json(UglifyJS.minify(req.body.code, {
      fromString: true,
      compress: compressOptions,
      mangle: mangleOptions,
    }));
  } catch (error) {
    // users don't need to see filestructure of server
    delete error.stack;
    res.status(500).json(error);
  }

});

api.post('/css/', function (req, res) {

  if (!req.body.code) {
    res.status(500).json('No code. :(').end();
    return;
  }

  var options = {};

  Object.keys(req.body.options).forEach(function (key) {
    var value = req.body.options[key];
    if (value === 'true') {
      value = true;
    }
    if (value === 'false') {
      value = false;
    }
    if (value === '') {
      value = null;
    }
    if (key === 'roundingPrecision') {
      value = parseInt(value, 10) || 2;
    }
    options[key] = value;
  });

  res.json({
    code: new CleanCSS(options).minify(req.body.code).styles
  });

});

api.post('/html/', function (req, res) {

  if (!req.body.code) {
    res.status(500).json('No code. :(').end();
    return;
  }

  var options = {};

  Object.keys(req.body.options).forEach(function (key) {

    var value = req.body.options[key];

    if (!value) {
      return;
    }

    switch (key) {
      case 'processScripts':
        options[key] = value.split(',');
        break;
      case 'ignoreCustomComments':
      case 'customAttrAssign':
      case 'customAttrSurround':
        options[key] = value.split(',').map(function (re) {
          return new RegExp(re);
        });
        break;
      case 'customAttrCollapse':
        options[key] = new RegExp(value);
        break;
      case 'maxLineLength':
        options[key] = parseInt(value, 10);
        break;
      default:
        options[key] = value === 'true';
        break;
    }

  });

  try {
    output = HTMLMinifier.minify(req.body.code, options);
    res.json({ code: output });
  } catch (error) {
    res.status(500).json('HTML Minify does not report any useful errors, but there was an error. :(');
  }

});

api.post('/gz/:fileName', function (req, res) {
  zlib.gzip(req.body.code, function (_, result) {
    res.send(result);
  });
});

api.all('*', function (req, res) {
  res.status(404).end();
});

port = Number(process.env.PORT || 3000);

api.listen(port, function() {
  console.log('Server listening on port ' + port);
});
