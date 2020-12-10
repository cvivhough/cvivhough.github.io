define('modules/softphone-audio',['ui.api.v1'],

    function (UiApi) {

        var SoftphoneAudio = {};

        var _model;

        SoftphoneAudio.initialize = function () {
            UiApi.Logger.debug('SoftphoneAudio', 'initialize');

            _model = new UiApi.LocalModel({
                name: 'SoftphoneAudioLocalModel',
                sessionId: UiApi.Context.authToken,
                version: '0.01',
                attributes: {
                    lastCaptureVolume: {default: 100, persistence: UiApi.LocalModel.Persistence.Session},
                    lastPlaybackVolume: {default: 100, persistence: UiApi.LocalModel.Persistence.Session}
                }
            });
        };

        SoftphoneAudio.getStationType = function() {
            return UiApi.SharedPresModelRepo.getModel('StationSetupPresModel')
                .getViewAttributes().get('stationType');
        };

        SoftphoneAudio.getLastCaptureVolume = function() {
            return _model.get('lastCaptureVolume');
        };

        SoftphoneAudio.setLastCaptureVolume = function(volume) {
            _model.set('lastCaptureVolume', volume);
        };

        SoftphoneAudio.getLastPlaybackVolume = function() {
            return _model.get('lastPlaybackVolume');
        };

        SoftphoneAudio.setLastPlaybackVolume = function(volume) {
            _model.set('lastPlaybackVolume', volume);
        };

        SoftphoneAudio.getActivePlaybackDevice = function() {
            try {
                //return UiApi.Context.Softphone().playbackDevices().activeDevice();
                // 9.5 Modification
                return UiApi.Context.AgentStation.softphone().playbackDevices().activeDevice();
            } catch (e) {
                UiApi.Logger.warn('softphone-audio', 'getActivePlaybackDevice', 'unable to identify activeDevice');
            }
        };

        SoftphoneAudio.getActiveCaptureDevice = function() {
            try {
                //return UiApi.Context.Softphone().captureDevices().activeDevice();
                // 9.5 Modification
                return UiApi.Context.AgentStation.softphone().captureDevices().activeDevice();
            } catch (e) {
                UiApi.Logger.warn('softphone-audio', 'getActiveCaptureDevice', 'unable to identify activeDevice');
            }
        };

        SoftphoneAudio.setPlaybackVolume = function(volume) {
            UiApi.Logger.debug('softphone-audio', 'setPlaybackVolume', volume);

            var activeDevice = this.getActivePlaybackDevice();
            if (activeDevice) {
                activeDevice.setVolume(Math.round(volume));
            }
        };

        SoftphoneAudio.getPlaybackVolume = function() {
            var volume = 100; // default

            var activeDevice = this.getActivePlaybackDevice();
            if (activeDevice) {
                volume = activeDevice.volume;
            }

            UiApi.Logger.debug('softphone-audio', 'getPlaybackVolume', volume);
            return volume;
        };

        SoftphoneAudio.setCaptureVolume = function(volume) {
            UiApi.Logger.debug('softphone-audio', 'setCaptureVolume', volume);

            var activeDevice = this.getActiveCaptureDevice();
            if (activeDevice) {
                activeDevice.setVolume(Math.round(volume));
            }
        };

        SoftphoneAudio.getCaptureVolume = function() {
            var volume = 100; // default

            var activeDevice = this.getActiveCaptureDevice();
            if (activeDevice) {
                volume = activeDevice.volume;
            }

            UiApi.Logger.debug('softphone-audio', 'getCaptureVolume', volume);
            return volume;
        };

        SoftphoneAudio.getCaptureMute = function() {
            var isMuted = false;

            var activeDevice = this.getActiveCaptureDevice();
            if (activeDevice) {
                isMuted = activeDevice.isMuted;
            }

            UiApi.Logger.debug('softphone-audio', 'getCaptureMute', isMuted);
            return isMuted;
        };

        SoftphoneAudio.setCaptureMute = function(mute) {
            UiApi.Logger.debug('softphone-audio', 'setCaptureMute', mute);

            var activeDevice = this.getActiveCaptureDevice();
            if (activeDevice) {
                activeDevice.mute(mute);
            }
        };

        return SoftphoneAudio;
    });

define('modules/window-message-listener',['ui.api.v1', 'underscore'],

    function (UiApi, _) {

        var MessageListener = {

            listeners: [],

            initialize: function () {
                UiApi.Logger.debug('MessageListener', 'initialize');

                var messageCallback = _.bind(function (event) {
                    if (!!event.data.cmd) {
                        UiApi.Logger.debug('MessageListener', 'receiveMessage', event.data);

                        _.each(this.listeners, function (callback) {
                            try {
                                callback(event);
                            } catch (e)  {
                                UiApi.Logger.warn('MessageListener', 'Error executing callback', e);
                            }
                        }); 
                    }
                }, this);

                if (typeof window.attachEvent === 'function') {
                    UiApi.Logger.debug('MessageListener', 'initialize', 'Attaching event...');
                    window.attachEvent('message', messageCallback);
                } else if (typeof window.addEventListener === 'function') {
                    UiApi.Logger.debug('MessageListener', 'initialize', 'Adding message...');
                    window.addEventListener('message', messageCallback, false);
                }
            },

            /**
             * Add listener for window messages
             *
             * @param callback
             */
            addListener: function (callback) {
                // TODO: print size of listners array..
                if (typeof callback === 'function') {
                    this.listeners.push(callback);
                }
                UiApi.Logger.debug('MessageListener', 'addListener', 'Number of Listeners = ' + this.listeners.length);
            },

            removeListener: function (callback) {
                UiApi.Logger.debug('MessageListener', 'removeListener', 'Listeners = ' + JSON.stringify(this.listeners));
                if (typeof callback === 'function') {
                    for (var id in this.listeners) {
                        if (callback === this.listeners[id]) {
                            UiApi.Logger.debug('MessageListener', 'removeListener', 'Removing Listener at ID = ' + id);
                            this.listeners.splice(id, 1);
                            break;
                        }
                    }
                }
                UiApi.Logger.debug('MessageListener', 'removeListener', 'Number of Listeners = ' + this.listeners.length);
            }
        };

        return MessageListener;
    });

/**
 * Created by dtucker on 6/5/17.
 */

