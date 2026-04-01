# TensorFlow 2 + MobileNetV2 -> TensorFlow.js (Web)

## 0) 先确认版本

你可以继续用 TensorFlow，但在 Windows 上请用 **Python 3.11**（3.12/3.13/3.14 会装不上 tensorflow）。

PyCharm: `Settings -> Project -> Python Interpreter`，选择 Python 3.11 环境。

## 1) 安装依赖

```powershell
cd D:\Code\npc_project
python -m pip install --upgrade pip
python -m pip install -r ml\requirements.txt
```

## 2) 数据策略（尽量全量）

- 粗分类模型：`garbage_classification + realwaste`（统一粗标签）
- 细分类模型：`train`（34类细分类）

## 3) 训练粗分类模型

### 3.1 合并并统一标签

```powershell
python ml\prepare_coarse_dataset.py \
  --garbage-dir E:\dataset\garbage_classification \
  --realwaste-dir E:\dataset\realwaste-main\RealWaste \
  --output-dir E:\dataset\coarse_raw \
  --clean
```

### 3.2 切分 train/val/test

```powershell
python ml\split_dataset.py \
  --input-dir E:\dataset\coarse_raw \
  --output-dir E:\dataset\coarse_split \
  --train-ratio 0.8 \
  --val-ratio 0.1 \
  --min-images 1 \
  --clean
```

### 3.3 训练（默认启用 class_weight）

```powershell
python ml\train.py \
  --data-root E:\dataset\coarse_split \
  --output-dir ml\artifacts\coarse \
  --epochs-head 12 \
  --epochs-finetune 8 \
  --batch-size 32 \
  --image-size 224
```

## 4) 训练细分类模型（34类）

### 4.1 切分

```powershell
python ml\split_dataset.py \
  --input-dir E:\dataset\train \
  --output-dir E:\dataset\train34_split \
  --train-ratio 0.75 \
  --val-ratio 0.15 \
  --min-images 1 \
  --clean
```

### 4.2 训练

```powershell
python ml\train.py \
  --data-root E:\dataset\train34_split \
  --output-dir ml\artifacts\fine34 \
  --epochs-head 20 \
  --epochs-finetune 12 \
  --batch-size 16 \
  --image-size 224
```

## 5) 导出 TensorFlow.js 模型

```powershell
python ml\export_tfjs.py --saved-model ml\artifacts\coarse\saved_model --labels ml\artifacts\coarse\labels.txt --output-dir ml\artifacts\coarse\tfjs_model --quantization float16
python ml\export_tfjs.py --saved-model ml\artifacts\fine34\saved_model --labels ml\artifacts\fine34\labels.txt --output-dir ml\artifacts\fine34\tfjs_model --quantization float16
```

## 6) 训练输出

每个实验目录（如 `ml/artifacts/coarse`）包含：

- `saved_model/`
- `model.keras`
- `labels.txt`
- `class_weights.json`（默认开启）
- `history_head.json`
- `history_finetune.json`
- `val_metrics.json`
