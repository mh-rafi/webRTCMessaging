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
			path: '/peerjs',
			config: {
				'iceServers': [{
					url: 'stun:stun01.sipphone.com'
				}, {
					url: 'stun:stun.ekiga.net'
				}, {
					url: 'stun:stun.fwdnet.net'
				}, {
					url: 'stun:stun.ideasip.com'
				}, {
					url: 'stun:stun.iptel.org'
				}, {
					url: 'stun:stun.rixtelecom.se'
				}, {
					url: 'stun:stun.schlund.de'
				}, {
					url: 'stun:stun.l.google.com:19302'
				}, {
					url: 'stun:stun1.l.google.com:19302'
				}, {
					url: 'stun:stun2.l.google.com:19302'
				}, {
					url: 'stun:stun3.l.google.com:19302'
				}, {
					url: 'stun:stun4.l.google.com:19302'
				}, {
					url: 'stun:stunserver.org'
				}, {
					url: 'stun:stun.softjoys.com'
				}, {
					url: 'stun:stun.voiparound.com'
				}, {
					url: 'stun:stun.voipbuster.com'
				}, {
					url: 'stun:stun.voipstunt.com'
				}, {
					url: 'stun:stun.voxgratia.org'
				}, {
					url: 'stun:stun.xten.com'
				}, {
					url: 'turn:numb.viagenie.ca',
					credential: 'muazkh',
					username: 'webrtc@live.com'
				}, {
					url: 'turn:192.158.29.39:3478?transport=udp',
					credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					username: '28224511:1379330808'
				}, {
					url: 'turn:192.158.29.39:3478?transport=tcp',
					credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					username: '28224511:1379330808'
				}]
			}
		});

		peer.on('open', function() {
			peerData._callerId = peer.id;
			console.log('user connected, id: ' + peer.id);
		});

		peer.on('call', function(call) {
			// Answer the call automatically (instead of prompting user) for demo purposes
			console.log('Someone calling...');
			call.answer(window.localStream);
			newCall(call);
		});

		peer.on('error', function(err) {
			console.log('peer.on Error occured');
			alert(err.message);
		});

		function newCall(call) {
			// Hang up on an existing call if present
			if (window.existingCall) {
				window.existingCall.close();
			}
			console.log(call);

			// Wait for stream on the call, then set peer video display
			call.on('stream', function(stream) {
				$('#callerVideo').prop('src', URL.createObjectURL(stream));
			});

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
			$scope.showVieo = true;
		};
		$scope.receiveCall = function() {
			var call;
			navigator.getUserMedia({
				audio: true,
				video: true
			}, function(stream) {
				// Set your video displays
				$('#my-video').prop('src', URL.createObjectURL(stream));

				window.localStream = stream;
				call = peer.call(peerData._callerId, window.localStream);
				newCall(call);
			}, function() {
				console.error('Local getUserMedia error');

			});
		}

		socket.on('private_call', function(peerData) {
			console.log('socket event private_call');
			var call;
			navigator.getUserMedia({
				audio: true,
				video: true
			}, function(stream) {
				// Set your video displays
				$('#my-video').prop('src', URL.createObjectURL(stream));

				window.localStream = stream;
				call = peer.call(peerData._callerId, window.localStream);
				newCall(call);
			}, function() {
				console.error('Local getUserMedia error');

			});
			$scope.showVieo = true;
		});



	})