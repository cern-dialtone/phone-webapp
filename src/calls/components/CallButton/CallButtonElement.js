import React from 'react';
import DetectRTC from 'detectrtc';

/**
 * Represents any Call Button
 * @param props
 * @returns {*}
 * @constructor
 */

export function CallButtonElement({ text, onClick }) {
  function checkDevices() {
    if (DetectRTC.hasSpeakers && DetectRTC.hasMicrophone) {
      onClick();
    } else {
      DetectRTC.load(() => {
        if (DetectRTC.hasSpeakers && DetectRTC.hasMicrophone) {
          onClick();
        } else {
          alert(
            'There are no input/output devices.\nPlease connect at least one speaker and one microphone.'
          );
        }
      });
    }
  }

  return <div onClick={checkDevices}>{text}</div>;
}
