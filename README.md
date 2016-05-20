# ``SMSMTP``
Single Mail SMTP tester.

A simple testing tool that stores exactly one email per recipient
address and displays the contents in an HTML page served over a
simple HTTP server.

## Installation
```
npm install -g smsmtp
```
## Start
```
smsmtp
```

## Usage
Point your outbound SMTP setup for the server under test to
`127.0.0.1:2525` (or whatever you set `SMSMTP_HOST`:`SMSMTP_PORT` to).

Use your server to send an email to some address, e.g. `test@foo.com`.

Point your browser to `http://127.0.0.1:3000/test@foo.com`
(or whatever you set `SMSMTP_HTTP_PORT`:`SMSMTP_HTTP_HOST` to).

The server will keep only the last email sent to each recipient
address in memory. No persistence, whatsoever.


## Configuration
The server listens for connections on port 2525 (SMTP) and 3000 (HTTP).
This can be overridden by setting the environment variables

- `SMSMTP_PORT` for the SMTP listening port
- `SMSMTP_HOST` for the SMTP bind address / host
- `SMSMTP_HTTP_PORT` for the HTTP listening port
- `SMSMTP_HTTP_HOST` for the HTTP bind address / host

## Credits
This is heavily inspired by [Jonas Mosbech's](https://github.com/jmosbech)
[/mail/null](https://github.com/jmosbech/mail-null) interactive SMTP
testing tool. This package is reduced to the max, uses the successor of
simplesmtp [smtp-server](https://github.com/andris9/smtp-server) and is
optimized for streamlined CI testing.

## Author
[Ingo Struck](https://github.com/istr)

## License
MIT
