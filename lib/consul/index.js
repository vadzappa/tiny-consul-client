const Promise = require('bluebird'),
	consul = require('./consul'),
	{normalizeServiceInfo, usernameKvKey, passwordKvKey} = require('./utils'),
	_ = require('lodash'),
	cache = {},
	cacheTimeouts = {},
	cacheNext = {};

exports.getService = (serviceName) => {
	return exports.getServicesList(serviceName)
		.then(() => {
			return cache[serviceName][cacheNext[serviceName]];
		});
};

exports.getServicesList = (serviceName) => {
	if (cache[serviceName]) {
		cacheNext[serviceName]++;
		if (cacheNext[serviceName] >= cache[serviceName].length) {
			cacheNext[serviceName] = 0;
		}
		return Promise.resolve(cache[serviceName]);
	}
	return Promise.all([
		consul.kv.get(usernameKvKey(serviceName)),
		consul.kv.get(passwordKvKey(serviceName)),
		consul.health.service({
			service: serviceName,
			passing: true
		})
	])
		.then(([[usernameData], [passwordData], [data]]) => {
			const auth = {
					username: usernameData ? usernameData.Value : null,
					password: passwordData ? passwordData.Value : null
				},
				servicesList = _.reduce(data, (services, node) => {
					services.push(normalizeServiceInfo(node.Service, auth));
					return services;
				}, []);

			clearTimeout(cacheTimeouts[serviceName]);
			cache[serviceName] = servicesList;
			cacheNext[serviceName] = 0;
			cacheTimeouts[serviceName] = setTimeout(() => {
				delete cache[serviceName];
				delete cacheNext[serviceName];
			}, 10 * 1000).unref();
			return servicesList;
		});
};