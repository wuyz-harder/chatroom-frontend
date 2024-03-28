import React, { useEffect, useState } from 'react';
import Input from 'antd/es/input/Input';
import "./index.css"
import { emiter } from '../../common/constants';
import { MessageBody } from '../../types/webrtc';
import Message from './Message';

interface TextMessageComponent {
  MessageList: Array<MessageBody>
}

const TextMessageList: React.FC<TextMessageComponent> = (prop) => {

  const [message, setMessage] = useState("")
  const { MessageList } = prop

  const sendMessage = function () {
    emiter.emit("wsMessageText", message)
    setMessage("")
  }
  return (<>
    <div className='message-list-header flex-between'>
      <h3>讨论区</h3>
      <svg className="icon" aria-hidden="true" >
        <use xlinkHref="#icon-xiaoxi2"></use>
      </svg>
    </div>
    <div className='message-body'>
       {
        MessageList.map((item:MessageBody)=>{
              return(
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
        onPressEnter={() => sendMessage()}
        prefix={
          <svg className="icon upload-img-icon" aria-hidden="true"  >
            <use xlinkHref="#icon-pic-s"></use>
          </svg>
        }

        suffix={
          <svg className="icon send-icon" aria-hidden="true" onClick={() => sendMessage()} >
            <use xlinkHref="#icon-fasong"></use>
          </svg>} />


    </div>
  </>)
};

export default TextMessageList;