define('modules/vivint-operations',['ui.api.v1',
    'underscore',
    'modules/window-message-listener'],

    function (UiApi, _, MessageListener) {
        var VivintOperations = {
            initialize: function () {
                UiApi.Logger.debug('VivintOperations', 'initialize');

                UiApi.Logger.debug('VivintOperations', 'Version 1.2');
                /*
                 Version Description:
                 1.0.0   Bare Secure payment installation
                 1.0.1   Added call Status Ping
                 1.0.2   Bypassed the AccountPhoneNumber support
                 1.0.3   Removed AccountPhoneNumber from adapter display
                 1.0.4   Changed status ping target to '*', hid the start/stop buttons, changed the payment active message
                 1.0.5   !=Finished...
                 1.0.6   Start ping on initialize
                 1.0.7   Bug fix for Pind Start model param
                 1.0.8   Added messages at end of start stop payment
                 1.0.9   Added IVRResponse message
                 1.0.10-12  Added and debugged sending additional Vivint specific messages for IVR Started, Finished, Response
                 1.0.14 Page refresh fix: Stopped the callStatusPing timer if it was already started, always start the timer
                 1.0.15 Added tracing to debug the Standard view stopPayment operation, isActive is falsse in cust log
                 1.0.16 Removed isActive dependancy in the stopPayment() function, this flag loses its value in Classic mode
                 1.2     Support for second conference IVR
                 1.3     Reorder variables per Vivint debugging
                 1.3.1   Added sendDisclosureIVRResponse, mimicking sentPaymentIVRResponse; additional logging
                 */

                _model = new UiApi.LocalModel({
                    name: 'VivintOperationsLocalModel',
                    sessionId: UiApi.Context.authToken,
                    version: '0.01',
                    attributes: {
                        callStatusPingActive: {default: 100, persistence: UiApi.LocalModel.Persistence.Session},
                        pingTimerHandle: {default: 0, persistence: UiApi.LocalModel.Persistence.Session},
                        sfURL: {default: 100, persistence: UiApi.LocalModel.Persistence.Session}
                    }
                });
            },

            /**
             * Start call status ping messages
             *
             * @param model Call model
             */
            startCallStatusPing: function (callModel) {
                UiApi.Logger.debug('VivintOperations', 'startCallStatusPing');
                var me = this;
                var timerHandle;

                //var lclSfUrl = "https://secure-payment";
                //var lclSfUrl = "https://vivint.my.salesforce.com";
                //var lclSfUrl = "https://app.five9.com";
                var lclSfUrl = "*";

                if (!!callModel) {
                    if (_model.get('callStatusPingActive')) {
                        UiApi.Logger.debug('VivintOperations', 'startCallStatusPing is already running, stop the old process');
                        // If active, clear the current setTimeout() timer
                        timerHandle = _model.get('pingTimerHandle');
                        clearTimeout(timerHandle);

                        // Indicate the timer is no longer active
                        this.stopCallStatusPing();
                        //_model.set('callStatusPingActive', false);
                    }

                    var pingFn = function (lastState) {
                        if (!_model.get('callStatusPingActive')) return;

                        // UiApi.Logger.debug('VivintOperations', 'startCallStatusPing: CallModel = ' + JSON.stringify(callModel));

                        var callId = callModel.get('id');
                        var callState = callModel.get('state');

                        if (!_model.get('callStatusPingResponded') || (lastState != callState)) {
                            // trigger updates after ping response on state change only
                            var data = {
                                CallId: callId,
                                Ani: callModel.get('ani'),
                                Dnis: callModel.get('dnis'),
                                CallState: callState,
                                CallType: callModel.get('callType'),
                                Queue: callModel.get('campaignId'),
                                StartDate: callModel.get('startTimestamp')
                            };

                            // UiApi.Logger.debug('VivintOperations', 'postMessage', 'callStatusPing id: ' + callId + ' state: ' + callState
                            //     + ' url ' + lclSfUrl);
                            // GTS: 1.3.3
                            //window.top.postMessage({cmd: 'callStatusPing', data: data}, lclSfUrl);
                            window.parent.postMessage({cmd: 'callStatusPing', data: data}, lclSfUrl);
                        }

                        timerHandle = setTimeout(function () {
                            pingFn(callState);
                        }, 2000);

                        _model.set('pingTimerHandle', timerHandle);
                    };

                    _model.set('callStatusPingActive', true);
                    pingFn('force');

                } else {
                    UiApi.Logger.debug('VivintOperations', 'startCallStatusPing: CallModel is not valid yet!');
                }
            },

            stopCallStatusPing: function () {
                UiApi.Logger.debug('VivintOperations', 'stopCallStatusPing');

                _model.set('callStatusPingActive', false);
                //_model.set('callStatusPingResponded', false);
            },

            getPaymentIVRResponse: function(callSessionId) {
              var ecommURL = "https://ecomm-svc-dev.vivint.com/f1/Payment/GetIVRPaymentResponse/" + callSessionId;
              return $.ajax({
                url: ecommURL,
                type: 'get',
                tryCount: 0,
                retryLimit: 3,
                success: function (response) {
                  UiApi.Logger.debug('VivintOperations', 'getPaymentIVRResponse', 'getMessage response ' + JSON.stringify(response));
                  if (!response || response === null) {
                    if (this.tryCount <= this.retryLimit) {
                      $.ajax(this);
                      return;
                    }
                    return;
                  }
                  return response;
                },
                error: function(data, status) {
                  if (status === 'timeout') {
                    this.tryCount++;
                    if (this.tryCount <= this.retryLimit) {
                      $.ajax(this);
                      return;
                    }
                    return;
                  }
                  UiApi.Logger.debug('VivintOperations', 'getPaymentIVRResponse', 'getMessage error: ' + data);
                  return;
                }
              })
            },

            sendPaymentIVRResponse: function(callSessionId, attempt) {
                attempt = attempt || 1;
                UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'attempt: ' + attempt);

                try {
                    var me = this;
                    // GTS: 1.3.3
                    var parent_frame = window.parent;
                    var query = 'callSessionID=' + callSessionId;
                    // var callback = function(response) {
                    //     var resultObject, postData;
                    //     if (response.result) {
                    //         try {
                    //             resultObject = JSON.parse(response.result);
                    //         } catch (e1) {
                    //             UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'resultObject exception: '+ e1.message);
                    //         }

                    //         try {
                    //             postData = JSON.parse(resultObject.message);
                    //         } catch (e2) {
                    //             UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'postData exception: '+ e2.message);
                    //             // message
                    //             postData = { error: resultObject.message };
                    //         }

                    //         UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse',
                    //             'runApex(getMessage) result: ' + response.result);

                    //         // retry up to 3 times for ivr message
                    //         if (!resultObject || resultObject.success == 'false') {
                    //             if (attempt <= 4) {
                    //                 setTimeout(function() {
                    //                     me.sendPaymentIVRResponse(callSessionId, ++attempt);
                    //                 }, 2000);
                    //             } else {
                    //                 me.log('VivintOperations', 'sendPaymentIVRResponse',
                    //                     'runApex(getMessage) failed after ' + attempt + ' attempts');
                    //             }
                    //         }
                    //         // if (resultObject.success == 'true' || attempt > 3) { // only send response if message found or tried 3 times
                    //         //     var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                    //         //     UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                    //         // }
                    //     } else {
                    //         UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'runApex(getMessage) error: ' + response);
                    //         postData = { error: true, message: response };
                    //     }

                    //     var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                    //     UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                    //     // GTS: 1.3.3
                    //     //window.top.postMessage(postmsg, '*');
                    //     parent_frame.postMessage(postmsg, '*');
                    //     for (var i = 0; i < parent_frame.length; i++) {
                    //       parent_frame[i].postMessage(postmsg, '*');
                    //     }                        
                    // };

                    me.getPaymentIVRResponse(callSessionId).then(response => {
                      var resultObject, postData;
                        if (response.result) {
                            try {
                                resultObject = response.result;
                            } catch (e1) {
                                UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'resultObject exception: '+ e1.message);
                            }

                            try {
                                postData = JSON.parse(resultObject.message);
                            } catch (e2) {
                                UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'postData exception: '+ e2.message);
                                // message
                                postData = { error: resultObject.message };
                            }

                            UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse',
                                'runApex(getMessage) result: ' + response.result);

                            // // retry up to 3 times for ivr message
                            // if (!resultObject || resultObject.success == 'false') {
                            //     if (attempt <= 4) {
                            //         setTimeout(function() {
                            //             me.sendPaymentIVRResponse(callSessionId, ++attempt);
                            //         }, 2000);
                            //     } else {
                            //         me.log('VivintOperations', 'sendPaymentIVRResponse',
                            //             'runApex(getMessage) failed after ' + attempt + ' attempts');
                            //     }
                            // }
                        } else {
                            UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'runApex(getMessage) error: ' + response);
                            postData = { error: true, message: response };
                        }

                        var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                        UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                        // GTS: 1.3.3
                        parent_frame.postMessage(postmsg, '*');
                        for (var i = 0; i < parent_frame.length; i++) {
                          parent_frame[i].postMessage(postmsg, '*');
                        }
                    });

                } catch (e) {
                    UiApi.Logger.debug('VivintOperations', 'sendPaymentIVRResponse', 'runApex(getMessage) exception: '+ e.message);
                }
            },

            sendDisclosureIVRResponse: function(callSessionId, attempt) {
                attempt = attempt || 1;
                UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'attempt: ' + attempt);

                try {
                    var me = this;
                    var query = 'callSessionID=' + callSessionId;
                    // var callback = function(response) {
                    //     var resultObject, postData;
                    //     if (response.result) {
                    //         try {
                    //             resultObject = JSON.parse(response.result);
                    //         } catch (e1) {
                    //             UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'resultObject exception: '+ e1.message);
                    //         }

                    //         try {
                    //             postData = JSON.parse(resultObject.message);
                    //         } catch (e2) {
                    //             UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'postData exception: '+ e2.message);
                    //             // message
                    //             postData = { error: resultObject.message };
                    //         }

                    //         UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse',
                    //             'runApex(getMessage) result: ' + response.result);

                    //         // retry up to 3 times for ivr message
                    //         if (!resultObject || resultObject.success == 'false') {
                    //             if (attempt <= 3) {
                    //                 setTimeout(function() {
                    //                     me.sendDisclosureIVRResponse(callSessionId, ++attempt);
                    //                 }, 1000);
                    //             } else {
                    //                 me.log('VivintOperations', 'sendDisclosureIVRResponse',
                    //                     'runApex(getMessage) failed after ' + attempt + ' attempts');
                    //             }
                    //         }
                    //         // if (resultObject.success == 'true' || attempt > 3) { // only send response if message found or tried 3 times
                    //         //     var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                    //         //     UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                    //         // }
                    //     } else {
                    //         UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'runApex(getMessage) error: ' + response);
                    //         postData = { error: true, message: response };
                    //     }

                    //     var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                    //     UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                    //     // GTS: 1.3.3
                    //     //window.top.postMessage(postmsg, '*');
                    //     window.parent.postMessage(postmsg, '*');
                    // };

                    // UiApi.getSFApiWrapper().runApex('Five9PSRestService', 'getMessage', query, _.bind(callback, me));
                    me.getPaymentIVRResponse(callSessionId).then(response => {
                      console.log("sendDisclosureIVRResponse Data: ", response);
                      var resultObject, postData;
                        if (response.result) {
                            try {
                                resultObject = response.result;
                            } catch (e1) {
                                UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'resultObject exception: '+ e1.message);
                            }

                            try {
                                postData = JSON.parse(resultObject.message);
                            } catch (e2) {
                                UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'postData exception: '+ e2.message);
                                // message
                                postData = { error: resultObject.message };
                            }

                            UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse',
                                'runApex(getMessage) result: ' + response.result);

                            // // retry up to 3 times for ivr message
                            // if (!resultObject || resultObject.success == 'false') {
                            //     if (attempt <= 3) {
                            //         setTimeout(function() {
                            //             me.sendDisclosureIVRResponse(callSessionId, ++attempt);
                            //         }, 1000);
                            //     } else {
                            //         me.log('VivintOperations', 'sendDisclosureIVRResponse',
                            //             'runApex(getMessage) failed after ' + attempt + ' attempts');
                            //     }
                            // }
                        } else {
                            UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'runApex(getMessage) error: ' + response);
                            postData = { error: true, message: response };
                        }

                        var postmsg = { cmd: 'paymentIVRResponse', data: postData };
                        UiApi.Logger.debug('VivintOperations', 'postMessage', JSON.stringify(postmsg));
                        // GTS: 1.3.3
                        window.parent.postMessage(postmsg, '*');
                    });

                } catch (e) {
                    UiApi.Logger.debug('VivintOperations', 'sendDisclosureIVRResponse', 'runApex(getMessage) exception: '+ e.message);
                }

            }            

        }

        return VivintOperations;
    });
