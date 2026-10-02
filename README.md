# Recordio

简体中文 | [English](README-EN.md)

<p align="center"><img src="public/app-icons/recordio-256.png" width="128" alt="Recordio 图标" /></p>

Recordio 是一款免费开源的桌面录屏与视频编辑软件，适合制作演示、教程和产品介绍。它是基于 [Recordly](https://github.com/webadderallorg/Recordly) 修改的**独立版本**，不是 Recordly 官方发行版。Recordly 本身源于 OpenScreen。这份源码快照基于 [Recordly 提交 1888428](https://github.com/webadderallorg/Recordly/commit/1888428)，完整上游历史可在原仓库查看；本仓库保留上游版权和许可声明。

## 相比所用 Recordly 基础版本的改进

Recordly 原本已具备屏幕录制、剪辑、缩放、背景和光标效果。以下是 Recordio 在此基础上增加或调整的内容：
##
- 【光标效果优化】左键与右键可以分别设置点击效果、颜色和内置音效；改善光标移动和点击动画的平滑度，增加更多可缩放的光标样式；
- 【长时录制优化】改善长时间录制后的保存可靠性，修复大文件错误。
- 【动效画质优化】增加更多运动预设效果，包括弹性方案；改善预览和导出时视频圆角描边及点击波纹的平滑度。
- 【优化编辑器】项目加载提示、更醒目的轨道选中状态、时间线缩放与帧数／秒数步进调节、方向键控制，以及清除全部缩放效果的操作。
- 【导出优化】先选保存位置再导出；增加高码率选项、已用时间与动态剩余时间、完成提示音，并改进无音频视频及编码器回退的处理。
- 【项目管理】确认删除项目及视频时，会同步将对应光标、诊断和音频配套文件移入回收站，并防止删除仍被其他项目使用的视频。
- 【界面优化】完善简体中文界面、通知和快捷键文案；采用独立的 Recordio 应用身份和数据目录，可与 Recordly 共存。
##
<img width="1740" height="1133" alt="image" src="https://github.com/user-attachments/assets/6f1b34d3-9138-4656-993e-bdbc1c5ccf86" />
<img width="321" height="792" alt="image" src="https://github.com/user-attachments/assets/7f98d72c-ed6d-40fb-a808-14d70c362d60" />
<img width="322" height="794" alt="image" src="https://github.com/user-attachments/assets/256fbe2e-36f9-4e60-b22a-1649e0738d35" />
<img width="323" height="789" alt="image" src="https://github.com/user-attachments/assets/54a5a352-765f-4e81-a214-b94d578d0c91" />








## 平台与构建

源码面向 Windows、macOS 和 Linux。

使用 Node.js 22 和 npm：

```bash
npm ci
npm run build:win   # 在 Windows 上构建 x64 安装包
npm run build:mac   # 在 macOS 上构建 Intel 和 Apple 芯片 DMG/ZIP
```

`npm run build` 会选择当前系统。GitHub Actions 中的 **Package Windows and macOS** 工作流可手动启动，在各自原生构建机上生成两种平台的文件。没有配置 Apple 签名证书时，Mac 包不会签名。Windows 原生组件需要 Visual Studio Build Tools，Mac 原生组件需要 Xcode 命令行工具。项目文件暂时保留 `.recordly` 扩展名，以兼容已有项目。

## 开源许可与致谢

Recordio 按与所用 Recordly 源码相同的 **GNU Affero General Public License v3（AGPLv3）** 发布，详见 [LICENSE.md](LICENSE.md)。原项目仓库：[webadderallorg/Recordly](https://github.com/webadderallorg/Recordly)；[原项目许可证](https://github.com/webadderallorg/Recordly/blob/main/LICENSE.md)。原作者及贡献者的版权和许可声明保留在源码与许可证中。Recordio 由独立维护者修改和发布，与 Recordly 作者没有官方从属或背书关系。

Recordio 源码、问题反馈和更新：[zhoufei3/Recordio](https://github.com/zhoufei3/Recordio)。
