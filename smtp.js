var cache = require('memory-cache');
var SMTPServer = require('smtp-server').SMTPServer;
var MailParser = require('mailparser').MailParser;

var port = process.env.SMSMTP_PORT || 2525;
var host = process.env.SMSMTP_HOST || '127.0.0.1';
var ttl = Math.max(0, 1000 * +(process.env.SMSMTP_TTL || '300'));

var server = new SMTPServer({
  logger: true,
  banner: 'SMSMTP single mail local SMTP testing',
  disabledCommands: ['AUTH'],
  hideSTARTTLS: true,
  size: 1 * 1024 * 1024, // 1 MB
  useXClient: false,
  useXForward: false,
  onConnect: function (session, callback) {
    if (session.remoteAddress !== '127.0.0.1') {
      return callback(new Error('Only connections from localhost allowed'));
    }
    return callback(); // Accept the connection
  },
  onData: function (stream, session, callback) {
    var mailparser = session.mailparser;
    if (!session.mailparser) {
      mailparser = new MailParser();
      session.mailparser = mailparser;
      mailparser.on('end', function (email) {
        email.attachments = (email.attachments||[]).map(function(attachment){
          var b = new Buffer(attachment.content);
          attachment.content = b.toString('base64');
          return attachment;
        });
        (email.to || []).forEach(function(recipient) {
          cache.put(recipient.address, email, ttl);
        });
      });
    }
    stream.pipe(mailparser);
    stream.on('end', function () {
      var err;
      if (stream.sizeExceeded) {
        err = new Error('Error: message exceeds fixed maximum message size 1 MB');
        err.responseCode = 552;
        return callback(err);
      }
      callback(null, 'Message queued'); // accept the message once the stream is ended
    });
  }
});

server.on('error', function (err) {
  console.log('Error occurred');
  console.log(err);
});

// start listening
server.listen(port, host);

console.log('SMSMTP SMTP backend listening on: ' + host + ':' + port);