define('workflow/init',['ui.api.v1', 'modules/softphone-audio', 'modules/window-message-listener', 'modules/vivint-operations'],
    function (UiApi, SoftphoneAudio, MessageListener, VivintOperations) {
        return {
            initialize: function () {
                //Place your library initialization code here
                UiApi.Logger.debug('init:workflow:initialize');
                MessageListener.initialize();
                SoftphoneAudio.initialize();
                VivintOperations.initialize();
            },

            onModelLoad: function () {
                //Place your server model subscription code here
                UiApi.Logger.debug('init:workflow:onModelLoad');
            },

            onModelUnload: function () {
                //Place your cleanup code here
                UiApi.Logger.debug('init:workflow:onModelUnload');
            }
        };
    });

define('presentation.models/call-middle.pres.model',[
  "ui.api.v1",
  "underscore",
  "api/api.errors",
  "modules/softphone-audio",
  "modules/window-message-listener",
  "models/server/callConstants",
  "models/server/calls",
  "modules/vivint-operations",
], function (
  UiApi,
  _,
  ApiErrors,
  SoftphoneAudio,
  MessageListener,
  CallConstants,
  Calls,
  VivintOperations
) {
  return UiApi.PresentationModel.extend({
    initialize: function (params) {
      UiApi.Logger.debug("secure-payment", "initialize", "Version 1.3.1");

      this.onConfCallStateChange = _.bind(function (model, newState) {
        UiApi.Logger.debug(
          "secure-payment",
          "confCallModel",
          "(init) change:state",
          newState,
          "paymentIvrActive",
          this.getPaymentAttributes().get("isConferenceActive"),
          "disclosureIvrActive",
          this.getDisclosureAttributes().get("isConferenceActive")
        );

        switch (newState) {
          case CallConstants.State.ParticipantTalking:
            // 9.5 Modification

            /*
                            // Removed for Vivint.  They want the Agent to talk to the customer
                            UiApi.Logger.debug('secure-payment', 'ParticipantTalking: Re-Mute the Agent...');
                            var isActive = this.getViewAttributes().get('isActive');
                            if (isActive) SoftphoneAudio.setCaptureMute(true);
                            */

            break;
          case CallConstants.State.Finished:
            // Stop both IVRs for good measure
            // Per customer request 5/15/2020
            ApiErrors.clearAll();

            UiApi.Logger.debug(
              "secure-payment",
              "confCallModel",
              "Stopping Payment IVR"
            );
            this.stopPaymentIVR();

            UiApi.Logger.debug(
              "secure-payment",
              "confCallModel",
              "Stopping Disclosure IVR"
            );
            this.stopDisclosureIVR();

            // clear conference participant disconnected message
            // ApiErrors.clearAll();
            // if (this.getPaymentAttributes().get('isConferenceActive')) {
            //     UiApi.Logger.debug('secure-payment', 'confCallModel', 'Stopping Payment IVR');
            //     this.stopPaymentIVR();
            //     break;
            // }
            // if (this.getDisclosureAttributes().get('isConferenceActive')) {
            //     UiApi.Logger.debug('secure-payment', 'confCallModel', 'Stopping Disclosure IVR');
            //     this.stopDisclosureIVR();
            //     break;
            // }
            break;
          default:
            UiApi.Logger.debug(
              "secure-payment",
              "confCallModel",
              "DEFAULT BREAK - NOTHING CAUGHT"
            );
            break;
        }
      }, this);

      var callModel = UiApi.Root.Agent(UiApi.Context.AgentId).Call(
        params.callId
      );
      var allCallsModel = UiApi.Root.Agent(UiApi.Context.AgentId).Calls();
      var callVariables = UiApi.Context.Tenant.CallVariables();
      var campaigns = UiApi.Context.Tenant.Campaigns();

      this.listenTo(
        allCallsModel,
        "add",
        _.bind(function (model) {
          //allCallsModel.on('add', _.bind(function(model) {
          if (this.isConferenceCall(model)) {
            this.setConfCallModel(model);
            var confId = model.get("id");
            UiApi.Logger.debug(
              "secure-payment",
              "allCallsModel",
              "add",
              confId
            );
            this.listenTo(model, "change:state", this.onConfCallStateChange);
            //model.on('change:state', this.onConfCallStateChange);
          }
        }, this)
      );

      VivintOperations.startCallStatusPing(callModel);

      this.listenTo(
        callModel,
        "change:state",
        _.bind(function (model, newState) {
          //callModel.on('change:state', _.bind(function (model, newState) {
          var callId = model.get("id");
          UiApi.Logger.debug(
            "secure-payment",
            "callModel",
            "change:state (other switch)",
            newState,
            callId
          );
          // GTS: 1.3.3
          //window.top.postMessage(
          window.parent.postMessage(
            { cmd: "callevent", status: newState, callId: callId },
            "*"
          );

          /*
                    if (newState != CallConstants.State.Finished) {
                        UiApi.Logger.debug('secure-payment', 'Call Start Ping...');
                        VivintOperations.startCallStatusPing(model);
                    }
                    */

          switch (newState) {
            case CallConstants.State.Offered:
              break;
            case CallConstants.State.Talking:
              //VivintOperations.startCallStatusPing(model);
              break;
            case CallConstants.State.Acw:
              // Combined both stops
              // Per customer request 5/18/2020
              UiApi.Logger.debug(
                "secure-payment",
                "callModel",
                "change:state (other switch - case)",
                "stopPaymentIVR()",
                "paymentActive",
                this.getPaymentAttributes().get("isConferenceActive")
              );
              this.stopPaymentIVR();

              UiApi.Logger.debug(
                "secure-payment",
                "callModel",
                "change:state (other switch - case)",
                "stopDisclosureIVR()",
                "disclosureActive",
                this.getDisclosureAttributes().get("isConferenceActive")
              );
              this.stopDisclosureIVR();

              //   if (this.getPaymentAttributes().get("isConferenceActive")) {
              //     UiApi.Logger.debug(
              //       "secure-payment",
              //       "callModel",
              //       "change:state (other switch - case)",
              //       "stopPaymentIVR()",
              //       "paymentActive",
              //       this.getPaymentAttributes().get("isConferenceActive")
              //     );
              //     this.stopPaymentIVR();
              //   }
              //   if (this.getDisclosureAttributes().get("isConferenceActive")) {
              //     UiApi.Logger.debug(
              //       "secure-payment",
              //       "callModel",
              //       "change:state (other switch - case)",
              //       "stopDisclosureIVR()",
              //       "disclosureActive",
              //       this.getDisclosureAttributes().get("isConferenceActive")
              //     );
              //     this.stopDisclosureIVR();
              //   }
              break;
            case CallConstants.State.Finished:
              VivintOperations.stopCallStatusPing();

              UiApi.Logger.debug(
                "secure-payment",
                "callModel",
                "Removing message listeners"
              );

              // The following 2 lines were added to fix multiple window message occurances
              MessageListener.removeListener(this.messageCallback);
              this.stopListening(allCallsModel);
              break;
          }
        }, this)
      );

      var viewAttributes = new UiApi.LocalModel({
        name: "CallMiddleLocalModel",
        sessionId: params.callId,
        version: "0.01",
        attributes: {
          isActive: {
            default: false,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          resumeRecording: {
            default: false,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          countDown: {
            default: 0,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          timerId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
        },
      });

      var paymentAttributes = new UiApi.LocalModel({
        name: "PaymentIvrLocalModel",
        sessionId: UiApi.Context.authToken,
        version: "0.01",
        attributes: {
          isConferenceActive: {
            default: false,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberCavName: {
            default: "Custom.AccountPhone",
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberCavId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberValue: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          paymentIvrCavName: {
            default: "Custom.PaymentIVR_campaign",
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          paymentIvrCavId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          paymentIvrCampaignName: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.None,
          },
          paymentIvrCampaignId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.None,
          },
        },
      });

      var disclosureAttributes = new UiApi.LocalModel({
        name: "DisclosureIvrLocalModel",
        sessionId: UiApi.Context.authToken,
        version: "0.01",
        attributes: {
          isConferenceActive: {
            default: false,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberCavName: {
            default: "Custom.AccountPhone",
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberCavId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          accountPhoneNumberValue: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          disclosureIvrCavName: {
            default: "Custom.DisclosureIVR_campaign",
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          disclosureIvrCavId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.Session,
          },
          disclosureIvrCampaignName: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.None,
          },
          disclosureIvrCampaignId: {
            default: undefined,
            persistence: UiApi.LocalModel.Persistence.None,
          },
        },
      });

      var options = {};

      options.sourceModel = new UiApi.ModelAggregator([
        { key: "call", model: callModel },
        { key: "calls", model: allCallsModel },
        { key: "confCall", model: null },
        { key: "callVariables", model: callVariables },
        { key: "campaigns", model: campaigns },
        { key: "viewAttributes", model: viewAttributes },
        { key: "paymentAttributes", model: paymentAttributes },
        { key: "disclosureAttributes", model: disclosureAttributes },
      ]);

      options.computedAttributes = {
        securePayVisible: this.computeSecurePayVisible,
        securePayState: this.computeSecurePayState,
        SecurePaymentButtonText: this.computeSecurePaymentButtonText,
        //customerAccountPhoneNumberValue: this.computeCustomerAccountPhoneNumberValue,
        //AccountPhoneNumberValid: this.computeAccountPhoneNumberValid,
        btnSecurePaymentState: this.computeSecurePaymentState,
        btnSecurePaymentEnabled: this.computeSecurePaymentEnabled,
      };

      this._init(options);

      this.messageCallback = _.bind(function (event) {
        if (!!event.data.cmd) {
          UiApi.Logger.debug(
            "secure-payment",
            "receiveMessage",
            "Event data = " + JSON.stringify(event.data)
          );
          UiApi.Logger.debug(
            "secure-payment",
            "receiveMessage",
            "Call id = " + callModel.get("id")
          ); // TODO: add callid to see if we rcv multiple window mwssages...

          switch (event.data.cmd) {
            case "startPaymentIVR":
              this.startPaymentIVR(event.data.data);
              break;

            case "stopPaymentIVR":
              this.stopPaymentIVR();
              break;

            case "stopDisclosureIVR":
              this.stopDisclosureIVR();
              break;

            case "startDisclosureIVR":
              this.startDisclosureIVR(event.data.data);
              break;
          }
        }
      }, this);
      MessageListener.addListener(this.messageCallback);

      // GTS: 1.3.3
      //window.top.postMessage(
      window.parent.postMessage(
        {
          cmd: "paymentIVR",
          status: "ready",
          agentId: UiApi.Context.AgentId,
          tenantId: UiApi.Context.TenantId,
        },
        "*"
      );

      // GTS: 1.3.3
      //window.top.postMessage(
      window.parent.postMessage(
          {
          cmd: "disclosureIVR",
          status: "ready",
          agentId: UiApi.Context.AgentId,
          tenantId: UiApi.Context.TenantId,
        },
        "*"
      );

      // GTS: 1.3.3
      //window.top.postMessage(
      window.parent.postMessage(
          {
          cmd: "callevent",
          status: callModel.get("state"),
          callId: callModel.get("id"),
        },
        "*"
      );
    },

    onPreCompute: function () {
      if (this.isFirstPreCompute()) {
        this.getAllCalls()
          .fetch()
          .done(
            _.bind(function () {
              // retrieve conference call
              var model = this.getConferenceCall();
              if (!!model) {
                UiApi.Logger.debug(
                  "secure-payment",
                  "onPreCompute",
                  "confCallModel",
                  model.get("id")
                );
                this.setConfCallModel(model);
                model.on("change:state", this.onConfCallStateChange);
              }
            }, this)
          );

        this.getCallVariables()
          .fetch()
          .done(
            _.bind(function () {
              // retrieve payment IVR cav.id
              var paymentIvrCampaignName, paymentIvrCampaignId;
              var paymentIvrCavName = this.getPaymentAttributes().get(
                "paymentIvrCavName"
              ); //Custom.PaymentIVR_campaign
              if (paymentIvrCavName) {
                var cav = this.getCallVariableByName(paymentIvrCavName);
                if (cav) {
                  var paymentIvrCavId = cav.get("id");
                  UiApi.Logger.debug(
                    "secure-payment",
                    "onPreCompute",
                    "callVariables",
                    "paymentIvrCavName",
                    paymentIvrCavName,
                    "paymentIvrCavId",
                    paymentIvrCavId
                  );
                  this.getPaymentAttributes().set(
                    "paymentIvrCavId",
                    paymentIvrCavId
                  );

                  // retrieve payment IVR campaign.id and name
                  paymentIvrCampaignName = this.getCallModel().get("variables")[
                    paymentIvrCavId
                  ];
                  if (paymentIvrCampaignName) {
                    var campaign = this.getCampaignByName(
                      paymentIvrCampaignName
                    );
                    if (campaign) {
                      paymentIvrCampaignId = campaign.get("id");
                    }
                  }
                }
              }
              this.getPaymentAttributes().set(
                "paymentIvrCampaignName",
                paymentIvrCampaignName
              );
              this.getPaymentAttributes().set(
                "paymentIvrCampaignId",
                paymentIvrCampaignId
              );

              // retrieve accountPhoneNumber Cav and value
              var accountPhoneNumberValue;
              var accountPhoneNumberCavName = this.getPaymentAttributes().get(
                "accountPhoneNumberCavName"
              );
              if (accountPhoneNumberCavName) {
                var cav = this.getCallVariableByName(accountPhoneNumberCavName);
                if (cav) {
                  var accountPhoneNumberCavId = cav.get("id");
                  UiApi.Logger.debug(
                    "secure-payment",
                    "onPreCompute",
                    "callVariables",
                    "accountPhoneNumberCavName",
                    accountPhoneNumberCavName,
                    "accountPhoneNumberCavId",
                    accountPhoneNumberCavId
                  );
                  this.getPaymentAttributes().set(
                    "accountPhoneNumberCavId",
                    accountPhoneNumberCavId
                  );
                  this.getDisclosureAttributes().set(
                    "accountPhoneNumberCavId",
                    accountPhoneNumberCavId
                  );

                  // retrieve accountPhoneNumber value
                  accountPhoneNumberValue = this.getCallModel().get(
                    "variables"
                  )[accountPhoneNumberCavId];
                }
              }
              this.getPaymentAttributes().set(
                "accountPhoneNumberValue",
                accountPhoneNumberValue
              );
              this.getDisclosureAttributes().set(
                "accountPhoneNumberValue",
                accountPhoneNumberValue
              );

              // Get disclosure IVR id
              var disclosureIvrCampaignName, disclosureIvrCampaignId;
              var disclosureIvrCavName = this.getDisclosureAttributes().get(
                "disclosureIvrCavName"
              );

              if (disclosureIvrCavName) {
                var cav = this.getCallVariableByName(disclosureIvrCavName);

                UiApi.Logger.debug(
                  "secure-payment",
                  "onPreCompute",
                  "cav",
                  cav
                );

                if (cav) {
                  var disclosureIvrCavId = cav.get("id");
                  this.getDisclosureAttributes().set(
                    "disclosureIvrCavId",
                    disclosureIvrCavId
                  );
                }
                disclosureIvrCampaignName = this.getCallModel().get(
                  "variables"
                )[disclosureIvrCavId];
                if (disclosureIvrCampaignName) {
                  var disclosureCampaign = this.getCampaignByName(
                    disclosureIvrCampaignName
                  );
                  if (disclosureCampaign) {
                    disclosureIvrCampaignId = disclosureCampaign.get("id");
                  }
                }
              }

              this.getDisclosureAttributes().set(
                "disclosureIvrCampaignName",
                disclosureIvrCampaignName
              );
              this.getDisclosureAttributes().set(
                "disclosureIvrCampaignId",
                disclosureIvrCampaignId
              );

              UiApi.Logger.debug(
                "secure-payment",
                "onPreCompute",
                "disclosureIvrCampaignName ",
                disclosureIvrCampaignName,
                "disclosureIvrCampaignId",
                disclosureIvrCampaignId
              );

              UiApi.Logger.debug(
                "secure-payment",
                "onPreCompute",
                "accountPhoneNumberValue",
                accountPhoneNumberValue,
                "paymentIvrCampaignName",
                paymentIvrCampaignName,
                "paymentIvrCampaignId",
                paymentIvrCampaignId
              );
            }, this)
          );
      }
    },

    getCallModel: function () {
      return this.get("sourceModel").get("call");
    },

    setConfCallModel: function (call) {
      return this.get("sourceModel").set("confCall", call);
    },

    getConfCallModel: function () {
      return this.get("sourceModel").get("confCall");
    },

    getAllCalls: function () {
      return this.get("sourceModel").get("calls");
    },

    getCallVariables: function () {
      return this.get("sourceModel").get("callVariables");
    },

    getCampaigns: function () {
      return this.get("sourceModel").get("campaigns");
    },

    getViewAttributes: function () {
      return this.get("sourceModel").get("viewAttributes");
    },

    getPaymentAttributes: function () {
      return this.get("sourceModel").get("paymentAttributes");
    },
    getDisclosureAttributes: function () {
      // UiApi.Logger.debug('secure-payment', '*DK* - In getDisclosureAttributes', this.get('sourceModel').get('disclosureAttributes'));
      return this.get("sourceModel").get("disclosureAttributes");
    },

    computeSecurePayVisible: function () {
      return this.getCallModel().get("state") !== CallConstants.State.Offered;
    },

    computeSecurePayState: function () {
      if (this.isConferenceCallActive()) {
        var securePayActive = this.getPaymentAttributes().get(
          "isConferenceActive"
        );
        var disclosureActive = this.getDisclosureAttributes().get(
          "isConferenceActive"
        );

        if (securePayActive) {
          return "Payment Process Active";
        }
        if (disclosureActive) {
          return "Disclosure Process Active";
        }
        return "";
      }
      return "";
    },
    computeSecurePaymentState: function () {
      if (
        this.getCallModel().get("state") === CallConstants.State.Talking &&
        !this.isConferenceCallActive()
      ) {
        return "full-width btn-green";
      } else {
        return "full-width btn-red";
      }
    },

    computeSecurePaymentEnabled: function () {
      return this.getCallModel().get("state") === CallConstants.State.Talking;
    },

    computeSecurePaymentButtonText: function () {
      return "Secure Payment";
    },

    computeCustomerAccountPhoneNumberValue: function () {
      UiApi.Logger.debug(
        "computeCustomerAccountPhoneNumber",
        event,
        "current accountPhoneNumber",
        this.customerAccountPhoneNumberValue
      );

      var accountPhoneNumber = this.getPaymentAttributes().get(
        "accountPhoneNumberValue"
      );
      UiApi.Logger.debug(
        "computeCustomerAccountPhoneNumber",
        event,
        "get accountPhoneNumber",
        accountPhoneNumber
      );
      return accountPhoneNumber;
    },

    /*
            computeAccountPhoneNumberValid: function(){

                var accountPhoneNumber = this.getPaymentAttributes().get('accountPhoneNumberValue');
                var isValid = accountPhoneNumber.length !== 10;

                //UiApi.Logger.debug('computeAccountPhoneNumberValid', 'accountPhoneNumber = ' + accountPhoneNumber, 'isValid = ' + isValid);
                return isValid;


                return true;
            },
            */

    /**
     * Starts the Voice Signature Capture by conferencing in the 'Voice Signature' campaign
     * @param data Object containing additional CAVs to attach to the call
     */
    toggleSecurePayment: function (data) {
      var isPaymentIVRActive = this.isConferenceCallActive(call);
      UiApi.Logger.debug(
        "secure-payment",
        "toggleSecurePayment",
        "isPaymentIVRActive",
        isPaymentIVRActive
      );
      if (!isPaymentIVRActive) {
        this.startPaymentIVR(data);
      } else {
        this.stopPaymentIVR();
      }
    },

    updateCustomerAccountPhoneNumber: function (accountPhoneNumber) {
      var mainCall = this.getCallModel();
      UiApi.Logger.info(
        "updateCustomerAccountPhoneNumber",
        event,
        "set accountPhoneNumberValue",
        accountPhoneNumber
      );

      var accountPhoneNumberCavName = this.getPaymentAttributes().get(
        "accountPhoneNumberCavName"
      );
      if (accountPhoneNumberCavName) {
        var cav = this.getCallVariableByName(accountPhoneNumberCavName);
        if (cav) {
          var accountPhoneNumberCavId = cav.get("id");
          //UiApi.Logger.debug('updateCustomerAccountPhoneNumber', event, 'setCallVariable', 'accountPhoneNumberCavId', accountPhoneNumberCavId, 'value', accountPhoneNumber);
          mainCall.setCallVariable(accountPhoneNumberCavId, accountPhoneNumber);
        }
      }
    },

    /**
     * Starts the payment IVR by conferencing in the payment campaign
     * @param data Object containing additional CAVs to attach to the call
     */
    startPaymentIVR: function (data) {
      UiApi.Logger.debug("secure-payment", "startPaymentIVR Starting...");
      var isActive = this.getPaymentAttributes().get("isConferenceActive");

      var paymentIvrCampaignId = this.getPaymentAttributes().get(
        "paymentIvrCampaignId"
      );
      UiApi.Logger.debug(
        "secure-payment",
        "startPaymentIVR",
        "isActive",
        isActive,
        "paymentIvrCampaignId",
        paymentIvrCampaignId
      );

      this.customerAccountPhoneNumberValue = this.getPaymentAttributes().get(
        "accountPhoneNumberValue"
      );
      this.updateCustomerAccountPhoneNumber(
        this.customerAccountPhoneNumberValue
      );

      if (!isActive) {
        // DK: Moved per Vivint
        // DK: Moved back to callback
        // this.getPaymentAttributes().set('isConferenceActive', true);

        // sanity check
        if (!paymentIvrCampaignId) {
          UiApi.Logger.warn(
            "secure-payment",
            "startPaymentIVR",
            "paymentIvrCampaignId is undefined!"
          );
          return;
        }

        /*
                    // Commented out for Vivint so Agent can talk to Customer during payment capture
                    UiApi.Logger.debug('secure-payment', 'startPaymentIVR', 'setCaptureMute', true);
                    SoftphoneAudio.setCaptureMute(true);

                    var volume = SoftphoneAudio.getPlaybackVolume();
                    if (volume > 0) {
                        UiApi.Logger.debug('secure-payment', 'startPaymentIVR', 'setLastPlaybackVolume', volume);
                        SoftphoneAudio.setLastPlaybackVolume(volume);
                    }
                    SoftphoneAudio.setPlaybackVolume(0);
                    */

        var mainCall = this.getCallModel();
        if (mainCall) {
          // attach some data for payment ivr usage
          var variables = {};
          var cav, id;

          var mainSessionId = mainCall.get("id");
          UiApi.Logger.debug(
            "secure-payment",
            "startPaymentIVR",
            "Custom.mainSessionId",
            mainSessionId
          );
          cav = this.getCallVariableByName("Custom.mainSessionId");
          if (cav) {
            id = cav.get("id");
            UiApi.Logger.debug(
              "secure-payment",
              "startPaymentIVR",
              "id",
              id + " -> " + mainSessionId
            );
            variables[id] = mainSessionId;
          }

          var callIdCav = this.getCallVariableByName("Call.call_id");
          if (callIdCav) {
            try {
              var mainCallId = mainCall.get("variables")[callIdCav.get("id")];
              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIVR",
                "Custom.mainCallId",
                mainCallId
              );

              cav = this.getCallVariableByName("Custom.mainCallId");
              if (cav) {
                id = cav.get("id");
                UiApi.Logger.debug(
                  "secure-payment",
                  "startPaymentIVR",
                  "id",
                  id + " -> " + mainCallId
                );
                variables[id] = mainCallId;
              }
            } catch (e) {}
          }

          for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            var val = data[key];
            key = key.indexOf(".") > -1 ? key : "Custom." + key;
            UiApi.Logger.debug(
              "secure-payment",
              "startPaymentIVR",
              "data",
              key + "=" + val
            );
            if (val === undefined || val === "") continue;
            cav = this.getCallVariableByName(key);
            if (cav) {
              id = cav.get("id");
              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIVR",
                "id",
                id + " -> " + val
              );
              variables[id] = val;
            }
          }
          mainCall.setCallVariables(variables).done(
            _.bind(function () {
              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIVR",
                "Finished loading call variables"
              );
              // TODO even if recording=false, call may still be 'auto recorded secretly'
              var isRecording = mainCall.get("recording") || true;
              this.getViewAttributes().set("resumeRecording", isRecording);
              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIVR",
                "isRecording",
                isRecording
              );
              if (isRecording) {
                UiApi.Logger.debug(
                  "secure-payment",
                  "startPaymentIVR",
                  "stopRecording"
                );
                mainCall.stopRecording();
              }

              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIVR",
                "conferenceAddCampaign",
                paymentIvrCampaignId
              );
              mainCall.conferenceAddCampaign(paymentIvrCampaignId, false);

              // Moved back here into callback
              this.getPaymentAttributes().set("isConferenceActive", true);

              // update the local isActive flag with the model state
              isActive = this.getPaymentAttributes().get("isConferenceActive");

              // GTS: 1.3.3
              //window.top.postMessage(
              window.parent.postMessage(
                { cmd: "paymentIVR", status: "started" },
                "*"
              );

              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIvr",
                "isActive set to ... " + isActive
              );

              UiApi.Logger.debug(
                "secure-payment",
                "startPaymentIvr",
                "postMessage",
                "paymentIVRStarted"
              );
              // GTS: 1.3.3
              //window.top.postMessage(
              window.parent.postMessage(
                { cmd: "paymentIVRStarted", data: { wasActive: isActive } },
                "*"
              );
            }, this)
          );
        } else {
          UiApi.Logger.debug(
            "secure-payment",
            "startPaymentIvr",
            "Invalid main call model, do nothing!"
          );
        }

        /*  Where the 9.2 version put it...
                     UiApi.Logger.debug('secure-payment', 'startPaymentIvr','postMessage', 'paymentIVRStarted');
                     window.top.postMessage({ cmd: 'paymentIVRStarted', data: { wasActive: isActive } }, '*');
                     */
      }
    },

    /**
     * Stops the payment IVR application,
     * disconnecting the conference and restores recording
     */
    stopPaymentIVR: function () {
      var isActive = this.getPaymentAttributes().get("isConferenceActive");
      UiApi.Logger.debug(
        "secure-payment",
        "stopPaymentIVR",
        "isActive",
        isActive
      );

      //if (!isActive) return;

      /*
                UiApi.Logger.debug('secure-payment', 'stopPaymentIVR', 'setCaptureMute', false);
                SoftphoneAudio.setCaptureMute(false);
                UiApi.Logger.debug('secure-payment', 'stopPaymentIVR', 'setPlaybackVolume', SoftphoneAudio.getLastPlaybackVolume());
                SoftphoneAudio.setPlaybackVolume(SoftphoneAudio.getLastPlaybackVolume());
                */

      var mainCall = this.getCallModel();
      if (mainCall) {
        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIVR",
          "mainCallId",
          mainCall.get("id")
        );
        var mainCallState = mainCall.get("state");
        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIVR",
          "mainCallState",
          mainCallState
        );
        var confCall = this.getConfCallModel();
        if (
          !!confCall &&
          confCall.get("state") !== CallConstants.State.Finished
        ) {
          UiApi.Logger.debug(
            "secure-payment",
            "stopPaymentIVR",
            "disconnectParticipant"
          );
          confCall.disconnectParticipant();
        }

        var resumeRecording = this.getViewAttributes().get("resumeRecording");
        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIVR",
          "resumeRecording",
          resumeRecording
        );
        if (
          resumeRecording &&
          mainCallState !== CallConstants.State.Acw &&
          mainCallState !== CallConstants.State.Finished
        ) {
          UiApi.Logger.debug(
            "secure-payment",
            "stopPaymentIVR",
            "startRecording"
          );
          mainCall.startRecording();
        }

        // TODO retrieve payment IVR response, if needed

        // retrieve payment ivr response
        VivintOperations.sendPaymentIVRResponse(mainCall.get("id"));

        this.getPaymentAttributes().set("isConferenceActive", false);
        // update the local isActive flag with the model state
        isActive = this.getPaymentAttributes().get("isConferenceActive");
        // GTS: 1.3.3
        //window.top.postMessage({ cmd: "paymentIVR", status: "finished" }, "*");
        window.parent.postMessage({ cmd: "paymentIVR", status: "finished" }, "*");

        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIvr",
          "isActive set to ... " + isActive
        );

        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIvr",
          "postMessage",
          "paymentIVRFinished"
        );
        // GTS: 1.3.3
        //window.top.postMessage(
        window.parent.postMessage(
          { cmd: "paymentIVRFinished", data: { wasActive: isActive } },
          "*"
        );
      } else {
        UiApi.Logger.debug(
          "secure-payment",
          "stopPaymentIVR",
          "Invalid main call model, do nothing!"
        );
      }
    },

    /**
     * Starts the payment IVR by conferencing in the payment campaign
     * @param data Object containing additional CAVs to attach to the call
     */
    startDisclosureIVR: function (data) {
      UiApi.Logger.debug("secure-payment", "startDisclosureIVR Starting...");

      var isActive = this.getDisclosureAttributes().get("isConferenceActive");

      UiApi.Logger.debug(
        "secure-payment",
        "startDisclosureIVR",
        "isActive",
        isActive
      );
      UiApi.Logger.debug(
        "secure-payment",
        "startDisclosureIVR",
        "vars",
        this.getDisclosureAttributes()
      );

      var disclosureIvrCampaignId = this.getDisclosureAttributes().get(
        "disclosureIvrCampaignId"
      );
      UiApi.Logger.debug(
        "secure-payment",
        "startDisclosureIVR",
        "isActive",
        isActive,
        "disclosureIvrCampaignId",
        disclosureIvrCampaignId
      );

      if (!isActive) {
        // sanity check
        if (!disclosureIvrCampaignId) {
          UiApi.Logger.warn(
            "secure-payment",
            "startDisclosureIVR",
            "disclosureIvrCampaignId is undefined!"
          );
          return;
        }

        var mainCall = this.getCallModel();
        if (mainCall) {
          // attach some data for payment ivr usage
          var variables = {};
          var cav, id;

          var mainSessionId = mainCall.get("id");
          UiApi.Logger.debug(
            "secure-payment",
            "startDisclosureIVR",
            "Custom.mainSessionId",
            mainSessionId
          );
          cav = this.getCallVariableByName("Custom.mainSessionId");
          if (cav) {
            id = cav.get("id");
            UiApi.Logger.debug(
              "secure-payment",
              "startDisclosureIVR",
              "id",
              id + " -> " + mainSessionId
            );
            variables[id] = mainSessionId;
          }

          var callIdCav = this.getCallVariableByName("Call.call_id");
          if (callIdCav) {
            try {
              var mainCallId = mainCall.get("variables")[callIdCav.get("id")];
              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIVR",
                "Custom.mainCallId",
                mainCallId
              );

              cav = this.getCallVariableByName("Custom.mainCallId");
              if (cav) {
                id = cav.get("id");
                UiApi.Logger.debug(
                  "secure-payment",
                  "startDisclosureIVR",
                  "id",
                  id + " -> " + mainCallId
                );
                variables[id] = mainCallId;
              }
            } catch (e) {}
          }

          for (var key in data) {
            if (!data.hasOwnProperty(key)) continue;
            var val = data[key];
            key = key.indexOf(".") > -1 ? key : "Custom." + key;
            UiApi.Logger.debug(
              "secure-payment",
              "startDisclosureIVR",
              "data",
              key + "=" + val
            );
            if (val === undefined || val === "") continue;
            cav = this.getCallVariableByName(key);
            if (cav) {
              id = cav.get("id");
              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIVR",
                "id",
                id + " -> " + val
              );
              variables[id] = val;
            }
          }
          mainCall.setCallVariables(variables).done(
            _.bind(function () {
              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIVR",
                "Finished loading call variables"
              );
              // TODO even if recording=false, call may still be 'auto recorded secretly'
              var isRecording = mainCall.get("recording") || true;
              this.getViewAttributes().set("resumeRecording", isRecording);
              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIVR",
                "isRecording",
                isRecording
              );
              if (isRecording) {
                UiApi.Logger.debug(
                  "secure-payment",
                  "startDisclosureIVR",
                  "stopRecording"
                );
                mainCall.stopRecording();
              }

              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIVR",
                "conferenceAddCampaign",
                disclosureIvrCampaignId
              );
              mainCall.conferenceAddCampaign(disclosureIvrCampaignId, false);

              this.getDisclosureAttributes().set("isConferenceActive", true);

              // update the local isActive flag with the model state
              isActive = this.getDisclosureAttributes().get(
                "isConferenceActive"
              );
              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIvr",
                "isActive set to ... " + isActive
              );

              // GTS: 1.3.3
              //window.top.postMessage(
              window.parent.postMessage(
                { cmd: "disclosureIVR", status: "started" },
                "*"
              );

              UiApi.Logger.debug(
                "secure-payment",
                "startDisclosureIvr",
                "postMessage",
                "disclosureIVRStarted"
              );
              // GTS: 1.3.3
              //window.top.postMessage(
              window.parent.postMessage(
                { cmd: "disclosureIVRStarted", data: { wasActive: isActive } },
                "*"
              );
            }, this)
          );
        } else {
          UiApi.Logger.debug(
            "secure-payment",
            "startDisclosureIvr",
            "Invalid main call model, do nothing!"
          );
        }

        // Simple Version without session details
        //
        // if (mainCall) {
        //     UiApi.Logger.debug('secure-payment', 'startDisclosureIVR', 'conferenceAddCampaign', disclosureIvrCampaignId);
        //     mainCall.conferenceAddCampaign(disclosureIvrCampaignId, false);
        //     this.getDisclosureAttributes().set('isConferenceActive', true);

        //     // update the local isActive flag with the model state
        //     isActive = this.getDisclosureAttributes().get('isConferenceActive');
        //     window.top.postMessage({cmd: 'disclosureIVR', status: 'started'}, '*');

        //     UiApi.Logger.debug('secure-payment', 'startDisclosureIvr', 'isActive set to ... ' + isActive);
        //     UiApi.Logger.debug('secure-payment', 'startDisclosureIvr', 'postMessage', 'disclosureIVRStarted');

        //     window.top.postMessage({cmd: 'disclosureIVRStarted', data: {wasActive: isActive}}, '*');
        // }
        // else {
        //     UiApi.Logger.debug('secure-payment', 'startDisclosureIvr', 'Invalid main call model, do nothing!');
        // }
      }
    },

    stopDisclosureIVR: function () {
      var isActive = this.getDisclosureAttributes().get("isConferenceActive");
      UiApi.Logger.debug(
        "secure-payment",
        "stopDisclosureIVR",
        "isActive",
        isActive
      );

      var mainCall = this.getCallModel();
      if (mainCall) {
        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIVR",
          "mainCallId",
          mainCall.get("id")
        );
        var mainCallState = mainCall.get("state");
        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIVR",
          "mainCallState",
          mainCallState
        );
        var confCall = this.getConfCallModel();
        if (
          !!confCall &&
          confCall.get("state") !== CallConstants.State.Finished
        ) {
          UiApi.Logger.debug(
            "secure-payment",
            "stopDisclosureIVR",
            "disconnectParticipant"
          );
          confCall.disconnectParticipant();
        }

        var resumeRecording = this.getViewAttributes().get("resumeRecording");
        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIVR",
          "resumeRecording",
          resumeRecording
        );
        if (
          resumeRecording &&
          mainCallState !== CallConstants.State.Acw &&
          mainCallState !== CallConstants.State.Finished
        ) {
          UiApi.Logger.debug(
            "secure-payment",
            "stopDisclosureIVR",
            "startRecording"
          );
          mainCall.startRecording();
        }

        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIVR",
          "Calling VivintOperations.sendDisclosureIVRResponse for call id: ",
          mainCall.get("id")
        );
        VivintOperations.sendDisclosureIVRResponse(mainCall.get("id"));

        this.getDisclosureAttributes().set("isConferenceActive", false);
        // update the local isActive flag with the model state
        isActive = this.getDisclosureAttributes().get("isConferenceActive");
        // GTS: 1.3.3
        //window.top.postMessage(
        window.parent.postMessage(
          { cmd: "disclosureIVR", status: "finished" },
          "*"
        );

        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIvr",
          "isActive set to: " + isActive
        );

        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIvr",
          "postMessage",
          "sending: disclosureIVRFinished"
        );
        // GTS: 1.3.3
        //window.top.postMessage(
        window.parent.postMessage(
          { cmd: "disclosureIVRFinished", data: { wasActive: isActive } },
          "*"
        );
      } else {
        UiApi.Logger.debug(
          "secure-payment",
          "stopDisclosureIVR",
          "Invalid main call model, do nothing!"
        );
      }
    },

    isCallRecording: function () {
      var mainCall = this.getCallModel();
      return mainCall.get("recording");
    },

    // isPaymentIVRActive: function () {
    isConferenceCallActive: function () {
      // UiApi.Logger.debug('secure-payment', 'isConferenceCallActive');
      var confCall = this.getConfCallModel();
      var result =
        confCall.get("state") === CallConstants.State.ParticipantRinging ||
        confCall.get("state") === CallConstants.State.ParticipantTalking ||
        confCall.get("state") === CallConstants.State.ParticipantConsulting;

      // UiApi.Logger.debug('secure-payment', 'isConferenceCallActive: ', !!confCall, result );

      return !!confCall && result;
    },

    isConferenceCall: function (call) {
      // UiApi.Logger.debug('secure-payment', 'isConferenceCall');
      var result =
        call.get("callType") === CallConstants.Type.Internal &&
        call.get("addressType") !== Calls.AddressTypes.External &&
        (call.get("dnis") ===
          "campaign:" +
            this.getPaymentAttributes().get("paymentIvrCampaignName") ||
          call.get("dnis") ===
            "campaign:" +
              this.getDisclosureAttributes().get("disclosureIvrCampaignName"));

      // UiApi.Logger.debug('secure-payment', 'isConferenceCall: ', !!call, result );
      return !!call && result;
    },

    getConferenceCall: function () {
      return _.find(
        this.getAllCalls().models,
        function (call) {
          return this.isConferenceCall(call);
        },
        this
      );
    },

    getCallVariableByName: function (cavName) {
      var parts = (cavName || "").split(".");
      if (parts.length === 2) {
        return _.find(
          this.getCallVariables().models,
          function (cav) {
            return (
              cav.get("group") === parts[0] && cav.get("name") === parts[1]
            );
          },
          this
        );
      }
    },

    getCampaignByName: function (campaignName) {
      return _.find(
        this.getCampaigns().models,
        function (campaign) {
          return campaign.get("name") === campaignName;
        },
        this
      );
    },

    onDestroy: function () {
      UiApi.Logger.debug("secure-payment", "onDestroy");
      MessageListener.removeListener(this.messageCallback);
      //UiApi.Core.deleteAll(this);
    },
  });
});

