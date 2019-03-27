# WxParcel Deployer - 微信发布工具

开发阶段请勿使用


## 使用

* 暂时不提供登陆功能

```
# 发布机
# 开启发布工具服务
$ wxparcel-deployer server --dev-tool-cli /Applications/wechatwebdevtools.app/Contents/MacOS/cli
$ wxparcel-deployer server --dev-tool-serv http://127.0.0.1:512345

# 发布机 (CI/Local 客户端)
# 发布项目
$ wxparcel-deployer deploy
```

## 本地开发调试工具

```
$ cd path/to/wxparcel-deployer
$ npm link . # 这样就可以全局通用, 若要使用全局作用于项目, 必须把本地项目的依赖删除

# 若要引用到 wxparcel-deployer 中配置文件或内部类
$ cd path/to/project
$ npm link wxparcel-deployer # 必须在 `npm link .` 之后执行
```
