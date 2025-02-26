# AI-aides

基于deepseek与GPT-SoVits的U-Office助手

本项目搭建环境为ubuntu22.04，GPU为nvidia GeForce RTX 3050，4G显存

请提前安装好GPU驱动和cuda

（如果没有nvidia显卡，不建议搭建，速度会非常慢！） 

# deepseek部分

1.安装ollama

curl -fsSL https://ollama.com/install.sh | sh

2.拉取8b模型，终端运行

ollama run deepseek-R1:8b

# GPT-SoVits部分

这是一个文字转语音的音色克隆项目，模型我已经训练好了，如果想自己弄，请自行搜索教程。

1.下载conda

2.创建一个python3.9的环境

sudo apt install curl ffmpeg -y

conda create -n GPTSoVits python=3.9

conda activate GPTSoVits

3.安装依赖

首先把GPT-SoVits拉下来

https://github.com/RVC-Boss/GPT-SoVITS.git

cd GPT-SoVITS

pip install -r requirements.txt

之后将模型放到对应名字的文件夹内:

yulika-e15.ckpt为GPT_weights_v2模型

youlika_e10_s1000.pth为SoVITS_weights_v2模型

4.运行

python webui.py

在跳出的网页中选择1-GPT-SoVITS-TTS，再选择1C-推理，点击开启TTS推理WebUI，等待网页跳出，之后可以将两个网页都关了

# Vue网页部分

安装完vue3（不要装3以下的版本）后，进入demo文件夹，依次运行

1.deepseek后端：

node index.js

2.GPT-SoVITS后端：

node sovits.mjs

3.前端网页：

npm run serve

安装完所有东西后，此后每次开启只需要执行GPT-SoVITS的第3步和网页的1.2.3步，注意第一次的问答会比较慢。



# 目前缺陷：

1.无法实现一句一句的读，只能等待回复完后，一次性读。

2.由于第一点的缺陷，导致AI在生成大量文本后(不包括think)，经过语音转化，网页会自动刷新，导致回答无效。

3.GPT-SoVITS是有官方api使用的，运行api_v2.py即可，但是我经过尝试后发现转化的效果非常差，按理来说是和可视化网页一样的效果，猜测可能是对linux不太兼容，于是我直接通过可视化网页的api来进行转化。

4.由于语音转化的限制，导致无法转化英文和部分符号，强制使用会出现错误，所以我将AI的回复进行了相关内容的剔除。

5.由于所有内容均为本地部署，因此无需网络，但对系统的性能要求也比较高，我的电脑只能到8b了，但是只有到了32b才有一定的头脑，大概有满血版的90%，而14b只有30%左右


