import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { Icon, Item } from "semantic-ui-react";
import { buildRecipient } from "calls/utils";

class RecentCall extends Component {
  static propTypes = {
    recentCall: PropTypes.object.isRequired
  };

  setRecipient = () => {
    const { name, phoneNumber, startTime } = this.props.recentCall;
    const recipient = {
      name: name,
      phoneNumber: phoneNumber,
      startTime: startTime,
      incoming: false,
      missed: false
    };
    return buildRecipient(recipient);
  };

  render() {
    const {
      name,
      phoneNumber,
      startTime,
      endTime,
      missed,
      incoming
    } = this.props.recentCall;

    const color = missed ? "red" : "green";

    const printableDate = moment(startTime).calendar();
    const duration = moment.duration(moment(endTime).diff(moment(startTime)));

    return (
      <Item className={"padded-item"}>
        <Icon
          name="phone"
          size={"large"}
          color={"grey"}
          className={"ui avatar"}
        />

        <Item.Content>
          <Item.Header as={"h4"}>
            {name} {phoneNumber ? `(${phoneNumber})` : ""}
          </Item.Header>
          <Item.Description>
            {incoming ? (
              <Icon name={"arrow down"} color={color} />
            ) : (
              <Icon name={"arrow up"} color={color} />
            )}
            <span className="date">
              {printableDate} - {duration.humanize()}
            </span>
          </Item.Description>
        </Item.Content>
      </Item>
    );
  }
}

export default RecentCall;
