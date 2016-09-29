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



  $rootScope.$on('login:Successful', function() {
    $scope.loggedIn = AuthFactory.isAuthenticated();
    $scope.username = AuthFactory.getUsername();
    // Loading the containers for the logged in user
    $scope.getContainerList(function() {
      // success
    }, function() {
      // error
    });
    DebugFactory.debug('Login Success');

  });

  /**
   * Getting the containers for the logged in user
   * Callbacks can be used to watch the end of this operation.
   */

  $scope.getContainerList = function(callback, error) {
    ContainerFactory.query({}, function(response) {
        $scope.containerList = response;
        callback();
      },
      function(response) {
        DebugFactory.debug("Could not load Container " + JSON.stringify(response));
        error();
      });
  };


  $rootScope.$on('container:getList', function(callback, error){
    callback(containerList);
  });

  $rootScope.$on('container:reload', function(callback, error) {
    $scope.getContainerList(callback, error);
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

.controller('ContainerController', ['$scope', '$rootScope','ContainerFactory', '$state', '$stateParams', '$ionicPopup', 'baseURL', 'DebugFactory', function($scope, $rootScopeContainerFactory,$state, $stateParams, $ionicPopup, baseURL, DebugFactory) {

  
  $scope.shouldShowDelete = false;
  $scope.toggleShowDelete = function() {
    return !$scope.shouldShowDelete;
  };

  $rootScope.$broadcast('container:getList', function(response){
    DebugFactory.debug("HAHAHAHAH");
    $scope.containerList = response;
  });

}])

.controller('ToDoController', ['$scope', '$rootScope', 'baseURL', 'ToDoFactory', '$state', '$stateParams', 'DebugFactory', 'TransitionFactory', '$ionicModal', '$ionicPopup', 'ContainerFactory', function($scope, $rootScope, baseURL, ToDoFactory, $state, $stateParams, DebugFactory, TransitionFactory, $ionicModal, $ionicPopup, ContainerFactory) {

  $scope.baseURL = baseURL;

  // We start with the open tab visible
  $scope.taskState = 'open';

  // Markers for showing the buttons in the nav bar
  $scope.shouldShowDelete = false;
  $scope.shouldShowReorder = false;

  // toggle the buttons visibility onoff
  $scope.toggleShowDelete = function() {
    $scope.shouldShowDelete = !$scope.shouldShowDelete;
  };

  $scope.toggleShowReorder = function() {
    $scope.shouldShowReorder = !$scope.shouldShowReorder;
  };


  // This really hurts. Instead of having all todos in one list and 
  // using a filter I have to split them because using filters destroys the
  // index that is delivered by delete or reorder operations on lists.
  // so we seperate them. 
  $scope.todosOpen = [];
  $scope.todosInProgress = [];
  $scope.todosDone = [];

  // Dev helpers
  var logInfo = function(info) {
    DebugFactory.debug("Info " + JSON.stringify(info));
  }
  var logError = function(error) {
    DebugFactory.debug("Error: " + JSON.stringify(errror));
  };


  /**
   * Does the split from the server response according to the
   * state of each todo. At the moment we are not interested in
   * deleted items.
   */
  var filterToResultLists = function(list) {

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
  var stateListAdd = function(todo) {
    getStateList(todo).push(todo);
  };

  var stateListRemove = function(todo, index) {
    getStateList(todo).splice(index, 1);
  };

  var getStateList = function(todo) {
    if (todo.state === 'open') return $scope.todosOpen;
    else if (todo.state === 'inProgress') return $scope.todosInProgress;
    else if (todo.state === 'done') return $scope.todosDone;
  };


  // Calling get for the selected container
  // loading all of the todos belonging to this container and the logged in user
  ToDoFactory.query({
    containerId: $stateParams.containerId
  }, function(todos) {
    filterToResultLists(todos);
  }, function(error) {
    DebugFactory.debug('Error loading todos: ' + JSON.stringify(error));
  });




  // if arrows are pressed then we have to transfer the
  // todo in the appropriate state.
  $scope.doSwipe = function(todo, list, direction, index) {
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
        stateListAdd(response);
      },
      function(error) {
        DebugFactory.debug('Error calling transition:' + JSON.stringify(error));
        // Reload the list if something goes wrong on the way
        $state.go($state.current, null, {
          reload: true
        });
      });

  };

  /**
   * Moving around the list items by swapping their places
   */
  $scope.doReorderItem = function(item, list, fromIndex, toIndex) {
    var tmp = list[toIndex];
    list[toIndex] = list[fromIndex];
    list[fromIndex] = tmp;
  };


  /**
   * Modal Dialogs
   * Create and Edit
   */

  // Create the create modal that we will use on create
  $ionicModal.fromTemplateUrl('templates/todocreate.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.createModal = modal;
  });

  // Create the create modal that we will use on create
  $ionicModal.fromTemplateUrl('templates/todoedit.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.editModal = modal;
  });


  // Scope Model used in the create modal dialog
  $scope.createTodoModel = {};

  // Scope Model used in the edit modal dialog
  $scope.editTodoModel = {};


  /**
   * Edit a todo
   */
  $scope.doEditTodo = function(todo, list, index) {
    DebugFactory.debug("EDIT : " + index + " ..." + todo.summary);
    $scope.editTodoModel = todo;
    $scope.editModal.show();
  };

  /**
   * Delete a todo
   */
  $scope.doDeleteTodo = function(todo, list, index) {
    // remove the todo from the client s lists
    list.splice(index, 1);

    // Call Server
    ToDoFactory.delete({
      'todoId': todo._id
    }, function(success) {
      // Successfully deleted the todo. No action required
    }, function(error) {
      logError(error);
    });
  };


  /**
   * Converting todo as container
   */
  $scope.doConvertTodo = function(todo, list, index) {
    var confirmPopup = $ionicPopup.confirm({
      title: '<h3>Confirm Conversion</h3>',
      template: '<p>Sure to convert Todo</p><p>' + todo.summary + '</p><p>into a container?</p>'
    });

    confirmPopup.then(function(res) {
      if (res) {
        // if confirmed remove the item from the list
        list.splice(index, 1);

        // call server for conversion
        ContainerFactory.save({}, {
            'todoId': todo._id
          }, function(converted) {
            $rootScope.$broadcast('container:reload', function() {
              //success
            }, function() {
              logError(error);
            });
          },
          function(error) {
            logError(error);
          }
        );
      }
    });
  };



  // createing a new entry
  $scope.doCreateTodo = function() {
    $scope.createModal.show();
  };


  // If the edit modal submits changes
  $scope.doSubmitChanges = function() {
    DebugFactory.debug("Submit Changes" + JSON.stringify($scope.editTodoModel));

    // callServer

    $scope.editModal.hide();
  };

  // if the create modal submits changes
  $scope.doSubmitCreate = function() {
    // callServer
    ToDoFactory.save($scope.createTodoModel, function(todo) {
      stateListAdd(todo);

      $scope.createTodoModel = {
        createAnother: $scope.createTodoModel.createAnother
      };

      if ($scope.createTodoModel.createAnother !== true) {
        doCloseCreateForm();
      }
    }, function(error) {
      DebugFactory.debug("Error: " + JSON.stringify(errror));
    });

  };

  $scope.doCloseCreateForm = function() {
    DebugFactory.debug("Close Create");
    $scope.createModal.hide();
  };

  $scope.doCloseEditForm = function() {
    DebugFactory.debug("Close Edit");
    $scope.editModal.hide();
  };

  // clean up if scope is destroyed
  $scope.$on('$destroy', function() {
    $scope.editModal.remove();
    $scope.createModal.remove();
  });

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