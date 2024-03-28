export interface Message{
    avaUrl:string
    userName:string
    data:string
    type:MessageType
}

export enum MessageType{
    text = "text",
    Image = "image"
}