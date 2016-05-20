'use strict';
var cache = require('memory-cache');
var http = require('http');

var port = process.env.SMSMTP_HTTP_PORT || 3000;
var host = process.env.SMSMTP_HTTP_HOST || '127.0.0.1';

var prefix = [
	'<!DOCTYPE html><html>',
	'<head><meta charset="utf-8"><title>smsmtp</title></head>',
	'<body>'
];
var suffix = [
'</body>',
'</html>'
];

http.createServer(function(request, response) {
	var requestPath = request.url;
  if (-1 !== requestPath.indexOf('?')) {
		requestPath = request.url.split('?')[0];
	}
	if (-1 !== requestPath.indexOf('/')) {
		requestPath = request.url.split('/')[1];
	}
	var content = [].concat(prefix);
	var mail = cache.get(requestPath);
	var statusCode = 404;
	var statusMessage = 'not found';
	if (mail) {
		statusCode = 200;
		statusMessage = 'ok';
		console.log('MAIL: ', mail);
	} else {
		if ('' === requestPath) {
			requestPath = 'please provide recipient email address';
		} else {	
			requestPath = 'no mail for: ' + requestPath;
		}
		content.push('<div id="notfound">');
		content.push(requestPath);
		content.push('</div>');
	}
	content = content.concat(suffix);
	response.writeHead(statusCode, statusMessage, {
		'Content-Type': 'text/html;charset=utf-8'
	});
	response.end(content.join(''));
}).listen(port, host, function() {
	console.log('SMSMTP HTTP frontend listening on: http://%s:%s', host, port);
});
