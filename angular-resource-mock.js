(function() {
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
		return function resourceMockProvider(url, paramDefaults, configuredActions, options) {
			var actions = angular.extend(defaultActions, configuredActions);
			var defaultConfig = {
				autoFlush: false,
				instanceExpectations: true
			};

			var ResourceMock = function() {
				init.call(this);
			};
			ResourceMock.null = {};
			ResourceMock.undefined = {};

			function init() {
				this.$when = {};
				this.$pendingDefers = [];
				this.$expectations = [];
				this.$unresolvedExpectations = [];
			}

			init.call(ResourceMock);

			ResourceMock.setMockingConfiguration = function(config) {
				angular.extend(defaultConfig, config);
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

			function addMock(action, name) {
				ResourceMock[name] = ResourceMock.prototype[name] = function(a1, a2, a3, a4) {
					var callArguments = parseArguments(arguments);
					var expectation = getMatchingExpectation.call(this, name, callArguments.params, callArguments.data);
					var deferredExpectation = expectation.execute(name, callArguments.params, callArguments.data,
						callArguments.success, callArguments.error);
					if (!deferredExpectation.resolved) {
						this.$unresolvedExpectations.push(deferredExpectation);
					}
					return deferredExpectation.result;
				};
			}

			function addInstanceMock(action, name) {
				ResourceMock.prototype['$' + name] = function(params, success, error) {
					if (angular.isFunction(params)) {
						error = success;
						success = params;
					}
					return this[name](params, this, success, error).$promise;
				};
			}

			function expectationFactory(action, name, conditionSetter) {
				return function(params, post) {
					var callArguments = parseArguments(arguments);
					var expectation = new Expectation(name, action, callArguments.params,
						callArguments.data);
					conditionSetter(this, expectation);
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
							expectation.setResult(true, post || params);
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

			function getMatchingExpectation(name, params, data, instance) {
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

			function parseArguments(argumentList) {
				var success, error, data, params;
				//FIXME not exact copy
				switch (argumentList.length) {
					case 4:
						error = argumentList[3];
						success = argumentList[2];
						//fallthrough
					case 3:
					case 2:
						if (angular.isFunction(argumentList[1])) {
							if (angular.isFunction(argumentList[0])) {
								success = argumentList[0];
								error = argumentList[1];
								break;
							}
							success = argumentList[1];
							error = argumentList[2];
							//fallthrough
						} else {
							params = argumentList[0];
							data = argumentList[1];
							success = argumentList[2];
							break;
						}
					case 1:
						if (angular.isFunction(argumentList[0])) success = argumentList[0];
						else data = argumentList[0];
						break;
					case 0:
						break;
				}
				return {
					data: data,
					params: params,
					success: success,
					error: error
				};
			}

			function DeferredExpectation(deferred, success, result, data, successCallback, errorCallback) {
				this.result = result;
				this.resolve = function() {
					var callback;
					angular.extend(result, data);
					result.$resolved = true;
					this.resolved = true;
					if (success) {
						deferred.resolve(result);
						callback = successCallback;
					} else {
						deferred.reject(result);
						callback = errorCallback;
					}
					if (callback) {
						callback(result);
					}
				};
			}

			function Expectation(expectedName, action, expectedParams, expectedData) {
				var internalState = {};
				this.execute = function(name, params, data, success, error) {
					if (!this.matches(name, params, data)) {
						throw new Error("Expectation does not match");
					}
					var deferred = $q.defer();
					var result = action.isArray ? [] : {};
					result.$promise = deferred.promise;
					var deferredExpectation = new DeferredExpectation(deferred, internalState.success, result, internalState.data,
						success,
						error);
					if (internalState.flush) {
						deferredExpectation.resolve();
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
