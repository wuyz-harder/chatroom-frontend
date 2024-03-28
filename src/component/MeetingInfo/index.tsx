import React from "react";

import "./index.css"

const MeetingInfo: React.FC = () => {
    function getDayOfWeek() {
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const date = new Date();
        const dayIndex = date.getDay();
        return days[dayIndex];
    }
    

    return (
        <>
            <div className="meeting-info">
                <p className="meeting-time">{new Date().toLocaleDateString()},{getDayOfWeek()}</p>
                <h2>Weekend Meeting</h2>
            </div>
        </>
    )
}
export default MeetingInfo