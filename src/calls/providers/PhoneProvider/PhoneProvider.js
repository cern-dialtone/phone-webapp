import React, {Children, Component} from 'react'
import * as connectionActionCreators from 'calls/actions/connection'
import * as callActionCreators from 'calls/actions/call'
import * as recentActionCreators from 'calls/actions/recent'
import * as searchActionCreators from 'calls/actions/search'
import {success, info, warning} from 'common/actions/notifications'

import {connect} from 'react-redux'
import PropTypes from 'prop-types'

import {bindActionCreators} from 'redux'
import {buildRecipient} from 'calls/utils'

const pStyle = {
  height: '100%',
  width: '100%'
};

export const phoneService = (ComponentToWrap) => {
  return class ThemeComponent extends Component {
    // let’s define what’s needed from the `context`
    static contextTypes = {
      phoneService: PropTypes.object
    }

    render () {
      const {phoneService} = this.context
      // what we do is basically rendering `ComponentToWrap`
      // with an added `phoneService` prop, like a hook
      return (
        <ComponentToWrap {...this.props} phoneService={phoneService}/>
      )
    }
  }
}

class PhoneProvider extends Component {
  static propTypes = {
    children: PropTypes.node,
    requestConnection: PropTypes.func,
    setConnectionFailure: PropTypes.func,
    setConnected: PropTypes.func,
    requestDisconnection: PropTypes.func,
    setDisconnected: PropTypes.func,
    makeCall: PropTypes.func,
    rejectCall: PropTypes.func,
    isCalling: PropTypes.func,
    callFailed: PropTypes.func,
    recipient: PropTypes.object,
    success: PropTypes.func,
    info: PropTypes.func,
    warning: PropTypes.func,
    unSelectUser: PropTypes.func.isRequired,
  }

  state = {
    phoneService: this
  }

  registeredNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: 'You are connected now',
    position: 'tr',
    autoDismiss: 2
  }

  unRegisteredNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: 'You have been disconnected',
    message: `You won't be able to make or receive any calls until you connect again`,
    position: 'tr',
    autoDismiss: 4
  }

  callTerminatedNotificationOpts = {
    // uid: 'once-please', // you can specify your own uid if required
    title: 'The call was terminated',
    position: 'tr',
    autoDismiss: 2
  }

  static async loadDialApi () {
    console.debug(process.env.REACT_APP_TONE_API_PATH)
    const {Dial} = await import(process.env.REACT_APP_TONE_API_PATH)
    return Dial
  }

  componentDidMount () {
    let dial = null
    PhoneProvider.loadDialApi().then((Dial) => {
      this.audioElement = document.getElementById('callsAudioInput')
      dial = new Dial(this.audioElement)
      this.setState({
        dial: dial
      }, () => {
        this.addListeners()
      })
    })
  }

  addListeners = () => {
    this.notifier = this.state.dial.getNotifier();
    if (this.notifier) {
      this.notifier.addEventListener('ToneEvent', this.eventHandler, false);
    }
  }

  eventHandler = (event) => {
    console.log("Tone Event!")
    console.log(event.detail.name)
    console.log(event)

    const tempRejectedMessage = {
      code: {
        status_code: 'NI'
      },
      description: 'NOT IMPLEMENTED (REJECTED)'
    }

    const tempFailedMessage = {
      code: {
        status_code: 'NI'
      },
      description: 'NOT IMPLEMENTED (FAILED)'
    }

    switch (event.detail.name) {
      // SetMedia
      case 'trackAdded':
        let playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(_ => {
            // Automatic playback started!
            // Show playing UI.
          }).catch(error => {
              // Auto-play was prevented
              // Show paused UI.
            });
        }
        break;
      // Registering
      case 'registered':
        this.props.success(this.registeredNotificationOpts)
        this.props.setConnected()
        break
      case 'unregistered':
        this.props.warning(this.unRegisteredNotificationOpts)
        this.props.setDisconnected()
        break
      case 'registrationFailed':
        this.props.setConnectionFailure(event.detail.error)
        break
      // Calls
      case 'progress':
        // TODO
        this.props.isCalling()
        break
      case 'accepted':
        // TODO
        this.props.acceptCall()
        break
      case 'terminated':
        // TODO
        this.props.success(this.callTerminatedNotificationOpts)
        this.handleHangUpCallEvent()
        break
      case 'rejected':
        // TODO: Detail doesn't include error field nor error code
        // this.props.setConnectionFailure(event.detail.error)
        this.props.rejectCall(tempRejectedMessage)
        break
      case 'failed':
        // TODO
        this.props.callFailed(tempFailedMessage)
        break

      default:
        console.error(`Unhandled event: ${event.detail.name}`)
    }
  }

  authenticateUser = (username, password) => {
    console.debug(`Authenticating user: ${username}/*****`)
    this.props.requestConnection()
    return this.state.dial.authenticate(username, password)
  }

  unAuthenticateUser = () => {
    console.debug('UnAuthenticating user')
    this.props.requestDisconnection(true)
    return this.state.dial.stopAgent()
  }

  makeCall = (recipient) => {
    console.debug(`Calling user ${recipient.name} with number ${recipient.number}`)
    this.props.makeCall({
      name: recipient.name,
      phoneNumber: recipient.phoneNumber,
      incoming: recipient.incoming,
      missed: recipient.missed,
      startTime: Date.now()
    })
    return this.state.dial.call(recipient.number)
  }

  hangUpCall = () => {
    return this.state.dial.hangUp();
  }

  handleHangUpCallEvent = () => {
    let {recipient} = this.props
    this.props.addRecentCall(recipient)
    this.props.hangupCall()
    this.props.unSelectUser()
  }

  getChildContext () {
    return {phoneService: this.state.phoneService}
  }

  render () {
    console.debug(this.state.phoneService)
    const {children} = this.props
    return Children.only(children)
  }
}

PhoneProvider.childContextTypes = {
  phoneService: PropTypes.object.isRequired
}

function mapStateToProps ({calls}) {
  return {
    recipient: (calls.call)? calls.call.recipient: undefined,
  }
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
    ...connectionActionCreators,
    ...callActionCreators,
    ...recentActionCreators,
    ... searchActionCreators,
    success, info, warning
  }, dispatch)
}

export default phoneService(connect(
  mapStateToProps,
  mapDispatchToProps
)(PhoneProvider))
