import React, { useState } from 'react';
import { Alert, Button, Space } from 'antd';

import "./index.css"
import { emiter } from '../../common/constants';
import { SignalingMessageType } from '../../types/webrtc';

const CallTip: React.FC<{ number: string, display: boolean }> = (prop) => {
    const { number, display } = prop
    return (
        <div className={display ? 'call-tip' : "call-tip disappear"} >
            <Alert
                description={`${number} 请求与你通话`}
                type="success"
                style={{ textAlign: "center" }}
                action={
                    <Space direction="horizontal" style={{ marginLeft: "10px" }}>
                        <svg className="icon call-tip-icon" aria-hidden="true" onClick={()=>{emiter.emit("aboutMessage",{type:SignalingMessageType.Accept})}}>
                            <use xlinkHref="#icon-hujiao"></use>
                        </svg>
                        <svg className="icon call-tip-icon" aria-hidden="true" onClick={()=>{emiter.emit("aboutMessage",{type:SignalingMessageType.Reject})}}>
                            <use xlinkHref="#icon-guaduan"></use>
                        </svg>
                    </Space>
                }
                closable
            />

        </div>)

};

export default React.memo(CallTip);