define('components/3rdPartyComp-call-middle/views/view',['ui.api.v1'],
    function (UiApi) {

        var Views = {};
        Views.Layout = UiApi.Framework.Container.extend({
            template: '3rdPartyComp-call-middle',

            events: {
                'click #btn_SecurePayment': 'onSecurePaymentClicked',
                'input #txt_customerAccountPhoneNumber': 'accountNumberChanged'
            },

            initialize: function(options) {
                var activeTask = UiApi.ComputedModels.activeTasksModel().getActiveTask(UiApi.ActiveTaskType.Call);
                if (!!activeTask) {
                    this.model = UiApi.SharedPresModelRepo.getModel('call-middle.pres.model', {callId: activeTask.id});
                    this.listenTo(this.model, 'change', this.render);
                    this.model.fetch();
                }
            },

            accountNumberChanged: function(e) {
                var oldValue = this.model.getPaymentAttributes().get('accountPhoneNumberValue');
                var newValue = this.$(e.currentTarget).val();
                var newValueLength = newValue.length;
                //UiApi.Logger.debug('accountNumberChangedEvent', 'oldValue = ' + oldValue, 'newValue = ' + newValue, 'length = ' + newValueLength);
                this.executeWithoutRender(function () {
                    this.model.getPaymentAttributes().set('accountPhoneNumberValue', newValue);
                });

                if ((oldValue.length > 0 && newValue.length == 0) || (oldValue.length == 0 && newValue.length > 0)) {
                    this.render();
                }

            },

            onSecurePaymentClicked: function() {
                this.model.toggleSecurePayment();
            }


        });

        return Views;
    });
