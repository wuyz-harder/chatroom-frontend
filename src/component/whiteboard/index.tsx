import React, { useEffect, useRef, useState } from 'react';
import "./index.css"

const Whiteboard: React.FC<{ DataChannel: any, imageData: any }> = function (prop) {
    const { DataChannel, imageData } = prop
    const canvasRef = useRef<HTMLCanvasElement | null>(null); // 指定 canvasRef 的类型为 HTMLCanvasElement | null
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        // @ts-ignore
        const image = new Image();
        image.src = imageData;
        image.onload = () => {
            // @ts-ignore
            canvasRef.current?.drawImage(image, 0, 0); // 在 Canvas 上绘制图像
        };

    }, [imageData])

    const startDrawing = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const { offsetX, offsetY } = event.nativeEvent;
        context?.beginPath(); // 使用可选链运算符
        context?.moveTo(offsetX, offsetY); // 使用可选链运算符
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const { offsetX, offsetY } = event.nativeEvent;
        context?.lineTo(offsetX, offsetY); // 使用可选链运算符
        context?.stroke(); // 使用可选链运算符
        const imageData = canvas.toDataURL(); // 将 Canvas 数据转换为图像数据
        DataChannel.send("11111"); // 发送图像数据给对方
        // @ts-ignore
        // DataChannel.send(imageData); // 发送图像数据给对方
    };

    const endDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height); // 使用可选链运算符
    };

    return (
        <div className='white-board-box'>
            <canvas
                id='white-board-canvas'
                ref={canvasRef}
                width={800}
                height={600}
                className='white-board'
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
            />
            <button onClick={clearCanvas}>Clear</button>
        </div>
    );
}

export default Whiteboard;
