ngResourceMock
=======
**This software is in the early state of development, please use with caution.**
Why
----
This project aims to simplify testing of applications that make use of the ngResource. When testing the use of ngResource there are two main approaches: mocking the resource itself or using ```$httpBackend``` to mock the http responses. Both of those approaches have significant drawbacks. Mocking of the resource is quite a tedious task. The same can be said for mocking the http responses. Moreover it crosses the abstraction layer, as we not only test our code, but the ngResource itself. It makes the tests unnecessarily complex and dificult to read.

ngResourceMock simplifies the task by providing a simple, yet flexible mocking API.

Here is a simple example usage:
```javascript
it('sould resolve the call with given data', function() {
  var expectedResult = {
    test: 'test'
  };
  TestResource.expectSave(testData).resolve(expectedResult);
  var actualResult = TestResource.save(testData);
  TestResource.flush();
  expect(angular.equals(actualResult, expectedResult)).toBe(true);
});
```

*Please note:* the comparison is accomplished using the ```angular.equals``` method as it ignores properties starting with ```$```. The resulting object, just like with ngResource has ```$promise``` and ```$resolved``` properties that you can use.

How
---
The ngResourceMock is implemented in the form of a decorator on the ```$resource``` factory. To use it you need to add ng-resource-mock.js to the files loaded by karma.

The api is similar to the API of the ```$httpBackend```. The mock adds following methods to the resource service/instance:
* ```whenAction``` - e.g. (```whenSave```, ```whenQuery```, etc.) creates when expectation. Accepts two arguments that are interpreted - the same way they would be interpreted on a real action call - as either request parameters or the post data. The arguments serve as patterns that the requests are matched against. If argument is falsy the expectation matches requests regardless. To check against null or undefined values please use the null and undefined fields of the resource eg.

  ```javascript
  MockedResource.whenSave(MockedResource.null)
  ```

  The call returns an object with following methods:
  * ```resolve(data)``` - resolves the request with given data
  * ```resolveSame()``` - resolves the request with the post data passed to the action method
  * ```reject(data)``` - rejects the request with given data

  Moreover each of the methods results has ```andFlush()``` method.
* ```expectAction``` - creates expectation. Similar to ```whenAction```.
* ```flush``` - flushes all unresolved requests
* ```verifyNoOutstandingExpectation```

The ngResourceMock supports both instance and class usage. When used for instances it remembers and matches expectations per instance.

The ngResourceMock supports fluent API making following possible:
```javascript
MockedResource.whenSave().resolveSame().andFlush();
```


Whishlist
---
* By default the mock should delegate the method calls to the real resource
