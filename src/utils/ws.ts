import { emiter, IceConfiguration } from "../common/constants";
import { SignalingMessage,SignalingMessageType } from "../types/webrtc";
import RtcPeer from "./RtcPeer";

class WebSocketClient {
    private ws: WebSocket | null;
    private heartbeatTimer: NodeJS.Timer | null;
    private heartbeatInterval: number;
    private rtcPeerInstance: RtcPeer | undefined;

    constructor(private url: string, private phone: string) {
        this.ws = null;
        this.heartbeatTimer = null;
        this.heartbeatInterval = 3000; // 30 seconds
        this.rtcPeerInstance = undefined;
    }

    private sendHeartbeat() {
        this.ws?.send(JSON.stringify({ type: "HEART_BEAT", From: this.phone }));
    }

    private handleAnswerMsg(res: { data: string }) {
        console.log("收到answer", res);
        if (this.rtcPeerInstance) {
            this.rtcPeerInstance.setRemoteAnswer(JSON.parse(res.data) as RTCSessionDescriptionInit);
        }
    }

    private async handleOfferMsg(res: { from: string; data: string; to: any }) {
        console.log("收到offer", res);
        if (!this.rtcPeerInstance) {
            this.rtcPeerInstance = new RtcPeer(IceConfiguration, true);
        }
        const answer = await this.rtcPeerInstance.getAnswer(JSON.parse(res.data));
        const resData: SignalingMessage = {
            to: res.from || "",
            from: res.to || "",
            type: SignalingMessageType.Answer,
            data: JSON.stringify(answer)
        };
        this.sendMes(resData);
    }

    private async handleIceCandidateMsg(res: { data: string }) {
        console.log("收到candidate", res);
        if (this.rtcPeerInstance) {
            this.rtcPeerInstance.addOtherCandidate(JSON.parse(res.data));
        }
    }

    private handleHangUp() {
        if (this.rtcPeerInstance) {
            this.rtcPeerInstance.close();
            this.rtcPeerInstance = undefined;
        }
        // 关闭本地音视频
        // 代码待补充...
        // this.sendMes({ type: SignalingMessageType.HangUP, to: remotePhone, from: phone, data: "" });
        this.sendMes({})
    }

    private initWs() {
        this.ws = new WebSocket(`${this.url}?userNumber=${this.phone}`, [this.phone || ""]);
        this.ws.addEventListener('open', () => {
            console.log('Connected to the WebSocket server');
            // 在连接建立后，可以发送数据
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
        });

        this.ws.addEventListener('message', async (data) => {
            const res = JSON.parse(data.data);
            switch (res.type) {
                case SignalingMessageType.Answer:
                    this.handleAnswerMsg(res);
                    break;
                case SignalingMessageType.Offer:
                    await this.handleOfferMsg(res);
                    break;
                case SignalingMessageType.Candidate:
                    await this.handleIceCandidateMsg(res);
                    break;
                case SignalingMessageType.HangUP:
                    this.handleHangUp();
                    break;
            }
        });

        this.ws.addEventListener('close', () => {
            clearInterval(this.heartbeatInterval);
            console.log('Disconnected from the WebSocket server');
        });
    }

    public sendMes(data: any) {
        this.ws?.send(JSON.stringify(data));

    }

    public close() {
        this.ws?.close();
        this.ws = null;

    }
}

export default WebSocketClient;
