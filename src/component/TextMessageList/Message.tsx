import React from "react"
import { MessageBody } from "../../types/webrtc"
import { Avatar } from "antd"



const Message: React.FC<{ message: MessageBody }> = (prop) => {
    const { message } = prop
    return (
        <div className={message.other?"message-box":"message-box message-reverse"}>
            <Avatar size={"large"}>{message.from}</Avatar>
            <div className="message-detail">
                <p className={message.other?"username":"username username-text-align"}>{message.from}</p>
                <div className= {message.other?"other-message":"user-message"} >
                    {message.data}
                </div>
            </div>
        </div>
    )
}
export default React.memo(Message)