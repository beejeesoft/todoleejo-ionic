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



  /**
   * If login was successfull load the container list for the user
   */
  $rootScope.$on('login:Successful', function() {
    $scope.loggedIn = AuthFactory.isAuthenticated();
    $scope.username = AuthFactory.getUsername();
    // Loading the containers for the logged in user
    $scope.loadContainerList();
    DebugFactory.debug('Login Success');

  });

  /**
   * Getting the containers for the logged in user
   */

  var moveStandardContainerToFront = function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].isStandard === true) {
        list.splice(0, 0, list.splice(i, 1)[0]);
      }
    }
  };

  $scope.loadContainerList = function() {
    ContainerFactory.query({},
      function(response) {
        moveStandardContainerToFront(response);
        $rootScope.containerList = response;
        $scope.containerList = $rootScope.containerList;
        $rootScope.$broadcast('container:listLoaded');
      },
      function(error) {
        DebugFactory.debug("Could not load Container " + JSON.stringify(error));
      });
  };


  $rootScope.$on('container:reload', function(event, data) {
    DebugFactory.debug("OnReload");
    $scope.loadContainerList();
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

.controller('ContainerController', ['$scope', '$rootScope', 'ContainerFactory', '$state', '$stateParams', 'DebugFactory', '$ionicModal',
  function($scope, $rootScope, ContainerFactory, $state, $stateParams, DebugFactory, $ionicModal) {

    $scope.containerList = $rootScope.containerList;
    $scope.shouldShowDelete = false;


    $scope.toggleShowDelete = function() {
      $scope.shouldShowDelete = !$scope.shouldShowDelete;
    };


    $scope.doDeleteContainer = function(container, index) {
      DebugFactory.debug("Delete");
      $rootScope.containerList.splice(index, 1);

      ContainerFactory.delete({
        containerId: container._id
      }, function(success) {
        DebugFactory.debug("Successfully deleted container");
      }, function(error) {
        DebugFactory.debug("Error " + JSON.stringify(error));
      });
    };



    // listening to event listLoaded to reference the list of containers
    $rootScope.$on('container:listLoaded', function(event, list) {
      DebugFactory.debug("Container Controller: Refreshing container list");
      $scope.containerList = $rootScope.containerList;
    });





    /**
     * Edit a container
     */



    // The model used in the model
    $scope.editContainerModel = {};

    // Create the create modal that we will use on create
    $ionicModal.fromTemplateUrl('templates/containerEdit.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.editModal = modal;
    });


    // Called from the list on-hold
    $scope.doEditContainer = function(container, index) {
      DebugFactory.debug("EDIT : " + index + " ..." + container.summary);
      $scope.editContainerModel = angular.copy(container);
      $scope.editIndex = index;
      $scope.editModal.show();
    };

    var resetEditScope = function() {
      $scope.editContainerModel = {};
      $scope.editIndex = -1;
      $scope.editList = {};
    };

    // If the edit modal submits changes
    $scope.doSubmitChanges = function() {
      // callServer
      ContainerFactory.update({
          containerId: $scope.editContainerModel._id
        }, $scope.editContainerModel,
        function(response) {
          // success insert updated todo
          $rootScope.containerList.splice($scope.editIndex, 0, response);
          // remove the existing one
          $rootScope.containerList.splice($scope.editIndex + 1, 1);
          $scope.doCloseEditForm();

        },
        function(error) {
          $scope.doCloseEditForm();
          DebugFactory.logError(JSON.stringify(error));
        });
    };


    $scope.doCloseEditForm = function() {
      $scope.editModal.hide();
      resetEditScope();
    };





  }
])

.controller('ToDoController', ['$scope', '$rootScope', 'baseURL', 'ToDoFactory', '$state', '$stateParams', 'DebugFactory', 'TransitionFactory', '$ionicModal', '$ionicPopup', 'ContainerFactory',
  function($scope, $rootScope, baseURL, ToDoFactory, $state, $stateParams, DebugFactory, TransitionFactory, $ionicModal, $ionicPopup, ContainerFactory) {

    $scope.baseURL = baseURL;

    // We start with the open tab visible
    $scope.taskState = 'all';

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
    };
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


    // Calling get for the selected container on startup
    // loading all of the todos belonging to this container and the logged in user
    ToDoFactory.query({
      containerId: $stateParams.containerId
    }, function(todos) {
      filterToResultLists(todos);
    }, function(error) {
      DebugFactory.debug('Error loading todos: ' + JSON.stringify(error));
    });

    // setting the selected container
    $rootScope.selectedContainerId = $stateParams.containerId;

    // reading the name of the selected container
    $scope.getContainerName = function() {
      for (var i = 0; i < $rootScope.containerList.length; i++) {
        if ($rootScope.containerList[i]._id === $rootScope.selectedContainerId) {
          return $rootScope.containerList[i].summary;
        }
      }
      return "";
    };

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
      list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);
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
    $scope.editIndex = -1;
    $scope.editList = {};

    // Checkbox models
    // To which container does a task belong
    $scope.parents = [];
    $scope.selection = [];

    var resetEditScope = function() {
      $scope.editTodoModel = {};
      $scope.editIndex = -1;
      $scope.editList = {};
      $scope.parents = [];
      $scope.selection = [];
    };


    // If a checkbox was clicked we have to update the array
    $scope.toggleSelection = function toggleSelection(id) {
      var idx = $scope.selection.indexOf(id);
      // is currently selected
      if (idx > -1) {
        $scope.selection.splice(idx, 1);
      }

      // is newly selected
      else {
        $scope.selection.push(id);
      }
    };

    var copyCheckboxArrayAsNewParents = function(todo, arrayWithParents) {
      // After the edit dialog the selection array holds all parents of 
      // the todo that are choosed by the user. So we just copy them
      todo.parents = [];
      for (var i = 0; i < arrayWithParents.length; i++) {
        todo.parents.push({
          'parentId': arrayWithParents[i]
        });
      }
    };



    /**
     * Edit a todo
     */
    $scope.doEditTodo = function(todo, list, index) {


      // Building parent assoziation list
      // editParents contains as (key,summary) all possible checkboxes
      // editChoosen contains only those that are checked.
      for (var i = 0; i < $rootScope.containerList.length; i++) {
        $scope.parents.push({
          'id': $rootScope.containerList[i]._id,
          'summary': $rootScope.containerList[i].summary
        });
      }

      // copy the already checked ones
      for (var j = 0; j < todo.parents.length; j++) {
        $scope.selection.push(todo.parents[j].parentId);
      }

      // copy the original maybe we want to cancel the adjustments
      $scope.editTodoModel = angular.copy(todo);
      $scope.editIndex = index;
      $scope.editList = list;
      $scope.editModal.show();
    };


    // If the edit modal submits changes
    $scope.doSubmitChanges = function() {

      // we now copy the checkbox array back to 
      // the copy to update the container assoziations as well
      copyCheckboxArrayAsNewParents($scope.editTodoModel, $scope.selection);

      // callServer
      ToDoFactory.update({
          todoId: $scope.editTodoModel._id
        }, $scope.editTodoModel,
        function(response) {
          // success insert updated todo
          $scope.editList.splice($scope.editIndex, 0, response);
          // remove the existing one
          $scope.editList.splice($scope.editIndex + 1, 1);
          $scope.doCloseEditForm();

        },
        function(error) {
          $scope.doCloseEditForm();
          DebugFactory.logError(JSON.stringify(error));
        });
    };


    $scope.doCloseEditForm = function() {
      $scope.editModal.hide();
      resetEditScope();
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
            $rootScope.$broadcast('container:reload');
          });
        }
      });
    };



    /** 
     * createing a new entry
     **/
    $scope.doCreateTodo = function() {
      $scope.createTodoModel = {
        createAnother: false
      };
      $scope.createModal.show();
    };




    // if the create modal submits changes
    $scope.doSubmitCreate = function() {
      // callServer
      $scope.createTodoModel.containerId = $rootScope.selectedContainerId;
      ToDoFactory.save($scope.createTodoModel, function(todo) {
        stateListAdd(todo);
        var tmp = $scope.createTodoModel.createAnother;

        if (tmp !== true) {
          $scope.doCloseCreateForm();
        } else {
          $scope.createTodoModel = {
            createAnother: true
          };
        }
      }, function(error) {
        $scope.createTodoModal = {
          createAnother: false
        };
        DebugFactory.debug("Error: " + JSON.stringify(errror));
      });

    };

    $scope.doCloseCreateForm = function() {
      $scope.createModal.hide();
      $scope.createTodoModel = {
        createAnother: false
      };
    };

    // clean up if scope is destroyed
    $scope.$on('$destroy', function() {
      $scope.editModal.remove();
      $scope.createModal.remove();
    });

  }
]);