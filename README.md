# 基于node.js的扒站小工具

## 使用
1. npm i
2. node index.js

## 具体功能
1. 可以同时下载多个页面 （需自己配置）
2. 分类保存 css,js,images 资源
3. 自动替换a链接 （有文件的链接到下载好的文件，没有的为 'javascript:;'）

## 存在的问题
1. 只能下载本公司架构(写这个工具的本意就是扒公司架构)
2. 还不能下载css文件中的背景图片
3. 由于架构中图片路径的不规范，导致现在下载img标签里的图片有时会报错
4. 所有的操作都需要修改 index.js文件，还没做界面
5. 第一次写，估计性能已经代码结构方面还有很多问题
6. 先挖个坑，看作最后能填成什么样子

## 用到的技术
1. 原生 js
2. 原生 node.js 中的 fs (文件操作)，path (路径操作)
3. cheerio.js (可以向jQuery一样操作扒下来的数据)
4. async.js (异步操作这里主要是用来，异步下载图片)
5. request.js (http请求)

