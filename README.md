[![Build Status](https://travis-ci.org/wxparcel/wxparcel-deployer.svg?branch=master)](https://travis-ci.org/wxparcel/wxparcel-deployer)

# WxParcel Deployer - 微信发布工具

开发阶段请勿使用


## 使用

* 暂时不提供登陆功能

```
# 开启发布工具服务
# 设置微信小程序开发工具 cli 所在位置
$ wxparcel-deployer server --dev-tool-cli /Applications/wechatwebdevtools.app/Contents/MacOS/cli

# 设置微信小程序开发工具 http 服务
$ wxparcel-deployer server --dev-tool-serv http://127.0.0.1:512345

# 发布项目
# 设置微信小程序发布服务地址 (注意必须带上协议)
$ wxparcel-deployer deploy --server http://127.0.0.1:3000
```

## 本地开发调试工具

```
$ cd path/to/wxparcel-deployer
$ npm link . # 这样就可以全局通用, 若要使用全局作用于项目, 必须把本地项目的依赖删除

# 若要引用到 wxparcel-deployer 中配置文件或内部类
$ cd path/to/project
$ npm link wxparcel-deployer # 必须在 `npm link .` 之后执行
```
