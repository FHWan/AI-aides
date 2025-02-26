import { client } from "@gradio/client";
import { readFileSync, writeFileSync } from "fs";
import axios from "axios"; // 导入 axios 用于下载文件
import { resolve } from "path";

async function generateAndSaveTTS() {
  try {
    // 1. 修正音频路径（注意 radio 的正确拼写）
    const audioPath = "./public/radio/go.wav"; // 使用相对路径
    
    // 2. 读取本地音频文件（Node.js方式）
    const audioData = readFileSync(audioPath);
    const exampleAudio = new Blob([audioData], { type: "audio/wav" });

    // 3. 连接 Gradio 服务
    const app = await client("http://localhost:9872/");

    // 4. 修改模型为指定的权重
    const changeModelResult_GPT = await app.predict("/change_gpt_weights", [
      "GPT_weights_v2/yulika-e15.ckpt", // 新模型路径
    ]);

    const changeModelResult_SOV = await app.predict("/change_sovits_weights", [		
      "SoVITS_weights_v2/youlika_e10_s1000.pth", // string  in 'SoVITS模型列表' Dropdown component		
    ]);


    // 5. 设置请求参数（保持你的原参数）
    const ttsParams = [
      exampleAudio,
      "反正是梦，我会一口气帮大家把所有敌人解决掉的！",
      "中文",
      "你好你好",
      "中文",
      "不切",
      5, 1, 1,   // top_k, top_p, temperature
      false,      // 无参考文本模式
      1,        // 语速
      false,       // 调整上次结果
      null,       // 多参考音频
      16         // 采样步数
    ];

    // 6. 发送请求
    const result = await app.predict("/get_tts_wav", ttsParams);

    // 7. 调试输出，查看返回的数据类型和内容
    console.log('返回的数据类型:', typeof result.data);
    console.log('返回的数据内容:', result.data);

    // 8. 从返回的 result.data 获取音频文件的 URL
    const audioUrl = result.data[0]?.url;
    if (!audioUrl) {
      console.error('没有获取到音频的 URL');
      return;
    }

    // 9. 下载音频文件
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });

    //  10. 将下载的音频文件保存到本地
    const outputPath = `./radio/tts_output.wav`;
    writeFileSync(outputPath, response.data);

    console.log(`音频已保存至: ${outputPath}`);

  } catch (error) {
    console.error('发生错误:', error);
  }
}

generateAndSaveTTS(); // 调用生成函数
