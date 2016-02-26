describe('ngResourceMock', function() {
  var $resource, $rootScope, TestResource;
  var testData = {
    testProperty: 'testValue'
  };
  beforeEach(module('ngResource'));
  beforeEach(inject(function(_$resource_, _$rootScope_) {
    $resource = _$resource_;
    $rootScope = _$rootScope_;
  }))

  beforeEach(function() {
    TestResource = $resource();
  })
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

  });
  describe('resolve', function() {
    var expectedResult = {
      test: 'test'
    };
    var listener = {
      success: function(result) {}
    };
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
  });
});
