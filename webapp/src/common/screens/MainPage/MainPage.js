import React, { Component } from "react";
import { translate } from "react-i18next";
import { NavLink, Redirect, Route } from "react-router-dom";
import PropTypes from "prop-types";
import { Icon, Menu, Segment, Sidebar } from "semantic-ui-react";

import "./MainPage.css";
import * as routes from "routes";
import * as loginRoutes from "auth/routes";
import Notifications from "common/components/Notifications/Notifications";
import ModalDebugContainer from "debug/components/ModalDebug/ModalDebugContainer";
import SettingsModalContainer from "settings/components/SettingsModal/SettingsModalContainer";
import { logMessage } from "common/utils/logs";

function MainSidebar(props) {
  return (
    <Sidebar
      as={Menu}
      animation="overlay"
      width="thin"
      visible={props.visible}
      icon="labeled"
      vertical
    >
      {props.renderSidebarItems}
      <Menu.Item
        onClick={props.onClick}
        name={"settings"}
        className={"SidebarSettingsButton"}
      >
        <Icon name={"settings"} />
        {"Settings"}
      </Menu.Item>
      <ModalDebugContainer hideSidebarIfVisible={props.hideSidebarIfVisible} />
    </Sidebar>
  );
}

MainSidebar.propTypes = {
  visible: PropTypes.bool,
  renderSidebarItems: PropTypes.any,
  onClick: PropTypes.func,
  hideSidebarIfVisible: PropTypes.func
};

function MainPusher(props) {
  return (
    <Sidebar.Pusher dimmed={props.dimmed} className={"MainPusher"}>
      {props.renderMainRoutes}
      <Notifications notifications={props.notifications} />
      <SettingsModalContainer
        hideSidebarIfVisible={props.hideSidebarIfVisible}
      />
    </Sidebar.Pusher>
  );
}

MainPusher.propTypes = {
  dimmed: PropTypes.bool,
  renderMainRoutes: PropTypes.any,
  notifications: PropTypes.any,
  hideSidebarIfVisible: PropTypes.func
};

export class MainPage extends Component {
  static propTypes = {
    t: PropTypes.func.isRequired,
    isAuthenticated: PropTypes.bool.isRequired,
    isVisible: PropTypes.bool.isRequired,
    contentDimmed: PropTypes.bool.isRequired,
    notifications: PropTypes.array,
    hideSidebar: PropTypes.func.isRequired,
    openSettingsModal: PropTypes.func.isRequired
  };

  hideSidebarIfVisible = () => {
    logMessage("Hiding Sidebar");
    return this.props.hideSidebar();
  };

  /**
   * Renders all the sidebar items
   * @returns {*}
   */
  renderSidebarItems = () => {
    const { t } = this.props;
    return routes.mainRoutes(t).map((route, index) => (
      <Menu.Item
        onClick={this.hideSidebarIfVisible}
        name={route.sidebarId}
        as={NavLink}
        key={index}
        to={route.path}
        exact={route.exact}
        className={`Sidebar_${route.sidebarId}`}
      >
        <Icon name={route.sidebarIcon} />
        {route.sidebarText}
      </Menu.Item>
    ));
  };

  /**
   * Renders the main content routes
   * @returns {*}
   */
  renderMainRoutes = () => {
    const { t } = this.props;
    return routes.mainRoutes(t).map((route, index) => (
      /**
       * You can render a <Route> in as many places
       * as you want in your app. It will render along
       * with any other <Route>s that also match the URL.
       * So, a sidebar or breadcrumbs or anything else
       * that requires you to render multiple things
       * in multiple places at the same URL is nothing
       * more than multiple <Route>s.
       */
      <Route
        key={index}
        path={route.path}
        exact={route.exact}
        component={route.main}
      />
    ));
  };

  openSettingsModalAction = () => {
    const { openSettingsModal } = this.props;
    openSettingsModal();
  };

  render() {
    const { notifications } = this.props;

    if (!this.props.isAuthenticated) {
      return <Redirect to={loginRoutes.loginRoute.path} />;
    }

    return (
      <Sidebar.Pushable as={Segment}>
        <MainSidebar
          visible={this.props.isVisible}
          renderSidebarItems={this.renderSidebarItems()}
          onClick={this.openSettingsModalAction}
          hideSidebarIfVisible={this.hideSidebarIfVisible}
        />
        <MainPusher
          dimmed={this.props.contentDimmed}
          renderMainRoutes={this.renderMainRoutes()}
          notifications={notifications}
          hideSidebarIfVisible={this.hideSidebarIfVisible}
        />
      </Sidebar.Pushable>
    );
  }
}

export default translate("translations")(MainPage);