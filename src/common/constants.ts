import EventEmitter from "events"
export const IceConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, // STUN 服务器
      {
        urls: 'turn:118.89.199.105:3478',
        username: 'wuyz',
        credential: '12345678'
      }
    ]
  };




export const Constraints = {
  audio: true,            // We want an audio track
  video: true
}




 export const emiter = new EventEmitter()