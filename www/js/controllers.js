angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $rootScope, $ionicModal, $timeout, $localStorage, $ionicPopup, AuthFactory, ContainerFactory) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
  $scope.loginData = $localStorage.getObject('userinfo', '{}');
  $scope.registration = {};
  $scope.loggedIn = false;
  if (AuthFactory.isAuthenticated()) {
    $scope.loggedIn = true;
    $scope.username = AuthFactory.getUsername();
  }

  $scope.containerList = undefined;
  $scope.standardContainer = undefined;
  $scope.selectedContainer = undefined;

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);
    $localStorage.storeObject('userinfo', $scope.loginData);
    AuthFactory.login($scope.loginData);
    $scope.closeLogin();
  };

  $scope.logOut = function() {
    AuthFactory.logout();
    $scope.loggedIn = false;
    $scope.username = '';
  };

  $rootScope.$on('login:Successful', function() {
    $scope.loggedIn = AuthFactory.isAuthenticated();
    $scope.username = AuthFactory.getUsername();
    ContainerFactory.query(function(response) {
        $scope.containerList = response;
        var message = '<div><p>' + JSON.stringify(response) + '</p></div>';

        var alertPopup = $ionicPopup.info({
          title: '<h4>Could load containers!</h4>',
          template: message
        });


      },
      function(response) {
        var message = '<div><p>' + JSON.stringify(response) + '</p></div>';

        var alertPopup = $ionicPopup.info({
          title: '<h4>Could load containers!</h4>',
          template: message
        });
        console.log("COULD N: " + JSON.stringify(response));
      });
  });



  $ionicModal.fromTemplateUrl('templates/register.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.registerform = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeRegister = function() {
    $scope.registerform.hide();
  };

  // Open the login modal
  $scope.register = function() {
    $scope.registerform.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doRegister = function() {
    console.log('Doing registration', $scope.registration);
    $scope.loginData.username = $scope.registration.username;
    $scope.loginData.password = $scope.registration.password;

    AuthFactory.register($scope.registration);

  };

  $rootScope.$on('registration:Successful', function() {
    $scope.loggedIn = AuthFactory.isAuthenticated();
    $scope.username = AuthFactory.getUsername();
    $localStorage.storeObject('userinfo', $scope.loginData);
    $scope.closeRegister();
  });



})

.controller('PlaylistsCtrl', function($scope) {
  $scope.playlists = [{
    title: 'Reggae',
    id: 1
  }, {
    title: 'Chill',
    id: 2
  }, {
    title: 'Dubstep',
    id: 3
  }, {
    title: 'Indie',
    id: 4
  }, {
    title: 'Rap',
    id: 5
  }, {
    title: 'Cowbell',
    id: 6
  }];
})

.controller('PlaylistCtrl', function($scope, $stateParams) {});