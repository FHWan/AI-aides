<script>
// 引入必要的库
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
window.PIXI = PIXI; // 为了pixi-live2d-display内部调用
let app; // 用于存储pixi实例
//let model; // 用于存储live2d实例

export default {
  data() {
    return {
      userQuestion: '',
      aiResponse: '',
      ws: null,
      audioUrl: '',
      fullResponse: '', // 新增：用于累积完整响应
      model: null, // 将model移到data中以便Vue响应式管理
    };
  },

  async mounted() {
    app = new PIXI.Application({
      view: this.$refs.liveCanvas, // ref组件绑定，liveCanvas为下文自定义的
      autoStart: true,             // 是否开启自动播放
      resizeTo: window,
      backgroundAlpha: 0,         // 透明度
    });

    // 将model实例保存到组件data中
    this.model = await Live2DModel.from('character/U.model3.json',{
      // 展示工具箱（可以控制 live2d 的展出隐藏，使用特定表情）
      ShowToolBox: false,

    // 是否使用 indexDB 进行缓存优化，这样下一次载入就不会再发起网络请求了
      LoadFromCache: true,
      autoInteract: false, // 关闭眼睛自动跟随功能
    });
    this.model.x = 500;
    this.model.y = 100;
    this.model.scale.set(1);
    app.stage.addChild(this.model);
    this.model.expression('桌');
  },

  methods: {
    // 新增表情切换方法
    changeExpression(text) {
      if (this.model) {
        this.model.expression(text);
      }
    },

    change_test() {
      setInterval(() => {
        let n = Math.random();
        console.log("随机数0~1控制嘴巴Y轴高度-->", n);
        this.model.internalModel.coreModel.setParameterValueById("ParamMouthOpenY", n);
      }, 100);
    },

    async sendQuestion(e) {
      e.preventDefault();
      if (!this.userQuestion.trim()) return;

      // 清空之前的回复
      this.aiResponse = ''; // 清空响应内容

      // 确保连接可用
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        await this.initWebSocket();
      }

      // 确保连接已建立
      if (this.ws.readyState === WebSocket.CONNECTING) {
        await new Promise((resolve) => {
          this.ws.addEventListener('open', resolve);
        });
      }

      // 发送消息
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(this.userQuestion);
        this.userQuestion = '';
      } else {
        console.error('WebSocket连接异常状态:', this.ws.readyState);
        this.aiResponse = "连接异常，请刷新页面重试";
      }
    },

    initWebSocket() {
      return new Promise((resolve) => {
        if (this.ws) {
          this.ws.close(); // 关闭旧连接
        }

        this.ws = new WebSocket('ws://localhost:4600/question');
        
         // 修改后的消息监听
         this.ws.addEventListener('message', (event) => {
          const response = JSON.parse(event.data);
          
          // 处理错误情况
          if (response.error) {
            this.aiResponse = response.error;
            return;
          }
          
          // 如果是第一次收到回复，切换为“敲键盘”表情
          if (this.aiResponse === '') {
            this.model.expression('敲键盘');  // 开始回复时切换表情
          }

          // 累积响应内容
          if (response.data) {
            this.aiResponse += response.data;
            this.fullResponse += response.data; // 累积完整响应
          }

          // 自动滚动
          this.$nextTick(() => {
            const textarea = this.$el.querySelector('.response-textarea');
            textarea.scrollTop = textarea.scrollHeight;
          });

          // 新增：仅在收到结束标记时触发语音合成
          if (response.isEnd) {
            const cleanText = this.fullResponse
              .replace(/<think>[\s\S]*?<\/think>/g, '')
              .replace(/[A-Za-z*]/g, '')
              .trim();

            if (cleanText) {
              this.convertTextToSpeech(cleanText);
            }
            
            this.fullResponse = ''; // 清空累积内容
            // 回复完全结束，切换为“桌”表情
            this.model.expression('桌');
          }
        });
        
        this.ws.addEventListener('open', () => {
          console.log('WebSocket连接已建立');
          resolve();
        });

        // 错误处理增强
        this.ws.addEventListener('error', (error) => {
          console.error('WebSocket错误:', error);
          this.aiResponse = "连接出现错误，请检查控制台";
        });

        // 关闭处理
        this.ws.addEventListener('close', () => {
          console.log('WebSocket连接已关闭');
          this.ws = null; // 重要！重置连接实例
        });
      });
    },
    
    // 修改后的语音合成方法
    async convertTextToSpeech(text) {
      try {
        const response = await fetch(
          `http://localhost:4500/generate-tts?text=${encodeURIComponent(text)}`
        );
        const data = await response.json();
        
        if (data.audioUrl) {
          this.playAudio(data.audioUrl);
        } else {
          console.error('音频生成失败:', data.error);
        }
      } catch (error) {
        console.error('语音转换错误:', error);
        this.aiResponse += '\n[语音转换失败]';
      }
    },

    playAudio(audioUrl) {
      // 创建音频上下文
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 获取音频数据
      fetch(audioUrl)
        .then(response => response.arrayBuffer())
        .then(audioData => audioContext.decodeAudioData(audioData))
        .then(audioBuffer => {
          // 创建音频节点
          const source = audioContext.createBufferSource();
          const analyser = audioContext.createAnalyser();
          
          // 配置分析器
          analyser.fftSize = 256;
          source.buffer = audioBuffer;
          
          // 连接音频节点
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          
          // 初始化动画参数
          let requestId = null;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          // 启动音频播放
          source.start(0);

          // 创建动画循环
          const updateMouth = () => {
            analyser.getByteFrequencyData(dataArray);
            
            // 计算平均音量
            const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const mouthOpen = Math.min(1, volume / 180); // 调整除数可改变灵敏度
            
            // 更新模型参数
            this.model.internalModel.coreModel.setParameterValueById(
              "ParamMouthOpenY",
              mouthOpen
            );
            
            requestId = requestAnimationFrame(updateMouth);
          };

          // 启动动画
          requestId = requestAnimationFrame(updateMouth);

          // 音频结束时清理
          source.onended = () => {
            cancelAnimationFrame(requestId);
            this.model.internalModel.coreModel.setParameterValueById(
              "ParamMouthOpenY",
              0
            );
            audioContext.close();
          };
        })
        .catch(error => {
          console.error('音频处理错误:', error);
          this.model.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            0
          );
        });
    }
  }
}
</script>

