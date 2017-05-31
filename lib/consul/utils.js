const Promise = require('bluebird'),
	_ = require('lodash');

exports.usernameKvKey = serviceName => `auth/${serviceName}/username`;
exports.passwordKvKey = serviceName => `auth/${serviceName}/password`;
exports.tokenKvKey = serviceName => `auth/${serviceName}/token`;
exports.serviceConfigKvKey = (serviceName, key) => `config/${serviceName}/${key}`;

exports.fromCallback = (fn) => {
	return new Promise((resolve, reject) => {
		try {
			return fn((err, data, res) => {
				if (err) {
					err.res = res;
					return reject(err);
				}
				return resolve([data, res]);
			});
		} catch (err) {
			return reject(err);
		}
	});
};

exports.normalizeServiceInfo = (serviceData, auth) => {
	const normalizedData = _.transform(serviceData, (data, value, key) => {
		if (key.toLowerCase() === 'id') {
			data['id'] = value;
		} else {
			data[key[0].toLowerCase() + key.substr(1)] = value;
		}
	}, {});
	_.assign(normalizedData, auth);
	return normalizedData;
};