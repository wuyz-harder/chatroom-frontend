
// 滚动到底部的函数
export function scrollToBottom(id: string) {
    const chatBox = document.getElementById(id);
    if (chatBox) setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
    }, 0)

}

