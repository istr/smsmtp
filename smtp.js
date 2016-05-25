'use strict';

const cache = require('memory-cache');
const SMTPServer = require('smtp-server').SMTPServer;
const MailParser = require('mailparser').MailParser;

const bind = process.env.SMSMTP_BIND || '127.0.0.1';
const port = process.env.SMSMTP_PORT || 2525;
const host = process.env.SMSMTP_HOST || 'localhost';
const ttl = Math.max(0, 1000 * +(process.env.SMSMTP_TTL || '300'));
const freepass = 'free';
const token_min = 8;
const token_max = 32;
const token_pat = /^[0-9a-z]/;

const checkToken = function(token) {
  if (!token) {
    return 'missing';
  }
  token = '' + token;
  const len = token.length;
  if (token_min > len || token_max < len) {
    return 'must have ' + token_min + ' to ' + token_max + 'characters';
  }
  if (!token_pat.test(token)) {
    return 'must contain 0-9 a-z only';
  }
  return false;
};

var server = new SMTPServer({
  logger: true,
  banner: 'SMSMTP single mail local SMTP testing',
  requireAuthentication: true,
  hideSTARTTLS: true,
  size: 1 * 1024 * 1024, // 1 MB
  useXClient: true,
  useXForward: false,
  onAuth: function (auth, session, callback) {
    var username = auth && auth.username;
    var tokenInvalid = checkToken(username);
    if (tokenInvalid) {
      return callback(new Error('username ' + tokenInvalid));
    }
    return callback(null, {
      user: {
        username: auth.username
      }
    });
  },
  onConnect: function (session, callback) {
    if (session.remoteAddress !== '127.0.0.1') {
      return callback(new Error('Only connections from localhost allowed'));
    }
    return callback(); // Accept the connection
  },
  onData: function (stream, session, callback) {
    var mailparser = session.mailparser;
    const user = session.user;
    const username = user && user.username || 'unknown';
    const qMessage = 'Message queued, see: https://' + host + '/' + username + '/';
    var firstRecipient;
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
          if (!firstRecipient) {
            firstRecipient = recipient.address;
          }
          cache.put(username + '/' + recipient.address, email, ttl);
        });
        // accept the message once the mail parser is through
        callback(null, qMessage + (firstRecipient || ''));
      });
    }
    stream.on('end', function () {
      var err;
      if (stream.sizeExceeded) {
        err = new Error('Error: message exceeds fixed maximum message size 1 MB');
        err.responseCode = 552;
        return callback(err);
      }
    });
    stream.pipe(mailparser);
  }
});

server.on('error', function (err) {
  console.log('Error occurred');
  console.log(err);
});

// start listening
server.listen(port, bind);

console.log('SMSMTP SMTP backend (' + host + ') listening on: ' + bind + ':' + port);
