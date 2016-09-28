'use strict';

angular.module('starter.services', ['ngResource'])
  //.constant("baseURL", "http://localhost:6001/")
  .constant("baseURL", "https://todoleejo.eu-gb.mybluemix.net/")

.factory('ContainerFactory', ['$resource', 'baseURL', function($resource, baseURL) {

  return $resource(baseURL + "containers/", null, {
    'update': {
      method: 'PUT'
    },
    'query': {
      method: 'GET',
      isArray: true
    }
  });
}])

.factory('ToDoFactory', ['$resource', 'baseURL', function($resource, baseURL) {

  return $resource(baseURL + "todos/", null, {
     'update': {
      method: 'PUT'
    },
    'query': {
      method: 'GET',
      isArray: true
    }
  });
}])

.factory('TransitionFactory', ['$resource', 'baseURL', function($resource, baseURL){

    return $resource(baseURL + "todos/transition", null, {
      'update' : {
        method: 'PUT'
      }
    });

}])


.factory('$localStorage', ['$window', function($window) {
  return {
    store: function(key, value) {
      $window.localStorage[key] = value;
    },
    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    remove: function(key) {
      $window.localStorage.removeItem(key);
    },
    storeObject: function(key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function(key, defaultValue) {
      return JSON.parse($window.localStorage[key] || defaultValue);
    }
  }
}])

.factory('DebugFactory', ['$ionicPlatform', '$cordovaToast', function($ionicPlatform, $cordovaToast) {
  var debugFac = {};

  debugFac.debug = function(message) {
    $ionicPlatform.ready(function() {
      $cordovaToast
        .show(message, 'long', 'bottom')
        .then(function(success) {
          // success
        }, function(error) {
          // error
        });
    });
  };

  return debugFac;
}])

.factory('AuthFactory', ['$resource', '$http', '$localStorage', '$rootScope', 'baseURL', '$ionicPopup', function($resource, $http, $localStorage, $rootScope, baseURL, $ionicPopup) {

  var authFac = {};
  var TOKEN_KEY = 'Token';
  var isAuthenticated = false;
  var username = '';
  var authToken = undefined;


  function loadUserCredentials() {
    var credentials = $localStorage.getObject(TOKEN_KEY, '{}');
    if (credentials.username !== undefined) {
      useCredentials(credentials);
    }
  }

  function storeUserCredentials(credentials) {
    $localStorage.storeObject(TOKEN_KEY, credentials);
    useCredentials(credentials);
  }

  function useCredentials(credentials) {
    isAuthenticated = true;
    username = credentials.username;
    authToken = credentials.token;

    // Set the token as header for your requests!
    $http.defaults.headers.common['x-access-token'] = authToken;
  }

  function destroyUserCredentials() {
    authToken = undefined;
    username = '';
    isAuthenticated = false;
    $http.defaults.headers.common['x-access-token'] = authToken;
    $localStorage.remove(TOKEN_KEY);
  }

  authFac.login = function(loginData) {
    $rootScope.$broadcast('loading:show');

    $resource(baseURL + "users/login")
      .save(loginData,
        function(response) {
          $rootScope.$broadcast('loading:hide');
          storeUserCredentials({
            username: loginData.username,
            token: response.token
          });
          $rootScope.$broadcast('login:Successful');

        },
        function(response) {
          $rootScope.$broadcast('loading:hide');

          isAuthenticated = false;

          var message = '<div><p>' + response.data.err.message +
            '</p><p>' + response.data.err.name + '</p></div>';

          var alertPopup = $ionicPopup.alert({
            title: '<h4>Login Failed!</h4>',
            template: message
          });

          alertPopup.then(function(res) {
            console.log('Login Failed!');
          });
        }

      );

  };

  authFac.logout = function() {
    $resource(baseURL + "users/logout").get(function(response) {});
    destroyUserCredentials();
  };


  authFac.register = function(registerData) {
    $rootScope.$broadcast('loading:show');
    //console.log("Run " + baseURL + "users/register");
    $resource(baseURL + "users/register")
      .save(registerData,
        function(response) {
          $rootScope.$broadcast('loading:hide');
          authFac.login({
            username: registerData.username,
            password: registerData.password
          });

          $rootScope.$broadcast('registration:Successful');

        },
        function(response) {
          $rootScope.$broadcast('loading:hide');

          var message = '<div><p>' + response.data.err.message +
            '</p><p>' + response.data.err.name + '</p></div>';

          var alertPopup = $ionicPopup.alert({
            title: '<h4>Registration Failed!</h4>',
            template: message
          });

          alertPopup.then(function(res) {
            console.log('Registration Failed!');
          });
        }

      );
  };

  authFac.isAuthenticated = function() {
    return isAuthenticated;
  };

  authFac.getUsername = function() {
    return username;
  };

  authFac.facebook = function() {

  };

  loadUserCredentials();

  return authFac;

}]);