import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { callForwardingActions, searchActionFactory } from 'dial-core';

import { CallForwardingAddModal } from './CallForwardingAddModal';

function mapStateToProps({ callForwarding, user }) {
  return {
    localForwardList: callForwarding.localForwardList,
    status: callForwarding.status,
    me: user
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      addLocalForwardNumber: callForwardingActions.addLocalForwardNumber,
      searchUsers: searchActionFactory(process.env.REACT_APP_API_ENDPOINT)
        .searchUsers
    },
    dispatch
  );
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CallForwardingAddModal);
