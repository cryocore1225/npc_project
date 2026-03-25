# NPC Trash Classifier

基于 Next.js + TensorFlow.js 的浏览器端垃圾分类演示项目。

## 功能概览

- 相机拍照识别（前后摄切换、拍后二次确认：重拍/使用照片）
- 上传识别（本地文件 / 图片 URL / 剪贴板截图）
- 8 类物体识别后映射成 5 类垃圾
- 低置信度兜底（不可判定）
- 中韩双语
- `/admin` 统计页（本地埋点日志）

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 模型放置（单模型）

将导出的 TensorFlow.js 模型放到：

- `public/model/model.json`
- `public/model/weights.bin`

项目会使用版本化地址加载模型：`/model/model.json?v=model-v2`  
更新模型时可修改 `app/page.tsx` 中的 `MODEL_VERSION`。

## 训练类别顺序（必须一致）

模型输出顺序必须为：

1. `can`
2. `bottle`
3. `food`
4. `battery`
5. `paper`
6. `plastic`
7. `furniture`
8. `background`

## 映射规则（8 类 -> 5 类垃圾）

- `can / bottle / paper / plastic` -> `Recyclables`
- `food` -> `Food waste`
- `battery` -> `Hazardous waste`
- `furniture` -> `Bulk waste`
- 其他（含 `background`）-> `General waste`

## 本轮优化说明

- 结果可信度：
  - Top1 < 45% 显示“不可判定”
  - 展示“原始 8 类 Top3 + 映射 5 类 Top3”
  - 显示“判定依据”
- 交互：
  - 上传方式改为居中弹窗
  - 相机错误改为居中弹窗
- 性能与展示：
  - 模型加载进度条
  - 预览图改为 `object-fit: contain`
  - 显示预览分辨率
  - 将页面中的 `<img>` 替换为 `next/image`（减少 `no-img-element` 告警）
- 数据统计：
  - 记录推理来源、耗时、置信度、低置信度占比到 `localStorage`
  - `/admin` 页面展示统计与明细

## 常见问题

- 相机打不开：检查权限、HTTPS/localhost、是否被其他应用占用
- 出现 `Cannot find module './xxx.js'`：删除 `.next` 后重启开发服务器
  - Windows: `cmd /c "rmdir /s /q .next"`

