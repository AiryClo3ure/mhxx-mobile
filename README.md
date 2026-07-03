# MHXX 图鉴 - 手机版

怪物猎人 XX (Monster Hunter XX) 数据库图鉴 Progressive Web App。

由 Windows 桌面版 [MHXX Dex](https://github.com/AiryClo3ure/mhxx-mobile) 数据转换而来，支持安装到手机桌面使用。

## 功能

- **12 个分类浏览**：武器、防具、物品、怪物、技能、装饰品、调和配方、怪物肉质、采集素材、栖息地、掉落报酬、制作材料
- **搜索筛选**：支持按名称搜索和分类筛选
- **详情查看**：针对每种数据类型定制化的详情展示（肉质表、技能效果、采集概率等）
- **离线可用**：数据缓存到本地，二次访问无需网络
- **可安装**：PWA 支持，添加到手机桌面即开即用

## 使用

### 在线访问

https://airyclo3ure.github.io/mhxx-mobile/

### 本地运行

```bash
cd mhxx-mobile
python -m http.server 8080
```

浏览器访问 `http://localhost:8080`

### 安装到手机

用 Chrome / Safari 打开后，点击"添加到主屏幕"。

## 数据来源

数据提取自原版 MHXX Dex 的 Excel 数据库（MHXX_数据库_中文.xlsx），包含 13 万+ 条数据记录。

## 构建

```bash
# 从 Excel 提取 JSON 数据
python extract_data.py

# 启动本地服务器
cd mhxx-mobile
python -m http.server 8080
```
