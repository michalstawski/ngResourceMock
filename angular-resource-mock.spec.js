describe('ngResourceMock', function() {
  'use strict';
  var $resource, $rootScope, TestResource, $timeout;
  var testData = {
    testProperty: 'testValue'
  };
  var expectedResult = {
    test: 'test'
  };
  var listener = {
    success: function(result) {}
  };

  beforeEach(module('ngResource'));
  beforeEach(inject(function(_$resource_, _$rootScope_, _$timeout_) {
    $resource = _$resource_;
    $rootScope = _$rootScope_;
    $timeout = _$timeout_;
  }));

  beforeEach(function() {
    TestResource = $resource();
  });

  describe('default actions', function() {
    it('should have default methods', function() {
      expect(angular.isFunction(TestResource.get)).toBe(true);
      expect(angular.isFunction(TestResource.save)).toBe(true);
      expect(angular.isFunction(TestResource.query)).toBe(true);
      expect(angular.isFunction(TestResource.remove)).toBe(true);
      expect(angular.isFunction(TestResource.delete)).toBe(true);
    });
    it('should have expects for default methods', function() {
      expect(angular.isFunction(TestResource.expectGet)).toBe(true);
      expect(angular.isFunction(TestResource.expectSave)).toBe(true);
      expect(angular.isFunction(TestResource.expectQuery)).toBe(true);
      expect(angular.isFunction(TestResource.expectRemove)).toBe(true);
      expect(angular.isFunction(TestResource.expectDelete)).toBe(true);
    });
    it('should have whens for default methods', function() {
      expect(angular.isFunction(TestResource.whenGet)).toBe(true);
      expect(angular.isFunction(TestResource.whenSave)).toBe(true);
      expect(angular.isFunction(TestResource.whenQuery)).toBe(true);
      expect(angular.isFunction(TestResource.whenRemove)).toBe(true);
      expect(angular.isFunction(TestResource.whenDelete)).toBe(true);
    });
  });
  it('should throw error on unmet expectation', function() {
    expect(function() {
      TestResource.save({});
    }).toThrow();
  });
  describe('when', function() {
    it('should match a request', function() {
      TestResource.whenSave(testData);
      TestResource.save(testData);
    });
    it('should match multiple requests', function() {
      TestResource.whenSave();
      TestResource.save(testData);
      TestResource.save(testData);
    });
    it('should match any request', function() {
      TestResource.whenSave();
      TestResource.save(testData);
    });
    it('should not match a request', function() {
      TestResource.whenSave(testData);
      expect(function() {
        TestResource.save({});
      }).toThrow();
    });
    describe('multiple', function() {
      it('should allow multiple matches', function() {
        TestResource.whenSave(testData);
        TestResource.whenSave({});
        TestResource.save(testData);
        TestResource.save({});
      });
      it('order should not matter matches', function() {
        TestResource.whenSave(testData);
        TestResource.whenSave({});
        TestResource.save({});
        TestResource.save(testData);
      });
    });
  });
  describe('expect', function() {
    it('should match a request', function() {
      TestResource.expectSave(testData);
      TestResource.save(testData);
    });
    it('should not match multiple requests', function() {
      TestResource.expectSave();
      TestResource.save(testData);
      expect(function() {
        TestResource.save(testData);
      }).toThrow();
    });
    it('should match any request', function() {
      TestResource.expectSave();
      TestResource.save(testData);
    });
    it('should not match a request', function() {
      TestResource.expectSave(testData);
      expect(function() {
        TestResource.save({});
      }).toThrow();
    });
    describe('multiple', function() {
      it('should match in order', function() {
        TestResource.expectSave(testData);
        TestResource.expectSave({});
        TestResource.save(testData);
        TestResource.save({});
      });
      it('should not match in the wrong order', function() {
        TestResource.expectSave(testData);
        TestResource.expectSave({});
        expect(function() {
          TestResource.save({});
        }).toThrow();
      });
    });
  });
  describe('custom actions', function() {
    //TODO
  });
  describe('resolve', function() {
    it('should resolve the call with given data', function() {
      TestResource.expectSave(testData).and.resolve(expectedResult);
      var actualResult = TestResource.save(testData);
      TestResource.flush();
      expect(angular.equals(actualResult, expectedResult)).toBe(true);
    });
    it('should resolve the promise with given data', function() {
      TestResource.expectSave(testData).and.resolve(expectedResult);
      spyOn(listener, 'success');

      TestResource.save(testData).$promise.then(listener.success);

      TestResource.flush();
      $rootScope.$digest();
      expect(listener.success).toHaveBeenCalled();
      var actualResult = listener.success.calls.argsFor(0)[0];
      expect(angular.equals(actualResult, expectedResult)).toBe(true);
    });
    it('should call the callback function with given data', function() {
      TestResource.expectSave(testData).and.resolve(expectedResult);
      spyOn(listener, 'success');

      TestResource.save(testData, listener.success);

      TestResource.flush();
      $rootScope.$digest();
      expect(listener.success).toHaveBeenCalled();
      var actualResult = listener.success.calls.argsFor(0)[0];
      expect(angular.equals(actualResult, expectedResult)).toBe(true);
    });

  });
  describe('mock instance', function() {
    var testInstance;
    beforeEach(function() {
      testInstance = new TestResource();
    });
    it('should resolve the call with given data', function() {
      var result;
      testInstance.whenSave().resolve(expectedResult);
      testInstance.$save().then(function(data) {
        result = data;
      });
      testInstance.flush();
      $rootScope.$digest();
      expect(angular.equals(result, expectedResult)).toBe(true);
    });
    it('should be independent from "class" expectations', function() {
      var result;
      TestResource.whenSave().resolve({});
      testInstance.whenSave().resolve(expectedResult);
      testInstance.$save().then(function(data) {
        result = data;
      });
      testInstance.flush();
      $rootScope.$digest();
      expect(angular.equals(result, expectedResult)).toBe(true);
    });
  });
  describe('configuration', function() {
    describe('disable instance expectations', function() {
      it('should resolve instance calls with class expectations', function() {
        var result;
        TestResource.setMockingConfiguration({
          instanceExpectations: false
        });
        var testInstance = new TestResource();
        TestResource.whenSave().resolve(expectedResult).andFlush();
        testInstance.$save().then(function(data) {
          result = data;
        });
        $rootScope.$digest();
        expect(angular.equals(result, expectedResult)).toBe(true);
      });
    });
    describe("autoFlush", function() {
      it('autoFlush should return the value immediately', function() {
        TestResource.setMockingConfiguration({
          autoFlush: true
        });
        TestResource.whenSave().resolve(expectedResult);
        var result = TestResource.save(testData);
        expect(angular.equals(result, expectedResult)).toBe(true);
      });
      it('autoFlush should resolve the promise immediately', function() {
        TestResource.setMockingConfiguration({
          autoFlush: true
        });
        spyOn(listener, 'success');
        TestResource.whenSave().resolve(expectedResult);
        TestResource.save(testData).$promise.then(listener.success);
        $rootScope.$digest();
        expect(listener.success).toHaveBeenCalled();
      });
      it('autoFlush should call the callback immediately', function() {
        TestResource.setMockingConfiguration({
          autoFlush: true
        });
        spyOn(listener, 'success');
        TestResource.whenSave().resolve(expectedResult);
        TestResource.save(testData, listener.success);
        $timeout.flush();
        expect(listener.success).toHaveBeenCalled();
      });
    });
  });
  describe('array actions', function() {
    it('result is array', function() {
      TestResource.whenQuery().resolve([expectedResult]).andFlush();
      var result = TestResource.query();
      expect(Array.isArray(result));
    });
    it('resolves call with data', function() {
      TestResource.whenQuery().resolve([expectedResult]).andFlush();
      var result = TestResource.query();
      expect(result.length).toBe(1);
      expect(angular.equals(result[0], expectedResult)).toBe(true);
    });
    it('data is a resource instance', function() {
      TestResource.whenQuery().resolve([expectedResult]).andFlush();
      var result = TestResource.query();
      expect(result[0] instanceof TestResource).toBe(true);
    });
    it('returned resource instance works', function() {
      TestResource.whenQuery().resolve([expectedResult]).andFlush();
      var result = TestResource.query();
      result[0].whenSave().resolve(expectedResult);
      result[0].$save();
    });
  });
  describe('flush', function() {
    var instanceListener = {
      success: function() {}
    };
    it('flushes multiple requests', function() {
      TestResource.whenSave().resolve(expectedResult);
      TestResource.whenSave().resolve(expectedResult);
      spyOn(listener, 'success');

      TestResource.save(listener.success);
      TestResource.save(listener.success);

      expect(listener.success).not.toHaveBeenCalled();
      TestResource.flush();
      expect(listener.success).toHaveBeenCalledTimes(2);
    });
    it('flushes only instance calls', function() {
      TestResource.whenSave().resolve(expectedResult);
      var testResource = new TestResource();
      testResource.whenSave().resolve(expectedResult);
      spyOn(listener, 'success');
      spyOn(instanceListener, 'success');

      TestResource.save(listener.success);
      testResource.$save(instanceListener.success);

      expect(instanceListener.success).not.toHaveBeenCalled();
      testResource.flush();
      expect(listener.success).not.toHaveBeenCalled();
      expect(instanceListener.success).toHaveBeenCalled();
    });
    it('flushes only class calls', function() {
      TestResource.whenSave().resolve(expectedResult);
      var testResource = new TestResource();
      testResource.whenSave().resolve(expectedResult);
      spyOn(listener, 'success');
      spyOn(instanceListener, 'success');

      TestResource.save(listener.success);
      testResource.$save(instanceListener.success);

      expect(listener.success).not.toHaveBeenCalled();
      TestResource.flush();
      expect(instanceListener.success).not.toHaveBeenCalled();
      expect(listener.success).toHaveBeenCalled();
    });
    it('flush all flushes all calls', function() {
      TestResource.whenSave().resolve(expectedResult);
      var testResource = new TestResource();
      testResource.whenSave().resolve(expectedResult);
      spyOn(listener, 'success');
      spyOn(instanceListener, 'success');

      TestResource.save(listener.success);
      testResource.$save(instanceListener.success);

      expect(listener.success).not.toHaveBeenCalled();
      expect(instanceListener.success).not.toHaveBeenCalled();
      TestResource.flushAll();
      expect(instanceListener.success).toHaveBeenCalled();
      expect(listener.success).toHaveBeenCalled();
    });
  });
});
