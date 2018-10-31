### 北京医院自动挂号脚本

最近想挂某医院的专家号，在[www.bjguahao.gov.cn](www.bjguahao.gov.cn)每日七点放号。手工挂号流程是，
登录=》选医院=》选科室=》选日期（上下午）=》选医生=》下发短信=》填写表单提交。
试了几天人工，发现手工操作太慢一两个专家号一闪就没。顾打算使用nodejs来写个自动登录选医院，同时多科室（特需）看空闲医生。触发短信。
人工填写短信。自动提交表单。

#### 文件目录结构

```
+-- config.js //配置文件 
+-- index.js //主程序文件
+-- package.json //nodejs项目文件 
+-- README.md //本文件
```

### 讲一下刷号的流程。

1. 登录，其中用户名和密码要做一次base64编码
2. 保存服务器下发的cookie ,之后每个操作都要带着提交
3. 验证登录状态。
4. 使用setTimeout开始循环调用指定日期的医生列表接口。
5. 放号后，遍历每一位医生，当发现医生还有号并为配置文件中想挂号等级的医生。准备发送短信
6. 控制台等待用户输入手机验证码。输入完毕后自动 提交表单。
7. 不管成功与否，程序会自动继续检查下一位候选医生。
8. 结束程序请使用Ctrl+c


### 还没有自动化的一些关键URL

```
//医院列表
http://www.bjguahao.gov.cn/hp/qsearch.htm?areaId=-1&levelId=-1&isAjax=true

//科室
http://www.bjguahao.gov.cn/dpt/dpts.htm?hospitalId=142&hospitalType=1&isAjax=true
```