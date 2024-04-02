import React, { useCallback, useRef } from "react"
import { useState, useEffect } from "react"
import RtcPeer from "../../utils/RtcPeer"
import { Button, Input, Slider, message } from "antd"
import "./index.css"

import { Constraints, IceConfiguration } from "../../common/constants"
import { MessageBody, SignalingMessage, SignalingMessageType } from "../../types/webrtc"
import { emiter } from "../../common/constants"
import TextMessageList from "../../component/TextMessageList"
import MeetingInfo from "../../component/MeetingInfo"
import CallTip from "../../component/callTips"
import { scrollToBottom } from "../../utils/Function"
import Whiteboard from "../../component/whiteboard"

let ws: WebSocket
let rtcPeerInstance: RtcPeer | undefined
let phone: string, remotePhone: string
let nowCallingNumber: any
let mediaRecorder: MediaRecorder;
let recordedChunks: BlobPart[] | undefined = [];



function Chat() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const otherVideoRef = useRef<HTMLVideoElement>(null)
    const [messageDataList, setMessageDataList] = useState<Array<MessageBody>>([])
    const [callingNumber, setCallingNumber] = useState("")
    const [display, setDisplay] = useState(false)
    const [volumeDisplay, setVolumeDisplay] = useState(false)
    const [volumeValue, setVolumeValue] = useState(0)
    const [recording, setRecording] = useState(false)
    
    let calling: boolean = false
    // 设置定时器，每隔一段时间发送心跳包
    const heartbeatInterval = 3000; // 30秒
    var heartbeatTimer

    // 发送心跳包
    function sendHeartbeat() {
        if (ws) ws.send(JSON.stringify({ type: "HEART_BEAT", From: phone }));
    }

    const initRtc = async function (remote: boolean) {
        console.log("init----->")
        rtcPeerInstance = new RtcPeer(IceConfiguration, remote)
       

        let stream = await navigator.mediaDevices.getUserMedia(Constraints)
        const video = videoRef.current
        if (video) video.srcObject = stream;
        if (otherVideoRef.current) {
            try {
                stream.getTracks().forEach(track => {
                    // @ts-ignore
                    rtcPeerInstance.rtcPeerConnect.addTrack(track, stream);
                });
            } catch (err) {
                console.log("init media err:", err);
            }
        }

    }

    /**
     * 处理answer的结果
     * @param res 
     */
    const handleAnswerMsg = function (res: MessageBody) {
        console.log("收到answer", res)
        if (rtcPeerInstance) rtcPeerInstance.setRemoteAnswer(JSON.parse(res.data) as RTCSessionDescriptionInit)
    }

    /**
     * 处理offer信息
     * @param res 
     */
    const handleOfferMsg = async function (res: MessageBody) {
        if (!rtcPeerInstance) {
            await initRtc(true)
        }
        remotePhone = res.from
        let answer = await rtcPeerInstance?.getAnswer(JSON.parse(res.data))

        let resData: SignalingMessage = {
            to: res.from || "",
            from: res.to || "",
            type: SignalingMessageType.Answer,
            data: JSON.stringify(answer)
        }
        sendMes(resData)
    }

    /**
     * 处理candidate
     * @param res 
     */
    const handleIceCnadidateMsg = async function (res: MessageBody) {
        console.log("收到candidate", res)
        //@ts-ignore
        rtcPeerInstance && rtcPeerInstance.addOtherCandidate(JSON.parse(res.data))
    }

    /**
     * 处理hangup
     * @param res 
     */
    const handleHangUp = async function () {
        rtcPeerInstance && rtcPeerInstance.close()
        //关了本地音视频
        if (videoRef?.current?.srcObject) {
            videoRef?.current?.pause();
            // @ts-ignore
            videoRef?.current?.srcObject?.getTracks().forEach(track => {
                track.stop();
            });
        }
        rtcPeerInstance = undefined
        sendMes({ type: SignalingMessageType.HangUP, to: remotePhone, from: phone, data: "" })
    }

    /**
     * 处理聊天文字信息
     */
    const handleTextMessage = async function (res: MessageBody) {
        message.success(res.data)
        res.other = res.from == phone ? false : true
        setMessageDataList(messageDataList => [...messageDataList, res]);
        scrollToBottom("message-list-body")
    }
    /**
     * 
     * @param res 发送拒绝通话
     */
    const sendReject = function () {
        setDisplay(false)
        sendMes({
            from: phone,
            to: nowCallingNumber,
            type: SignalingMessageType.Reject
        })
    }
    /**
    * 
    * @param res 发送 --》 接受通话
    */
    const sendAccept = function () {
        setDisplay(false)
        calling = true
        sendMes({
            from: phone,
            to: nowCallingNumber,
            type: SignalingMessageType.Accept
        })
    }
    /**
     * 处理电话邀约
     * @param res 
     */
    const handleCallRequest = async function (res: MessageBody) {
        nowCallingNumber = res.from
        // 如果通话中的话就拒绝
        if (calling) {
            sendReject()
            return
        }
        console.log("有人邀约", res)
        setCallingNumber(res.from)
        setDisplay(true)
    }

    /**
     * 处理电话通过邀约，肯定是邀请方，本地方
     * @param res 
     */
    const handleAcceptRequest = async function (res: MessageBody) {
        // 如果通话中的话就拒绝
        await initRtc(false)
        calling = true
    }

    /**
     * 处理拒绝
     * @param res 
     */
    const handleReject = async function () {
        // 如果通话中的话就拒绝
        calling = false
        message.error("对方拒绝了你的通话申请")
    }

    /**
     * 初始化ws链接
     */
    const initWs = async function () {
        ws = new WebSocket(`ws://118.89.199.105:8080/v1/api/chat?userNumber=${phone}`, [phone || ""]);
        ws.addEventListener('open', async function open() {
            console.log('Connected to the WebSocket server');
            message.success("login success")
            // 在连接建立后，可以发送数据
            heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval);
        });

        ws.addEventListener('message', async function incoming(data) {
            let res = JSON.parse(data.data)
            switch (res.type) {
                // 获取到远方的answer
                case SignalingMessageType.Answer:
                    handleAnswerMsg(res)
                    break
                // 获取到远方的offer，需要做1、设置本地的sdp,getOffer然后把他送出去
                case SignalingMessageType.Offer:
                    // 假如是被动一方
                    await handleOfferMsg(res)
                    break
                case SignalingMessageType.Candidate:
                    await handleIceCnadidateMsg(res)
                    break
                case SignalingMessageType.HangUP:
                    handleHangUp()
                    break
                case SignalingMessageType.TextMessage:
                    handleTextMessage(res)
                    break
                case SignalingMessageType.Call:
                    handleCallRequest(res)
                    break
                case SignalingMessageType.Accept:
                    handleAcceptRequest(res)
                    break
                case SignalingMessageType.Reject:
                    handleReject()
                    break
                case SignalingMessageType.Error:
                    message.error(res.msg)
                    break
            }

        });

        ws.addEventListener('close', function close() {
            ws.close()
            clearInterval(heartbeatInterval)
            message.error('Disconnected from the WebSocket server');
        });

    }
    /**
     * 
     * @param data 发送消息
     * @returns 
     */
    const sendMes = function (data: any) {
        if (!ws) {
            message.error("请登录后再发言!")
            return
        }
        ws.send(JSON.stringify(data));
    }
    /**
     * 呼叫
     */
    const call = async function () {
        if (!phone || !remotePhone) {
            message.error("请先输入您或者对方号码")
            return
        }
        sendMes({
            type: SignalingMessageType.Call,
            from: phone,
            to: remotePhone
        })
        // await initRtc(false)
    }
    /**
     * 截图
     */
    const capture = function () {
        // 等待视频加载
        // 创建Canvas元素
       
        const ctx = canvasRef?.current?.getContext('2d');

        if (canvasRef.current) {
            canvasRef.current.width = videoRef.current?.width || 360;
            canvasRef.current.height = videoRef.current?.height || 180;

        }
        // 在Canvas上绘制视频帧
        const drawFrame = () => {
            // @ts-ignore
            ctx.drawImage(videoRef.current, 0, 0, canvasRef?.current?.width, canvasRef?.current?.height);
            // 将Canvas内容转换为图片并提供下载链接
            const saveScreenshot = () => {
                const link = document.createElement('a');
                link.download = 'screenshot.png'; // 设置下载文件名
                link.href = canvasRef.current?.toDataURL('image/png') || ''; // 将Canvas内容转换为PNG图片的Data URL
                link.click(); // 模拟点击链接进行下载
            };
            // 调用保存截图函数
            saveScreenshot()

        };

        // 每隔一定时间绘制一次视频帧到Canvas上
        drawFrame()

    }

    /**
     * 发送消息
     */
    const wsMessageText = useCallback((data: string) => {
        sendMes({
            from: phone,
            to: remotePhone,
            type: SignalingMessageType.TextMessage,
            data: data
        })
    }, [])

    /**
     * 统一处理
     * @param data 触发的事件
     */
    const resolveEmitEvent = function (data: { type: string, data: any }) {
        switch (data.type) {
            case "wsSendCandidate":
                sendMes({
                    from: phone,
                    type: SignalingMessageType.Candidate,
                    to: remotePhone,
                    data: JSON.stringify(data.data)
                })
                break
            case "wsSendOffer":
                sendMes({
                    from: phone,
                    type: SignalingMessageType.Offer,
                    to: remotePhone,
                    data: JSON.stringify(data.data)
                })
                break
            case "accept":
                sendAccept()
                break
            case "reject":
                sendReject()
                break
        }

    }

    const openAdjustVol = function () {
        setVolumeDisplay(!volumeDisplay)
        if (videoRef.current && videoRef.current.volume) {
            setVolumeValue(Math.floor(videoRef.current.volume * 100))
        } else {
            message.info("打通电话后可设置")
        }
    }

    /**
     * 调节音量
     * @param value 
     */
    const adjustVol = function (value: number) {
        //@ts-ignore
        if (videoRef.current) {

            videoRef.current.volume = value / 100
        }
        setVolumeDisplay(false)
    }
    /**
     * 录制视频
     */
    const record = function () {
        if (recording) {
            // 保存视频
            mediaRecorder.stop();
        } else {
            // 开始录制
            let stream = videoRef.current?.srcObject
            mediaRecorder = new MediaRecorder(stream as any);

            // 当有新的数据可用时触发
            mediaRecorder.ondataavailable = event => {
                recordedChunks?.push(event.data);
            };

            // 当录制完成时触发
            mediaRecorder.onstop = () => {
                // 创建一个 Blob 对象并生成一个 URL
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                let downloadLink = document.createElement("a")
                // 设置下载链接并显示
                downloadLink.href = url;
                downloadLink.download = 'recording.webm';
                downloadLink.style.display = 'block';
                downloadLink.click()
                // 重置录制数据
                recordedChunks = [];
            };

            // 开始录制
            mediaRecorder.start();
        }
        setRecording(!recording)
    }

    useEffect(() => {
        emiter.addListener("aboutMessage", (data: { type: string, data: any }) => {
            resolveEmitEvent(data)
        })
        return () => {
            emiter.removeListener("aboutMessage", (data: { type: string, data: any }) => {
                resolveEmitEvent(data)
            })
        };
    }, [])
    return (
        <>
            <CallTip number={callingNumber} display={display}></CallTip>
            <div className="chat-view">
                <div className="video-space">
                    <MeetingInfo></MeetingInfo>
                    <div className="chat-box">
                        <video
                            ref={videoRef}
                            autoPlay={true}
                            id="localuser"
                            className="local-user"
                            playsInline>
                        </video>
                        <video
                            ref={otherVideoRef}
                            autoPlay={true}
                            id="removeuser"
                            className="remote-user"
                            playsInline>
                        </video>

                    </div>
                    <div className="calling-tools">
                        <div className="calling-setting">
                            <span className="icon-span" title="调节音量" onClick={() => openAdjustVol()}>
                                <Slider
                                    vertical
                                    defaultValue={volumeValue}
                                    className={volumeDisplay ? "adjust-voice" : "adjust-voice disappear"}
                                    onChangeComplete={value => adjustVol(value)} />
                                <svg className="icon" aria-hidden="true" >
                                    <use xlinkHref="#icon-xiaolaba"></use>
                                </svg>
                            </span>
                            <span className="icon-span" title="录制视频" onClick={() => { record() }}>
                                <svg className="icon" aria-hidden="true" >
                                    {
                                        recording ? <use xlinkHref="#icon-luzhizhong" className="recording"></use> : <use xlinkHref="#icon-record-circle-fill"></use>
                                    }

                                </svg>
                            </span>
                        </div>
                        <div className="split"></div>
                        <div className="calling-action">
                            <svg className="icon hang-up" aria-hidden="true" onClick={() => { handleHangUp() }}>
                                <use xlinkHref="#icon-guaduan4"></use>
                            </svg>


                            <svg className="icon" aria-hidden="true" onClick={() => { capture() }}>
                                <use xlinkHref="#icon-weibiaoti-1-12"></use>
                            </svg>

                        </div>
                        <div className="split"></div>
                        <div className="calling-setting">
                            <span className="icon-span" title="白板">
                                <svg className="icon " aria-hidden="true" >
                                    <use xlinkHref="#icon-baiban"></use>
                                </svg>
                            </span>
                            <span className="icon-span" title="共享屏幕">
                                <svg className="icon " aria-hidden="true" >
                                    <use xlinkHref="#icon-gongxiangpingmu1"></use>
                                </svg>
                            </span>
                        </div>

                    </div>
                    <div className="tools">
                        <div className="number">
                            <Input className="number-input" placeholder="请输入你的电话号码" onChange={(event => phone = event.target.value)}></Input>
                            <Button onClick={() => initWs()}>登录</Button>
                        </div>
                        <div className="number">
                            <Input className="number-input" placeholder="请输入你想打的电话" onChange={(event => remotePhone = event.target.value)}></Input>
                            <Button onClick={() => call()}>
                                呼叫
                            </Button>

                        </div>


                    </div>

                </div>
                <div className="message-space">
                    <TextMessageList MessageList={messageDataList} wsMessageText={wsMessageText}></TextMessageList>

                </div>
            </div>
            <canvas ref={canvasRef}></canvas>
            {/* <Whiteboard DataChannel={dataChannel} imageData={wbImageData}></Whiteboard> */}
        </>
    )
}
export default Chat