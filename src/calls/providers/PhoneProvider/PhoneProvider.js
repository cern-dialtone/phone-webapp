import React, { Children, Component } from "react";
import PropTypes from "prop-types";
import {
  errorMessage,
  infoMessage,
  logEvent,
  logMessage,
  toneInMessage,
  toneOutMessage
} from "common/utils/logs";
import ErrorBoundary from "common/components/ErrorBoundary/ErrorBoundary";

export const phoneService = ComponentToWrap => {
  return class ThemeComponent extends Component {
    // let’s define what’s needed from the `context`
    static contextTypes = {
      phoneService: PropTypes.object
    };

    render() {
      const { phoneService } = this.context;
      // what we do is basically rendering `ComponentToWrap`
      // with an added `phoneService` prop, like a hook
      return (
        <ErrorBoundary>
          <ComponentToWrap {...this.props} phoneService={phoneService} />
        </ErrorBoundary>
      );
    }
  };
};
/**
 * Interfaces between Telephony API and UI
 */
export default class PhoneProvider extends Component {
  static propTypes = {
    onCall: PropTypes.bool.isRequired,
    recipient: PropTypes.object,
    token: PropTypes.string,
    children: PropTypes.node,
    requestConnection: PropTypes.func,
    setConnectionFailure: PropTypes.func,
    setConnected: PropTypes.func,
    requestDisconnection: PropTypes.func,
    setDisconnected: PropTypes.func,
    makeCall: PropTypes.func,
    rejectOutgoingCall: PropTypes.func,
    isCalling: PropTypes.func,
    isReceivingCall: PropTypes.func,
    callFailed: PropTypes.func,
    success: PropTypes.func,
    info: PropTypes.func,
    warning: PropTypes.func,
    addRecentCall: PropTypes.func.isRequired,
    acceptOutgoingCall: PropTypes.func.isRequired,
    hangupCall: PropTypes.func.isRequired,
    rejectIncomingCall: PropTypes.func.isRequired
  };

  static childContextTypes = {
    phoneService: PropTypes.object.isRequired
  };

  state = {
    phoneService: this
  };

  ringToneId = "ringTone";
  ringBackToneId = "ringbackTone";
  callInputId = "callsAudioInput";

  registeredNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: "You are connected now",
    position: "tr",
    autoDismiss: 2
  };

  unRegisteredNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: "You have been disconnected",
    message: `You won't be able to make or receive any calls until you connect again`,
    position: "tr",
    autoDismiss: 4
  };

  callTerminatedNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: "The call was terminated",
    position: "tr",
    autoDismiss: 2
  };

  static async loadDialApi() {
    logMessage(process.env.REACT_APP_TONE_API_PATH);
    const { Dial } = await import(process.env.REACT_APP_TONE_API_PATH);
    return Dial;
  }

  componentDidMount() {
    let dial = null;
    PhoneProvider.loadDialApi().then(Dial => {
      this.audioElement = document.getElementById(this.callInputId);
      dial = new Dial(this.audioElement);
      this.setState(
        {
          dial: dial
        },
        () => {
          this.addListeners();
        }
      );
    });
  }

  /**
   * Only for testing purposes.
   */
  sayHi = () => {
    logMessage("Hello!");
  };

  acceptIncomingCall = () => {
    const { acceptIncomingCall } = this.props;
    toneOutMessage(`Accepting incoming call`);

    this.stopRingTone();
    acceptIncomingCall();
    this.state.dial.answer();
  };

  acceptOutgoingCall = () => {
    logMessage("Accepting call");
    this.props.acceptOutgoingCall();
    // TODO We need to stablish a connection between the clients
  };

  addListeners = () => {
    this.notifier = this.state.dial.getNotifier();
    if (this.notifier) {
      this.notifier.on("ToneEvent", event => {
        this.eventHandler(event);
      });
    }
  };

  /**
   * Authenticates the user using the Telephony API
   * @param username
   * @returns {boolean|void|*}
   */
  authenticateUser = username => {
    const { token, requestConnection } = this.props;

    logEvent("calls", `authenticate`, `user: ${username}.`);
    toneOutMessage(`Authenticating user: ${username}/*****`);
    this.setState({ username: username });
    requestConnection();
    this.state.dial.authenticate(username, token);
    // const eToken = this.state.dial.authenticate(username, token);
    // encryptToken(eToken);

    // TODO The ideal thing here is to know if the authentication succeeded
  };

  handleTrackAdded(event) {
    this.audioElement.srcObject = event.data.remoteStream;
    let playPromise = this.audioElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(_ => {
          infoMessage("On a call. Audio track playing");
          this.setState({
            trackAdded: true
          });
        })
        .catch(error => {
          errorMessage("Unable to play the audio track.");
          this.setState({
            trackAdded: false,
            error: error
          });
        });
    }
  }

  hangUpCurrentCall = () => {
    const { dial } = this.state;
    toneOutMessage(`Hang up current call`);
    this.hangUpCallEvent();
    return dial.hangUp();
  };

  hangUpCallEvent = () => {
    // const { username } = this.state;
    const { hangupCall } = this.props;

    // logEvent("calls", `hangUp`, `caller: ${username}.`);
    hangupCall();
  };

  /**
   * Makes a call to another person given his/her data
   * @param name Name of the person
   * @param phoneNumber Phone number
   * @returns {*}
   */
  makeCall = ({ name, phoneNumber }) => {
    const { makeCall, isCalling } = this.props;
    const { dial, username } = this.state;

    toneOutMessage(`Calling user ${name} with number ${phoneNumber}`);
    logEvent(
      "calls",
      `make`,
      `caller: ${username}. callee: ${name}. number: ${phoneNumber}`
    );
    makeCall({
      name: name,
      phoneNumber: phoneNumber
    });
    this.playRingbacktone();
    isCalling();
    return dial.call(phoneNumber);
  };

  playRingbacktone = () => {
    document
      .getElementById(this.ringBackToneId)
      .play()
      .catch(() => {
        errorMessage("RingbackTone play() raised an error.");
      });
  };

  playRingTone = () => {
    document
      .getElementById(this.ringToneId)
      .play()
      .catch(() => {
        errorMessage("RingTone play() raised an error.");
      });
  };

  sendDtmfCommand = tone => {
    this.state.dial.sendDTMF(tone);
  };

  stopRingbacktone = () => {
    document.getElementById(this.ringBackToneId).pause();
  };

  stopRingTone = () => {
    document.getElementById(this.ringToneId).pause();
  };

  receiveCall = ({ callerNumber, callerName }) => {
    const { isReceivingCall } = this.props;
    logMessage("Is receiving call");
    this.playRingTone();
    isReceivingCall(callerNumber, callerName);
  };

  /**
   * Method that must be called when an incoming call is rejected.
   * It performs all the actions needed by this action.
   */
  rejectIncomingCall = () => {
    const { rejectIncomingCall } = this.props;
    const { dial } = this.state;

    logMessage("Rejecting incoming call");

    this.stopRingTone();
    rejectIncomingCall();
    return dial.hangUp();
  };

  rejectOutgoingCall = () => {
    const { rejectOutgoingCall } = this.props;

    logMessage("Rejecting call");

    this.stopRingTone();
    rejectOutgoingCall();
  };

  /**
   * Logs the user out of TONE
   */
  unAuthenticateUser = () => {
    logEvent("calls", `unAuthenticate`, `user: ${this.state.username}.`);
    toneOutMessage(`UnAuthenticating user`);

    this.setState({ username: undefined });

    if (this.props.onCall) {
      this.hangUpCurrentCall();
    }
    this.props.requestDisconnection(true);
    return this.state.dial.stopAgent();
    // TODO Maybe stopAgent() is not the right method to call
  };

  getChildContext() {
    return { phoneService: this.state.phoneService };
  }

  eventHandler = event => {
    const {
      setConnected,
      success,
      warning,
      setDisconnected,
      setConnectionFailure,
      acceptOutgoingCall,
      rejectOutgoingCall,
      callFailed
    } = this.props;

    toneInMessage(`Tone Event received: ${event.name}`);
    toneInMessage(event);
    const tempRejectedMessage = {
      code: {
        status_code: "NI"
      },
      description: "NOT IMPLEMENTED (REJECTED)"
    };

    const tempFailedMessage = {
      code: {
        status_code: "NI"
      },
      description: "NOT IMPLEMENTED (FAILED)"
    };

    switch (event.name) {
      // SetMedia
      case "trackAdded":
        infoMessage("trackAdded ");
        this.handleTrackAdded(event);
        break;
      // Registering
      case "registered":
        setConnected();
        // if (firstRegister) {
        //   success(this.registeredNotificationOpts);
        // }
        break;
      case "unregistered":
        warning(this.unRegisteredNotificationOpts);
        setDisconnected();
        break;
      case "registrationFailed":
        if (event.error !== undefined) {
          setConnectionFailure(event.error);
        }
        break;
      // Calls
      case "progress":
        logMessage("onACall");
        break;
      case "accepted":
        // TODO
        this.stopRingbacktone();
        const {setRecipentStartDate} = this.props;
        setRecipentStartDate(Date.now());
        acceptOutgoingCall();
        break;
      case "terminated":
        // TODO
        this.stopRingbacktone();
        this.stopRingTone();
        if (this.props.onCall) {
          const { addRecentCall, recipient } = this.props;
          let recipient2 = recipient;
          if(!recipient2.name){
            recipient2.name = recipient2.phoneNumber;
          }
          recipient2.endDate = new Date();
          addRecentCall(recipient2);
        }
        this.hangUpCallEvent();
        success(this.callTerminatedNotificationOpts);

        break;
      case "rejected":
        // TODO: Detail doesn't include error field nor error code
        rejectOutgoingCall(tempRejectedMessage);
        const { addRecentCall, recipient } = this.props;
        let recipient2 = recipient;
        if(!recipient2.name){
          recipient2.name = recipient2.phoneNumber;
        }
        recipient2.missed = true;
        recipient2.endDate = recipient2.startDate;
        addRecentCall(recipient2);
        this.stopRingbacktone();
        this.hangUpCallEvent();
        break;
      case "failed":
        // TODO
        callFailed(tempFailedMessage);
        break;

      case "inviteReceived":
        const caller = event.data.session.remoteIdentity.uri.user;
        logMessage(caller);
        this.receiveCall(event.data);
        this.props.setRecipentPhoneNumber(caller);

        break;
      default:
        errorMessage(`Unhandled event: ${event.name}`);
    }
  };

  render() {
    const { children } = this.props;
    return Children.only(children);
  }
}
