import React, { useRef } from "react"
import { useState, useEffect } from "react"
import RtcPeer from "../../utils/RtcPeer"
import { Button, Input, message } from "antd"
import "./index.css"

import { Constraints, IceConfiguration } from "../../common/constants"
import { SignalingMessage, SignalingMessageType } from "../../utils/interface"
import { emiter } from "../../common/constants"

var ws: WebSocket
let rtcPeerInstance: RtcPeer | undefined
let phone: string, remotePhone: string

function Chat() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const otherVideoRef = useRef<HTMLVideoElement>(null)
    // 设置定时器，每隔一段时间发送心跳包
    const heartbeatInterval = 3000; // 30秒
    var heartbeatTimer


    // 发送心跳包
    function sendHeartbeat() {
        ws.send(JSON.stringify({ type: "HEART_BEAT", From: phone }));
    }

    const initRtc = async function (remote: boolean) {
        console.log("init----->")
        rtcPeerInstance = new RtcPeer(IceConfiguration, remote)
        let stream = await navigator.mediaDevices.getUserMedia(Constraints)
        const video = videoRef.current
        if (video) video.srcObject = stream;
        // 视频截图
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
    const handleAnswerMsg = function (res: { data: string }) {
        console.log("收到answer", res)
        if (rtcPeerInstance) rtcPeerInstance.setRemoteAnswer(JSON.parse(res.data) as RTCSessionDescriptionInit)
    }

    /**
     * 处理offer信息
     * @param res 
     */
    const handleOfferMsg = async function (res: { from: string; data: string; to: any }) {
        console.log("收到offer", res)
        if (!rtcPeerInstance) {
            await initRtc(true)
        }
        remotePhone = res.from
        //@ts-ignore
        let answer = await rtcPeerInstance.getAnswer(JSON.parse(res.data))
        console.log(answer)
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
    const handleIceCnadidateMsg = async function (res: { data: string }) {
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
            }

        });

        ws.addEventListener('close', function close() {
            ws.close()
            clearInterval(heartbeatInterval)
            console.log('Disconnected from the WebSocket server');
        });

    }

    const sendMes = function (data: any) {
        if (ws) ws.send(JSON.stringify(data));
    }
    /**
     * 呼叫
     */
    const call = async function () {
        await initRtc(false)

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


    useEffect(() => {
        emiter.addListener("wsSendMes", (data: any) => {
            sendMes(data)
        })
        emiter.addListener("wsSendCandidate", (data: any) => {
            console.log("我发出的Candidate,", {
                from: phone,
                type: SignalingMessageType.Candidate,
                to: remotePhone,
                data: JSON.stringify(data.data)
            })
            sendMes({
                from: phone,
                type: SignalingMessageType.Candidate,
                to: remotePhone,
                data: JSON.stringify(data.data)
            })
        })
        emiter.addListener("wsSendOffer", (data: any) => {
            console.log(phone, remotePhone)
            sendMes({
                from: phone,
                type: SignalingMessageType.Offer,
                to: remotePhone,
                data: JSON.stringify(data.data)
            })
        })

        return () => {
            emiter.removeListener("wsSendMes", (data: any) => {
                sendMes(data)
            });
            emiter.removeListener("wsSendCandidate", (data: any) => {
                sendMes({
                    from: phone,
                    type: SignalingMessageType.Candidate,
                    to: remotePhone,
                    data: JSON.stringify(data.data)
                })
            })
            emiter.removeListener("wsSendOffer", (data: any) => {
                sendMes({
                    from: phone,
                    type: SignalingMessageType.Offer,
                    to: remotePhone,
                    data: JSON.stringify(data.data)
                })
            })
        };
    }, [])
    return (
        <>
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
                <div className="calling-tools">

                    <svg className="icon hang-up" aria-hidden="true" onClick={() => { handleHangUp() }}>
                        <use xlinkHref="#icon-guaduan"></use>
                    </svg>
                    <svg className="icon" aria-hidden="true" onClick={() => { capture() }}>
                        <use xlinkHref="#icon-weibiaoti-1-12"></use>
                    </svg>
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
            <canvas ref={canvasRef}>

            </canvas>
        </>

    )
}
export default Chat