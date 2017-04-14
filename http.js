'use strict';
// built-in
var http = require('http');
var path = require('path');
// external modules
var cache = require('memory-cache');

var bind = process.env.SMSMTP_HTTP_BIND || '127.0.0.1';
var port = process.env.SMSMTP_HTTP_PORT || 3000;
var host = process.env.SMSMTP_HTTP_HOST || 'localhost';

var prefix = [
  '<!DOCTYPE html><html>',
  '<head>',
  '<meta charset="utf-8"><title>smsmtp</title>',
  '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">',
  '</head>',
  '<style>',
  'html,body{width:100%;position:absolute;margin:0;padding:0;}',
  'ul,li{list-style:none;display:inline-block;margin:0;padding:0;}',
  'th{text-align:right;}',
  'iframe{border:0;}',
  '#headers,#plaintext{font-family:monospace;background:#eee;overflow:auto;}',
  '#htmltext,#plaintext{width:100%;}',
  '#headers,#htmltext,#plaintext{max-width:100%;}',
  '</style>',
  '<body>'
];
var suffix = [
'</body>',
"<script>window.addEventListener('message',function(e){var t=document.getElementById('htmltext');if(t&&e.data&&e.data.h){t.style.height=e.data.h+'px';}});</script>",
'</html>'
];

var testrecipient = 'test@smsmtp.com';
var testmail = {
  html: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>testmail</title><style>p{color:green;}</style></head><body><p>Hello, Test!</p></body></html>',
  text: 'Hello, Test!',
  headers: {
    'From': 'smsmtp@smsmtp.com',
    'To': testrecipient
  }
};

var pushHeaders = function(content, mail) {
  var headers = mail && mail.headers || {};
  var keys = Object.keys(headers);
  content.push('<div id="headers"><table>');
  keys.map(function(key) {
    content.push('<tr>');
    content.push('<th>', key, '</th>');
    content.push('<td><ul><li>', [].concat(headers[key]).join('</li><li>'), '</li></ul></td>')
    content.push('</tr>');
  });
  content.push('</table></div>');
};

var pushHTML = function(content, mail) {
  var html = '<base target="_blank" />';
  html += mail.html || '';
  (mail.attachments || []).forEach(function(attachment) {
    var regex = new RegExp('cid:' + attachment.contentId, 'g');
    html = html.replace(regex, "data:image/png;base64," + attachment.content);
  });
  html += '<script>window.parent.postMessage({h:document.body.scrollHeight},"*");</script>';
  content.push('<iframe',
    ' id="htmltext"',
    ' ref="hc"',
    ' scrolling="no"',
    ' src="data:text/html;charset=utf-8,', encodeURIComponent(html), '">',
    '</iframe>'
  );
};

var pushPlain = function(content, mail) {
  content.push('<pre id="plaintext">', mail.text || '', '</pre>');
};

http.createServer(function(request, response) {
  var requestPath = request.url;
  if (-1 !== requestPath.indexOf('?')) {
    requestPath = request.url.split('?')[0];
  }
  if (0 !== requestPath.indexOf('/')) {
    requestPath = '/' + requestPath;
  }
  if (-1 !== requestPath.indexOf('/')) {
    const parts = requestPath.split('/');
    parts.shift();
    requestPath = (parts || []).join('/');
  }
  var content = [].concat(prefix);
  var mail;
  if (testrecipient === requestPath) {
    mail = testmail;
  } else {
    mail = cache.get(requestPath);
  }
  var statusCode = 404;
  var statusMessage = 'not found';
  if (mail) {
    statusCode = 200;
    statusMessage = 'ok';
    pushHeaders(content, mail);
    pushHTML(content, mail);
    pushPlain(content, mail);
  } else {
    if ('' === requestPath) {
      requestPath = 'please provide recipient email address (<a href="test@smsmtp.com">test@smsmtp.com</a> to test)';
    } else {
      requestPath = 'no mail for: ' + requestPath;
    }
    content.push('<div id="notfound">', requestPath, '</div>');
  }
  content = content.concat(suffix);
  response.writeHead(statusCode, statusMessage, {
    'Content-Type': 'text/html;charset=utf-8'
  });
  response.end(content.join(''));
}).listen(port, bind, function() {
  console.log('SMSMTP HTTP frontend listening on: %s:%s', bind, port, ' for: http://' + host + ':' + port);
});
