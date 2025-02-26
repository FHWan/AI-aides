//引入express
const express = require('express')
const expressWs = require('express-ws')(express())
const app = expressWs.app
//创建监听端口
const port = 4600
const { Ollama } = require('@langchain/community/llms/ollama')
const model = new Ollama({
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-r1:8b'
})
//提供一个deepseek接口
app.ws('/question', (ws, req) => {
    ws.on('message', async (msg) => {
      try {
        const stream = await model.stream(msg.toString()); // 确保输入是字符串
    for await (const chunk of stream) {
      // 添加类型检查
      if (typeof chunk === 'object') {
        ws.send(JSON.stringify({ 
          data: chunk.content || '', // 确保使用正确的响应字段
          isEnd: false 
        }));
      } else {
        ws.send(JSON.stringify({ 
          data: String(chunk), // 强制转换为字符串
          isEnd: false 
        }));
      }
    }

    // 添加结束标记
    ws.send(JSON.stringify({ 
      data: '', 
      isEnd: true,
      fullResponse: this.aiResponse // 如果需要可以返回完整响应
    }));

  } catch (error) {
    console.error('处理请求时出错:', error);
    ws.send(JSON.stringify({ 
      error: 'AI服务暂时不可用',
      isEnd: true 
    }));
  }
});

});
//启动服务
app.listen(port, () => {
    console.log('后端服务已经启动')
})