import React, { useEffect, useState } from 'react';
import Input from 'antd/es/input/Input';
import { message as antdMessage } from "antd"
import "./index.css"

import { MessageBody } from '../../types/webrtc';
import Message from './Message';


let timer

interface TextMessageComponent {
  MessageList: Array<MessageBody>,
  wsMessageText: Function
}



const TextMessageList: React.FC<TextMessageComponent> = (prop) => {

  const [message, setMessage] = useState("")
  const { MessageList, wsMessageText } = prop

  function throttle(func: Function, delay: number) {
    let lastCallTime = 0;
    return function (...args: any) {
      const now = Date.now();
      if (now - lastCallTime >= delay) {
        func.apply(null, args);
        lastCallTime = now;
      } else {
        antdMessage.error("你发送的太快了，请休息一下~")

      }
    };
  }

  const sendMessage = function () {
    wsMessageText(message)
    setMessage("")
  }
  const throSendMessage = throttle(sendMessage, 1000)
  return (<>
    <div className='message-list-header flex-between'>
      <h3>讨论区</h3>
      <svg className="icon" aria-hidden="true" >
        <use xlinkHref="#icon-xiaoxi2"></use>
      </svg>
    </div>
    <div className='message-list-body' id='message-list-body'>
      {
        MessageList.map((item: MessageBody) => {
          return (
            <Message message={item}></Message>
          )
        })
      }

    </div>
    <div className='message-list-footer flex-between'>
      <Input
        placeholder="开始讨论"
        onChange={event => setMessage(event.target.value)}
        value={message}
        onPressEnter={() => throSendMessage()}
        prefix={
          <svg className="icon upload-img-icon" aria-hidden="true"  >
            <use xlinkHref="#icon-pic-s"></use>
          </svg>
        }
        suffix={
          <svg className="icon send-icon" aria-hidden="true" onClick={() => throSendMessage()} >
            <use xlinkHref="#icon-fasong"></use>
          </svg>} />
    </div>
  </>)
};

export default React.memo(TextMessageList);