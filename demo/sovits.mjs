import express from "express";
import { client } from "@gradio/client";
import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import cors from "cors"; // 新增 CORS 模块

// 初始化 Express 应用
const app = express();

// 新增 CORS 中间件配置
app.use(cors({
  origin: "http://localhost:8080", // 替换为你的前端地址
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// 配置中间件
app.use(express.json());
app.use(express.static("public")); // 暴露静态文件目录

// 核心 TTS 功能函数
async function generateAndSaveTTS(text) {
  try {
    const audioPath = "./public/radio/go.wav";
    const audioData = readFileSync(audioPath);
    const exampleAudio = new Blob([audioData], { type: "audio/wav" });

    // 连接到 Gradio 服务
    const gradioApp = await client("http://localhost:9872/");

    // TTS 参数配置
    const ttsParams = [
      exampleAudio,
      "反正是梦，我会一口气帮大家把所有敌人解决掉的！",
      "中文",
      text,
      "中英混合",
      "凑四句一切",
      5, 1, 1,    // top_k, top_p, temperature
      false,       // 无参考文本模式
      1,          // 语速
      false,        // 调整上次结果
      null,        // 多参考音频
      16           // 采样步数
    ];

    // 生成音频
    const result = await gradioApp.predict("/get_tts_wav", ttsParams);
    
    // 处理音频结果
    const audioUrl = result.data[0]?.url;
    if (!audioUrl) throw new Error("未获取到有效音频 URL");

    // 下载并保存音频
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const outputPath = `./public/radio/tts_output_${Date.now()}.wav`; // 添加时间戳避免冲突
    writeFileSync(outputPath, response.data);

    return outputPath.replace("./public", ""); // 返回 web 可访问路径

  } catch (error) {
    console.error('TTS 处理失败:', error);
    throw error; // 向上传递错误
  }
}

// API 端点
app.get('/generate-tts', async (req, res) => {
  try {
    const text = req.query.text?.trim() || "默认文本";
    
    // 验证输入
    //if (text.length > 500) {
     // return res.status(400).json({ error: "文本长度超过限制(500字符)" });
    //}

    const savedAudioPath = await generateAndSaveTTS(text);
    res.json({ 
      message: "音频生成成功",
      audioUrl: savedAudioPath,
      text: text 
    });

  } catch (error) {
    console.error('接口错误:', error);
    res.status(500).json({ 
      error: "音频生成失败",
      details: error.message 
    });
  }
});

// 启动服务时仅执行一次模型配置
app.listen(4500, async () => {
  try {
    // 连接到 Gradio 服务
    const gradioApp = await client("http://localhost:9872/");

    // 模型切换配置，只在启动时执行一次
    await Promise.all([
      gradioApp.predict("/change_gpt_weights", ["GPT_weights_v2/yulika-e15.ckpt"]),
      gradioApp.predict("/change_sovits_weights", ["SoVITS_weights_v2/youlika_e10_s1000.pth"])
    ]);

    console.log('TTS 服务已启动:http://localhost:4500');
  } catch (error) {
    console.error('模型初始化失败:', error);
  }
});
