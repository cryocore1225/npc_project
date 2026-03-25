# NPC Trash Classifier

浏览器端垃圾分类演示项目（Next.js + TensorFlow.js）。

核心策略：
- 模型先识别物体类别（8类）
- 前端再映射为 5 类垃圾输出（一般/厨余/可回收/有害/大件）

## 1. 功能

- 拍照识别（移动端/桌面端摄像头）
- 上传识别：
  - 本地文件
  - 图片 URL
  - 剪贴板截图粘贴（Ctrl/Cmd + V）
- 中韩双语界面切换
- Top 3 结果展示 + 投放建议

## 2. 运行环境

- Node.js 18+（建议 20+）
- npm

## 3. 安装与启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 4. 模型放置（单模型）

本项目只使用一个模型路径：

- `public/model/model.json`
- `public/model/weights.bin`

如果文件不存在，页面会显示模型缺失状态。

## 5. 训练类别要求（非常重要）

8 类输出顺序必须与代码一致：

1. `can`
2. `bottle`
3. `food`
4. `battery`
5. `paper`
6. `plastic`
7. `furniture`
8. `background`

如果训练导出顺序不一致，映射结果会错位。

## 6. 映射规则（8类 -> 5类垃圾）

- `can / bottle / paper / plastic` -> `Recyclables`（可回收）
- `food` -> `Food waste`（厨余）
- `battery` -> `Hazardous waste`（有害）
- `furniture` -> `Bulk waste`（大件）
- `background` 或其他 -> `General waste`（一般）

代码位置：
- `app/page.tsx` 中的 `mapToTrash()`
- `app/page.tsx` 中的 `mapScoresToTrashPredictions()`

## 7. 交互说明

- 相机界面顶部：
  - `X` 关闭
  - 旋转图标切换前后摄像头
- 前置摄像头已做非镜像校正（预览与拍照结果一致）
- 手机返回键：相机打开时优先关闭相机层，不直接退出网页

## 8. 常见问题

- 相机打不开：
  - 确认浏览器已授权摄像头
  - 确认使用 `https` 或 `localhost`
  - 关闭占用摄像头的其他应用
- 识别结果异常：
  - 检查模型类别顺序是否符合第 5 节
  - 检查 `model.json` 与 `weights.bin` 是否成对更新

## 9. 开发提示

- `npm run lint` 可能出现 Next 的 `<img>` 性能 warning（非阻塞）
- 若需进一步优化首屏，可考虑将预览 `<img>` 迁移为 `next/image`
