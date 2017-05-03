const {fromCallback} = require('./utils'),
	consul = require('consul')({
		host: process.env.CONSUL_IP || '192.168.45.100',
		port: process.env.CONSUL_PORT || '8500',
		promisify: fromCallback
	});

module.exports = consul;