define('components/3rdPartyComp-call-middle/main',['ui.api.v1', './views/view'],
    function(UiApi, Views) {
        var Component = UiApi.Framework.BaseComponent.extend({
            initialize: function(options) {
                return new Views.Layout(options);
            }
        });
        return Component;
    });

define('3rdparty.bundle',[
    'ui.api.v1',
    'handlebars',
    'workflow/init'

    //presentations models
    ,'presentation.models/call-middle.pres.model'

    //components
    ,'components/3rdPartyComp-call-middle/main'

  ],
  function (UiApi, Handlebars, Init
            ,Constructor0
      ) {

    UiApi.config({});

this["JST"] = this["JST"] || {};

this["JST"]["3rdPartyComp-call-middle"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <div class=\"third-party-styles\">\n        <div class=\"call_action_buttons\">\n            <div id=\"3rd-call-tools\" class=\"btn-group\">\n                <ul id=\"3rd-call-controls\">\n                    <!--\n                    <li>\n                        <div class=\"form-group has-error\">\n\n                            <label class=\"secure-pay-label\" for=\"txt_customerAccountPhoneNumber\">Account Phone Number</label>\n                            <input\n                                    type=\"text\"\n                                    id=\"txt_customerAccountPhoneNumber\"\n                                    name=\"customerAccountPhoneNumber\"\n                                    title=\"Enter Customer's Account Phone Number\"\n                                    placeholder=\"Account Phone Number\"\n                                    value=\""
    + alias4(((helper = (helper = helpers.customerAccountPhoneNumberValue || (depth0 != null ? depth0.customerAccountPhoneNumberValue : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"customerAccountPhoneNumberValue","hash":{},"data":data}) : helper)))
    + "\"\n                                    style=\"font-size: 12px; padding: 4px;\"\n                            />\n\n                        </div>\n                    </li>\n                    <li>\n\n                        <button\n                                id=\"btn_SecurePayment\"\n                                class=\""
    + alias4(((helper = (helper = helpers.btnSecurePaymentState || (depth0 != null ? depth0.btnSecurePaymentState : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"btnSecurePaymentState","hash":{},"data":data}) : helper)))
    + "\"\n                                style=\"text-align: center; margin: 4px 0 0 1px;\"\n                                "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.btnSecurePaymentEnabled : depth0),{"name":"unless","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n                        >\n                            <span style=\"margin: 0 -2px 0 -2px;\">"
    + alias4(((helper = (helper = helpers.SecurePaymentButtonText || (depth0 != null ? depth0.SecurePaymentButtonText : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"SecurePaymentButtonText","hash":{},"data":data}) : helper)))
    + "</span>\n                        </button>\n\n                    </li>\n                    -->\n                </ul>\n            </div>\n        </div>\n        <div class=\"secure-pay-active call-log-underline\" style=\"margin: 20px 0 0 0\">\n            <span style=\"color: darkred; text-align: center; font-weight: bold; width: 100%; margin: -15px 0 0 0; padding: 2px;\">"
    + alias4(((helper = (helper = helpers.securePayState || (depth0 != null ? depth0.securePayState : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"securePayState","hash":{},"data":data}) : helper)))
    + "</span>\n        </div>\n    </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "disabled=\"disabled\"";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.securePayVisible : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true});

    require.config({
      map: {
        '*': {
        }
      }
    });

    UiApi.Logger.info('Registering 3rdparty presentation model with name call-middle.pres.model');
    UiApi.SharedPresModelRepo.registerConstructor('call-middle.pres.model', Constructor0);

    Init.initialize();
    UiApi.vent.on(UiApi.PresModelEvents.WfMainOnModelLoad, function() {
      Init.onModelLoad();
    });
    UiApi.vent.on(UiApi.PresModelEvents.WfMainOnModelUnload, function() {
      Init.onModelUnload();
    });
  });
