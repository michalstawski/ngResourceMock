/**
 * Decorator fot the ngResource to allow easy mocking of the resource.
 */
(function() {
	'use strict';
	var module = angular.module('ngResource');
	module.decorator('$resource', function($delegate, $q, $rootScope, $timeout) {
		//TODO: replace with actions from real $resource
		var defaultActions = {
			'get': {
				method: 'GET'
			},
			'save': {
				method: 'POST'
			},
			'query': {
				method: 'GET',
				isArray: true
			},
			'remove': {
				method: 'DELETE'
			},
			'delete': {
				method: 'DELETE'
			}
		};
		//var defaultActions = $delegate.defaults.actions;
		/**
		 * Factory method for creating the actual resource mock.
		 */
		return function resourceMockProvider(url, paramDefaults, configuredActions, options) {
			var actions = angular.extend(defaultActions, configuredActions);
			var config = {
				autoFlush: false,
				instanceExpectations: true
			};

			var ResourceMock = function(data) {
				init.call(this);
				angular.extend(this, data);
				ResourceMock.$instances.push(this);
			};
			ResourceMock.null = {};
			ResourceMock.undefined = {};
			ResourceMock.$instances = [];

			function init() {
				this.$when = {};
				this.$expectations = [];
				this.$unresolvedExpectations = [];
			}

			init.call(ResourceMock);

			ResourceMock.setMockingConfiguration = function(newConfig) {
				angular.extend(config, newConfig);
			};
			ResourceMock.verifyNoOutstandingExpectation = function() {
				if (this.$expectations.length !== 0) {
					throw new Error("Unmet expectations");
				}
			};
			ResourceMock.flush = ResourceMock.prototype.flush = function() {
				angular.forEach(this.$unresolvedExpectations, function(expectation) {
					expectation.resolve();
				});
			};

			ResourceMock.flushAll = function() {
				this.flush();
				angular.forEach(this.$instances, function(instance) {
					instance.flush();
				});
			};
			angular.forEach(actions, function(action, name) {
				addWhen(action, name);
				addExpect(action, name);
				addMock(action, name);
				addInstanceMock(action, name);
			});

			function addWhen(action, name) {
				var whenName = 'when' + capitalizeFirstLetter(name);
				var whenSetter = function(instance, condition) {
					if (!instance.$when[name]) {
						instance.$when[name] = [];
					}
					instance.$when[name].push(condition);
				};
				ResourceMock[whenName] = ResourceMock.prototype[whenName] = expectationFactory(action, name, whenSetter);
			}

			function addExpect(action, name) {
				var expectName = 'expect' + capitalizeFirstLetter(name);
				var expectSetter = function(instance, condition) {
					instance.$expectations.push(condition);
				};
				ResourceMock[expectName] = ResourceMock.prototype[expectName] = expectationFactory(action, name, expectSetter);
			}
			/**
			 * Adds mocked actions to the resource.
			 */
			function addMock(action, name) {
				ResourceMock[name] = function() {
					var callArguments = parseArguments(name, arguments);
					var instance = config.instanceExpectations ? this : ResourceMock;
					var expectation = getMatchingExpectation.call(instance, name, callArguments.params, callArguments.data);
					var deferredExpectation = expectation.execute(name, callArguments.params, callArguments.data,
						callArguments.success, callArguments.error);
					if (!deferredExpectation.resolved) {
						instance.$unresolvedExpectations.push(deferredExpectation);
					}
					return deferredExpectation.result;
				};
			}
			/**
			 * Adds mocked actions to the resource instance.
			 */
			function addInstanceMock(action, name) {
				ResourceMock.prototype['$' + name] = function(params, success, error) {
					params = params || {};
					if (angular.isFunction(params)) {
						error = success;
						success = params;
						params = {};
					}
					return ResourceMock[name].call(this, params, this, success, error).$promise;
				};
			}

			function expectationFactory(action, name, conditionSetter) {
				return function() {
					var callArguments = parseArguments(name, arguments);
					var expectation = new Expectation(name, action, callArguments.params,
						callArguments.data);
					var instance = config.instanceExpectations ? this : ResourceMock;
					conditionSetter(instance, expectation);
					var resolveResult = {
						andFlush: function() {
							expectation.setFlushed();
						}
					};
					var result = {
						resolve: function(data) {
							expectation.setResult(true, data);
							return resolveResult;
						},
						resolveSame: function() { //TODO: might be better to use resolve without params
							expectation.setResult(true, callArguments.data || callArguments.params);
							return resolveResult;
						},
						reject: function(data) {
							expectation.setResult(true, data);
							return resolveResult;
						},
						doNothing: function() {},
					};
					result.and = result;
					return result;
				};
			}

			/**
			 * Check current method invocation against existing expect and when conditions.
			 */
			function getMatchingExpectation(name, params, data) {
				var condition;
				//check expect conditions
				if (this.$expectations.length > 0 && this.$expectations[0].matches(name, params, data)) {
					return this.$expectations.shift();
				}
				//check when conditions
				for (var idx in this.$when[name]) {
					if (this.$when[name][idx].matches(name, params, data)) {
						return this.$when[name][idx];
					}
				}
				throw new Error("Unexpeced " + name);
			}

			function parseArguments(actionName, argumentList) {
				var hasBody = /^(POST|PUT|PATCH)$/i.test(actions[actionName].method);
				//Copy from the original
				var params = {},
					data, success, error;
				(function(a1, a2, a3, a4) {
					/* jshint -W086 */
					/* (purposefully fall through case statements) */
					switch (arguments.length) {
						case 4:
							error = a4;
							success = a3;
							//fallthrough
						case 3:
						case 2:
							if (angular.isFunction(a2)) {
								if (angular.isFunction(a1)) {
									success = a1;
									error = a2;
									break;
								}

								success = a2;
								error = a3;
								//fallthrough
							} else {
								params = a1;
								data = a2;
								success = a3;
								break;
							}
						case 1:
							if (angular.isFunction(a1)) success = a1;
							else if (hasBody) data = a1;
							else params = a1;
							break;
						case 0:
							break;
						default:
							throw new Error('badargs',
								"Expected up to 4 arguments [params, data, success, error], got {0} arguments",
								arguments.length);
					}
				}).apply(window, argumentList);
				return {
					data: data,
					params: params,
					success: success,
					error: error
				};
			}
			/**
			 * DeferredExpectation is created for each of the call to the mocked action methods. It is be used internally
			 * to resolve the results of the calls. It is accomplished by calling the resolve method.			 *
			 */
			function DeferredExpectation(deferred, success, resultStub, data, successCallback, errorCallback) {
				this.result = resultStub;

				this.resolve = function(defer) {
					generateResult();
					resultStub.$resolved = true;
					this.resolved = true;
					resolvePromise();
					invokeCallback(defer);
				};

				function invokeCallback(defer) {
					var callback = success ? successCallback : errorCallback;
					if (callback) {
						if (defer) {
							$timeout(callback, 0, resultStub);
						} else {
							callback(resultStub);
						}
					}
				}

				function resolvePromise() {
					if (success) {
						deferred.resolve(resultStub);
					} else {
						deferred.reject(resultStub);
					}
				}

				function generateResult() {
					if (Array.isArray(resultStub)) {
						if (!Array.isArray(data)) {
							throw new Error('Expected result to be an array');
						}
						angular.forEach(data, function(value, key) {
							resultStub[key] = new ResourceMock(value);
						});
					} else {
						angular.merge(resultStub, data);
					}
				}

			}

			/**
			 * Class representing when or expect expectation.
			 * Both the resource class and instances keep collection of the expectations to match the method calls against.
			 */
			function Expectation(expectedName, action, expectedParams, expectedData) {
				var internalState = {};
				this.execute = function(name, params, data, success, error) {
					if (!this.matches(name, params, data)) {
						throw new Error("Expectation does not match");
					}
					var deferred = $q.defer();
					var result = action.isArray ? [] : new ResourceMock();
					result.$promise = deferred.promise;
					var deferredExpectation = new DeferredExpectation(deferred, internalState.success, result,
						internalState.data,
						success,
						error);
					if (config.autoFlush || internalState.flush) {
						deferredExpectation.resolve(true);
					}
					return deferredExpectation;
				};

				function equalsNullable(actual, expected) {
					if (expected === ResourceMock.undefined && actual !== undefined) {
						return false;
					}
					if (expected === ResourceMock.null && actual !== null) {
						return false;
					}
					if (expected === ResourceMock.null || expected === ResourceMock.undefined) {
						return true;
					}
					return angular.equals(actual, expected);
				}
				this.matches = function(actualName, params, data) {
					if (actualName !== expectedName) {
						return false;
					}
					if (expectedParams && !equalsNullable(params, expectedParams)) {
						return false;
					}
					if (expectedData && !equalsNullable(data, expectedData)) {
						return false;
					}
					return true;
				};

				this.setResult = function(success, data) {
					internalState.resolve = true;
					internalState.success = success;
					internalState.data = data;
				};
				this.setFlushed = function() {
					internalState.flush = true;
				};
			}

			function capitalizeFirstLetter(string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			}

			return ResourceMock;
		};
	});
})();
