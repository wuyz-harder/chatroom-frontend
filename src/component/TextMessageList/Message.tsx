import React from "react"
import { MessageBody } from "../../types/webrtc"



const Message:React.FC<{message:MessageBody}> = (prop)=>{
    const {message} = prop
        return(
            <div>{message.from}:{message.data}</div>
        )
}
export default Message