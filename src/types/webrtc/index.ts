export enum SignalingMessageType {
    Offer = "offer",
    Answer = "answer",
    Candidate = "candidate",
    HangUP = "hangup",
    Create = "create",
    Join = "join",
    Leave = "leave",
    TextMessage = "textMessage",
    OfferRenegotiation = "offerRenegotiation"
}

// 定义消息类型
export type SignalingMessage = {
    type: SignalingMessageType;
    data: any; // 可根据具体情况定义消息数据类型
    from: string,
    to: string
};

export type MessageBody = {
    from: string;
    data: string;
    to: string;
    type:string
}