import { emiter } from "../common/constants"



export default class RtcPeer {

    rtcPeerConnect: RTCPeerConnection | undefined
    offer: RTCLocalSessionDescriptionInit | undefined
    answer: RTCSessionDescriptionInit | undefined
    removeRef: any
    hasSetRemote: boolean = false
    private cacheIceCandidates: RTCIceCandidateInit[] = [];
    // private myIceCandidates: RTCIceCandidateInit[] = [];

    constructor(
        iceState: RTCConfiguration | undefined,
        remote: boolean
    ) {
        try {
            this.rtcInit(iceState, remote)
        } catch (err) {
            console.log("rtc初始化失败~")
        }

    }

    async rtcInit(iceState: RTCConfiguration | undefined, remote: boolean) {
        this.rtcPeerConnect = new RTCPeerConnection(iceState)
        // 把流加到RTCPeerConnection里面对方才有可能收到

        this.rtcPeerConnect.addEventListener("track", event => {
            console.log("我收到",event)
            if (event.streams && event.streams.length > 0) {
                //@ts-ignore
                document.getElementById("removeuser").srcObject = event.streams[0];
                console.log(event)
                console.trace("stream received.");
            } else {
                console.log("No remote stream received.");
            }
        })
        this.rtcPeerConnect.addEventListener("iceconnectionstatechange", (event) => {
            this.handleICEConnectionStateChangeEvent(event)
        })
        this.rtcPeerConnect.addEventListener("icecandidateerror", err => {
            console.error("icecandidateerror", err)

        })
        this.rtcPeerConnect.addEventListener("negotiationneeded", () => {
            this.handleNegotiationNeededEvent(remote)
        })
        this.rtcPeerConnect.addEventListener("icecandidate", (event) => {
            if (event.candidate) {
                emiter.emit("wsSendCandidate", {
                    data: JSON.stringify(event.candidate)
                })

            }
        })


    }
    /**
     * 初始化的时候发送offer信息
     * @returns 
     */
    async handleNegotiationNeededEvent(remote: boolean) {
        console.log("*** Negotiation needed");
        if (this.rtcPeerConnect && !remote) {
            try {
                console.log("---> Creating offer");
                const offer = await this.rtcPeerConnect.createOffer();
                // If the connection hasn't yet achieved the "stable" state,
                // return to the caller. Another negotiationneeded event
                // will be fired when the state stabilizes.
                if (this.rtcPeerConnect.signalingState != "stable") {
                    console.log("     -- The connection isn't stable yet; postponing...")
                    return;
                }
                // Establish the offer as the local peer's current
                // description.

                console.log("---> Setting local description to the offer");
                await this.rtcPeerConnect.setLocalDescription(offer);

                // Send the offer to the remote peer.
                console.log("---> Sending the offer to the remote peer");
                emiter.emit("wsSendOffer", { data: JSON.stringify(this.rtcPeerConnect.localDescription) })

            } catch (err) {
                console.log("*** The following error occurred while handling the negotiationneeded event:");
                reportError(err);
            };
        }
    }
    /**
    * 设置远端的sdp并且创建本方的answer，收到呼叫后调用此方法
    * @param sdp 发起方的sdp
    * @returns 
    */
    async getAnswer(sdp: any) {
        sdp = JSON.parse(sdp)
        if (this.rtcPeerConnect) {
            console.log("设置远程sdp")
            await this.rtcPeerConnect.setRemoteDescription(sdp);
            // this.addCacheCancidate()
            this.answer = await this.rtcPeerConnect.createAnswer();
            await this.rtcPeerConnect.setLocalDescription(this.answer)
            return this.answer;
        } else {
            throw new Error("Invalid signaling state for creating answer");
        }
    }

    handleICEConnectionStateChangeEvent(event: any) {
        console.log("*** ICE connection state changed to " + this.rtcPeerConnect && this.rtcPeerConnect?.iceConnectionState);
        //@ts-ignore
        switch (this.rtcPeerConnect.iceConnectionState) {
            case "closed":
            case "failed":
            case "disconnected":

                break;
        }
    }


    /**
     * 被呼叫方的answer
     * @param answer 远端的answer
     */
    async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
        if (this.rtcPeerConnect) {
            await this.rtcPeerConnect.setRemoteDescription(answer)
        }

    }
    addStream(stream: MediaStream) {
        stream.getTracks().forEach(track => {
            if (this.rtcPeerConnect) this.rtcPeerConnect.addTrack(track)
        })
    }

    addCacheCancidate() {
        this.cacheIceCandidates.forEach(async candidate => {
            if (this.rtcPeerConnect)  this.rtcPeerConnect.addIceCandidate(candidate);
        })
    }


    async addOtherCandidate(candidate: any) {
        candidate = JSON.parse(candidate);
        if (this.rtcPeerConnect) {
           
            console.log("remotesdp", this.rtcPeerConnect.remoteDescription)
            // 如果已经设置了远程描述，则立即添加 ICE 候选人
            try{
                this.rtcPeerConnect.addIceCandidate(candidate);
            }catch(err){
                console.error("addIceError",err)
            }

        }
    }

    /**
     * 关闭
     */
    close() {
        if (this.rtcPeerConnect) {
            this.rtcPeerConnect.close()
            
        }
    }

}