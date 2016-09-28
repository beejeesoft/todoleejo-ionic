angular.module('starter.controllers', [])

.controller('AppCtrl', function(DebugFactory, $ionicPlatform, $cordovaToast, $scope, $rootScope, $ionicModal, $timeout, $localStorage, $ionicPopup, AuthFactory, ContainerFactory) {

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

  var loadList = function() {
    ContainerFactory.getList(function(list) {
      $scope.containerList = list;
      DebugFactory.debug("Loaded container list ...");
    }, function(error) {
      DebugFactory.debug("Could not load container list");
    });

  };

  $rootScope.$on('login:Successful', function() {
    $scope.loggedIn = AuthFactory.isAuthenticated();
    $scope.username = AuthFactory.getUsername();
    // Loading the containers for the logged in user
    $scope.getContainerList();
    DebugFactory.debug('Login Success');

  });

  $scope.getContainerList = function(callback, error) {
    ContainerFactory.query({}, function(response) {
        $scope.containerList = response;
      },
      function(response) {
        DebugFactory.debug("Could not load Container " + JSON.stringify(response));
      });
  };

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

.controller('ContainerController', ['$scope', 'ContainerFactory', '$ionicPopup', 'baseURL', function($scope, ContainerFactory, $ionicPopup, baseURL) {


}])

.controller('ToDoController', ['$scope', 'baseURL', 'ToDoFactory', '$state', '$stateParams', 'DebugFactory', 'TransitionFactory', function($scope, baseURL, ToDoFactory, $state, $stateParams, DebugFactory, TransitionFactory) {

  $scope.baseURL = baseURL;
  $scope.taskState = 'open';

  // Markers for showing the buttons in the nav bar
  $scope.shouldShowDelete = false;
  $scope.shouldShowReorder = false;
  $scope.listCanSwipe = true;

  // toggle the buttons visibility onoff
  $scope.toggleShowDelete = function() {
    $scope.shouldShowDelete = !$scope.shouldShowDelete;
  };

  $scope.toggleShowReorder = function() {
    $scope.shouldShowReorder = !$scope.shouldShowReorder;
  };



  // Calling get for the selected container
  // loading all of the todos belonging to this container and the logged in user
  ToDoFactory.query({
    containerId: $stateParams.containerId
  }, function(todos) {
    $scope.filterToResultLists(todos);
  }, function(error) {
    DebugFactory.debug('Error loading todos: ' + JSON.stringify(error));
  });

  // This really hurts. Instead of having all todos in one list and 
  // using a filter I have to split them because using filters destroys the
  // index that is delivered by delete or reorder operations on lists.
  // so we seperate them. 
  $scope.todosOpen = [];
  $scope.todosInProgress = [];
  $scope.todosDone = [];


  /**
   * Does the split from the server response according to the
   * state of each todo. At the moment we are not interested in
   * deleted items.
   */
  $scope.filterToResultLists = function(list) {

    var resultList = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].state === 'open') {
        $scope.todosOpen.push(list[i]);
      } else if (list[i].state === 'inProgress') {
        $scope.todosInProgress.push(list[i]);
      } else if (list[i].state === 'done') {
        $scope.todosDone.push(list[i]);
      }
    }
  };

  // After create/update operations we have to put the
  // todo in the right list. 
  $scope.stateListAdd = function(todo) {
    if (todo.state === 'open') $scope.todosOpen.push(todo);
    else if (todo.state === 'inProgress') $scope.todosInProgress.push(todo);
    else if (todo.state === 'done') $scope.todosDone.push(todo);
  };

  // if arrows are pressed then we have to transfer the
  // todo in the appropriate state.

  $scope.swipe = function(todo, list, direction, index) {
    // Remove the element from list for the duration of the update
    list.splice(index, 1);
    //DebugFactory.debug("SWIPE : " + direction + " ..." + index + " ..." + JSON.stringify(todo.summary));

    // Call the server to do the transition
    TransitionFactory.update({
        id: todo._id
      }, {
        'todoId': todo._id,
        'direction': direction
      },
      function(response) {
        //DebugFactory.debug('Successfully called');
        // Server updated the todo so lets put it into the right list.
        $scope.stateListAdd(response);
      },
      function(error) {
        DebugFactory.debug('Error calling transition:' + JSON.stringify(error));
        // Reload the list if something goes wrong on the way
        $state.go($state.current, null, {
          reload: true
        });
      });

  };

  $scope.editTodo = function(todo, list, index) {
    DebugFactory.debug("EDIT : " + index + " ..." + todo.summary);
  };

  $scope.deleteTodo = function(todo, list, index) {
    //items.splice($index, 1); 
    DebugFactory.debug("DELETE : " + index + " ..." + todo.summary);
  };

  // createing a new entry
  $scope.createTodo= function(){
    DebugFactory.debug("CREATE NEW");
  };

  /**
   * Moving around the list items by swapping their places
   */
  $scope.reorderItem = function(item, list, fromIndex, toIndex) {
    DebugFactory.debug("REORDER: " + fromIndex + "... " + toIndex);
    var tmp = list[toIndex];
    list[toIndex] = list[fromIndex];
    list[fromIndex] = tmp;
  };

}])


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