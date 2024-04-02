import React from 'react';

import './App.css';
import Chat from './pages/chat1v1/chat';
import { Alert, Button, Space } from 'antd';
import CallTip from './component/callTips';
import Whiteboard from './component/whiteboard';

function App() {
  return (
    <div className="App">
      <Chat></Chat>
      
    </div>
  );
}

export default App;
