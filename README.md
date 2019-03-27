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
$ wxparcel-deployer deploy .
```
