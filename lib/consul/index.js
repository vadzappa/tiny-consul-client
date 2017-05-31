const Promise = require('bluebird'),
	consul = require('./consul'),
	{normalizeServiceInfo, usernameKvKey, passwordKvKey, tokenKvKey, serviceConfigKvKey} = require('./utils'),
	_ = require('lodash'),
	cache = {},
	cacheTimeouts = {},
	cacheNext = {},
	configCache = {},
	configCacheTimeouts = {};

exports.getService = (serviceName) => {
	return exports.getServicesList(serviceName)
		.then(() => {
			cacheNext[serviceName]++;
			if (cacheNext[serviceName] >= cache[serviceName].length) {
				cacheNext[serviceName] = 0;
			}
			return cache[serviceName][cacheNext[serviceName]];
		});
};

exports.getServicesList = (serviceName) => {
	if (cache[serviceName]) {
		return Promise.resolve(cache[serviceName]);
	}
	return Promise.all([
		consul.kv.get(usernameKvKey(serviceName)),
		consul.kv.get(passwordKvKey(serviceName)),
		consul.kv.get(tokenKvKey(serviceName)),
		consul.health.service({
			service: serviceName,
			passing: true
		})
	])
		.then(([[usernameData], [passwordData], [tokenData], [data]]) => {
			const auth = {
					username: usernameData ? usernameData.Value : null,
					password: passwordData ? passwordData.Value : null,
					token: tokenData ? tokenData.Value : null
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

exports.getConfigValue = (selfService, key, defaultValue = null) => {
	const cacheKey = `${selfService}-${key}`;
	if (configCache[cacheKey]) {
		return Promise.resolve(configCache[cacheKey]);
	}
	return consul.kv.get(serviceConfigKvKey(selfService, key))
		.then(([keyValueData]) => {
			if (!keyValueData || !keyValueData.Value) {
				return defaultValue;
			}
			clearTimeout(configCacheTimeouts[cacheKey]);
			configCache[cacheKey] = keyValueData.Value;
			configCacheTimeouts[cacheKey] = setTimeout(() => {
				delete configCache[cacheKey];
			}, 10 * 1000).unref();
			return keyValueData.Value;
		});
};

exports.storeAccessToken = (selfService, token) => {
	return consul.kv.set(tokenKvKey(selfService), token);
};