<template>
  <div class="app">
    <!-- 自定义ref="liveCanvas"： -->
    <canvas ref="liveCanvas"></canvas>

    <!-- 用户输入框 -->
    <textarea
      v-model="userQuestion"
      class="transparent-textarea"
      placeholder="输入你的问题..."
      @keydown.enter="sendQuestion"
    ></textarea>
    
    <!-- AI响应展示 -->
    <textarea
      :value="aiResponse"
      class="response-textarea"
      placeholder="AI的回复..."
      readonly
    ></textarea>

    <!-- 新增表情切换按钮 -->
    <button 
      class="expression-btn_1"
      @click="changeExpression('1desk')"
      v-if="model" 
    >
      重置表情😀
    </button>

      <button 
      class="expression-btn_2"
      @click="changeExpression()"
      v-if="model" 
    >
      随机表情🤩
    </button>

    <button 
      class="expression-btn_3"
      @click="change_test()"
      v-if="model" 
    >
      测试按钮
    </button>
  </div>
</template>

<style scoped>
.app {
  background-image: url('/public/picture/behind02.jpg'); /* 设置背景图片 */
  background-size: cover; /* 确保图片覆盖整个容器 */
  background-position: center; /* 居中显示图片 */
  background-attachment: fixed; /* 背景固定 */
  height: 100vh; /* 高度设置为视口高度，确保背景覆盖整个页面 */
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative; /* 使得可以相对定位其他元素 */
}

.transparent-textarea {
  position: absolute;
  bottom: 7%; /* 设置距离页面底部的距离，使其在中间偏下 */
  left: 50%; /* 水平居中 */
  transform: translateX(-50%); /* 调整以确保输入框完全居中 */
  padding: 10px;
  font-size: 20px;
  background-color: rgba(255, 255, 255, 0.8); /* 背景透明度50% */
  border: 1px solid rgba(0, 0, 0, 0.3); /* 边框稍微透明 */
  border-radius: 5px; /* 圆角 */
  color: #333; /* 文本颜色 */
  width: 60%; /* 宽度可以根据需要调整 */
  min-height: 100px; /* 设置最小高度，使文本框足够高以容纳多行文本 */
  resize: none; /* 禁止用户调整文本框大小 */
  overflow: auto; /* 内容溢出时显示滚动条 */
  white-space: pre-wrap; /* 保证文本在遇到长单词或链接时自动换行 */
}

.response-textarea {
  position: absolute;
  right: 4%; /* 设置距离页面右侧的距离 */
  top: 20%; /* 设置距离页面顶部的距离 */
  padding: 10px;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.8); /* 背景透明度50% */
  border: 1px solid rgba(0, 0, 0, 0.3); /* 边框稍微透明 */
  border-radius: 5px; /* 圆角 */
  color: #333; /* 文本颜色 */
  width: 25%; /* 宽度可以根据需要调整 */
  min-height: 400px; /* 设置最小高度 */
  resize: none; /* 禁止用户调整文本框大小 */
  overflow: auto; /* 内容溢出时显示滚动条 */
  white-space: pre-wrap; /* 保证文本在遇到长单词或链接时自动换行 */
}

.expression-btn_1 {
  position: absolute;
  right: 18.1%;
  top: 63%;
  padding: 12px 24px;
  font-size: 20px;
  width: 12%;
  background-color: rgba(106, 240, 128, 0.9);
  border: none;
  border-radius: 25px;
  color: rgb(0, 0, 0);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.expression-btn_2 {
  position: absolute;
  right: 4%;
  top: 63%;
  padding: 12px 24px;
  font-size: 20px;
  width: 12%;
  background-color: rgba(106, 240, 128, 0.9);
  border: none;
  border-radius: 25px;
  color: rgb(0, 0, 0);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.expression-btn_3 {
  position: absolute;
  right: 12%;
  top: 70%;
  padding: 12px 24px;
  font-size: 20px;
  width: 10%;
  background-color: rgba(106, 179, 240, 0.9);
  border: none;
  border-radius: 25px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

</style>
