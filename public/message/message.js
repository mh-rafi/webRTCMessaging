angular.module('newJobs.message', ['ngRoute', 'ngResource'])
	.config(['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/messages', {
				templateUrl: 'message/connected-users.html',
				controller: 'msgPageController'
			})
			.when('/messages/:id', {
				templateUrl: 'message/message.html',
				controller: 'messageController'
			})
	}])
	.factory('socket', function($rootScope) {
		var socket = io.connect();
		return {
			on: function(eventName, callback) {
				socket.on(eventName, function() {
					var args = arguments;
					// console.log(args);
					$rootScope.$apply(function() {
						callback.apply(socket, args);
					});
				});
			},
			emit: function(eventName, data, callback) {
				socket.emit(eventName, data, function() {
					var args = arguments;
					$rootScope.$apply(function() {
						if (callback) {
							callback.apply(socket, args);
						}
					});
				})
			}
		};
	})
	.controller('msgPageController', function($scope) {})
	.controller('messageController', function($scope, $rootScope, $routeParams, $location, socket) {
		if ($routeParams.id === $rootScope.current_user.username || !$rootScope.authenticated) {
			return $location.path('/');
		}
		$scope.receiver = $routeParams.id;
		// $scope.active_class = 
		// set socket for current user
		if ($routeParams.id) {
			socket.emit('new user', {
				curr_user: $rootScope.current_user.username,
				another_user: $routeParams.id
			});
		}

		// Load old messages
		$scope.messages = [];
		socket.on('load old msgs', function(messages) {
			$scope.messages = messages;
		});

		$scope.message = {
			_sender: $rootScope.current_user.username,
			_receiver: $routeParams.id,
			is_read: false,
			text: ''
		};

		$scope.sendMessage = function() {
			if (!$routeParams.id || !$scope.message._receiver || !$scope.message.text.trim().length) {
				return false;
			};

			$scope.messages.push({
				_sender: $rootScope.current_user.username,
				created_at: Date.now(),
				text: $scope.message.text.trim()
			});

			socket.emit('message', $scope.message);
			console.log($scope.message);
			$scope.message.text = '';
		};

		socket.on('message', function(message) {
			if (message._sender === $routeParams.id) {
				message.created_at = Date.now();
				$scope.messages.push(message);
			}
		});

		$rootScope.clrNotification = function() {
			angular.forEach($rootScope.connUsers, function(obj) {
				if (obj.name === $routeParams.id && obj.has_msg) {
					socket.emit('clr_notfic', {
						curr_user: $rootScope.current_user.username,
						another_user: obj.name
					});

					obj.has_msg = false;
				}
			});
		};

		// Compatibility shim
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

		var peerData = {
			_receiver: $scope.receiver
		};
		var peer = new Peer({
			host: location.hostname,
			port: location.port,
			path: '/peerjs'
		});

		peer.on('open', function() {
			peerData._callerId = peer.id;
			console.log(peer.id);
		});

		peer.on('call', function(call) {
			// Answer the call automatically (instead of prompting user) for demo purposes
			call.answer(window.localStream);
			newCall(call);
		});

		peer.on('error', function(err) {
			alert(err.message);
		});

		function newCall(call) {
			// Hang up on an existing call if present
			if (window.existingCall) {
				window.existingCall.close();
			}
			console.log('----1-----');
			console.log(call);
			// Wait for stream on the call, then set peer video display
			call.on('stream', function(stream) {
				$('#callerVideo').prop('src', URL.createObjectURL(stream));
			});
			console.log('----2-----');
			// UI stuff
			window.existingCall = call;
			call.on('close', function() {});
			console.log('----3-----');
		}

		function setLocalVideo() {
			// Get audio/video stream
			navigator.getUserMedia({
				audio: true,
				video: true
			}, function(stream) {
				// Set your video displays
				$('#my-video').prop('src', URL.createObjectURL(stream));

				window.localStream = stream;
			}, function() {
				alert('Local error');
			});
		}

		$scope.makeCall = function() {
			// var call = peer.call($('#callto-id').val(), window.localStream);
			socket.emit('private_call', peerData);
			console.log(peerData);
			setLocalVideo();
		};

		socket.on('private_call', function(peerData) {
			setLocalVideo();
			console.log('user called---------');
			var call = peer.call(peerData._callerId, window.localStream);
			console.log(peerData);
			console.log(window.localStream);
			newCall(call);
		});



	})