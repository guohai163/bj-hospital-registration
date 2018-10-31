'use strict';


const request = require('urllib-sync').request;
const config = require("./config");
const http = require('http');
const querystring = require('querystring');
const readlineSync = require('readline-sync');


let loginState = false

let runState = false

// let cookie = '';
let cookie = ''

let doctorMap = new Map()

let smsState = true



syncLogin(); //打开程序首先登录


function loop() {

    if (!runState && loginState) {
        runState = true
        config.departmentId.forEach(dep => {
            syncGetDoctorList(1,dep)
            syncGetDoctorList(2,dep)
        })
        syncGetDoctorList(1,config.departmentId[1])
        runState = false
        setTimeout(loop,500);
    }else {
        setTimeout(loop,2000);
    }

}



function syncLogin(){

    if(cookie !== '') {
        checkLoginState();
        return
    }

    var post_data = {
        'mobileNo':Buffer.from(config.userName).toString('base64'),
        'password':Buffer.from(config.passWord).toString('base64'),
        'yzm':'',
        'isAjax':true
    };
    var options = {
        method: 'POST',
        data: post_data,
        headers: {
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',
            'Accept':'application/json, text/javascript, */*; q=0.01',
            'Accept-Language':'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept-Encoding':'gzip, deflate',
            'X-Requested-With':'XMLHttpRequest',
            // 'Cookie':cookie,
            'Referer':'http://www.bjguahao.gov.cn/logout.htm',
            'Origin':'http://www.bjguahao.gov.cn',
            'Connection': 'keep-alive',
            'Content-Length': post_data.length
        }
    };

    var result = request('http://www.bjguahao.gov.cn/quicklogin.htm',options);

    console.log(result.data.toString('utf8'))

    
        var str = result.headers['set-cookie'][0]
        var regex = /JSESSIONID=([0-9a-zA-Z]+)/
        var JSESSIONID = str.match(regex);

        str = result.headers['set-cookie'][1]
        regex = /SESSION_COOKIE=([0-9a-zA-Z]+)/
        var SESSION = str.match(regex)

        cookie = "JSESSIONID="+JSESSIONID[1]+"; SESSION_COOKIE="+SESSION[1]+"; ";
        checkLoginState();
        
}

 /**
  * 检查用户是否登录如果未登录自动登录
  */
 function checkLoginState() {
    var post_data = querystring.stringify({
        'isAjax':true
    });
 
    var options = {
        hostname:'www.bjguahao.gov.cn',     //此处不能写协议，如 ： http://,https://  否则会报错
        port:80,
        path:'/islogin.htm',
        method:'POST',
        headers: {
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',
            'Accept':'application/json, text/javascript, */*; q=0.01',
            'Accept-Language':'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept-Encoding':'gzip, deflate',
            'X-Requested-With':'XMLHttpRequest',
            'Cookie':cookie,
            'Referer':'http://www.bjguahao.gov.cn/index.htm',
            'Origin':'http://www.bjguahao.gov.cn',
            'Content-Length': post_data.length
        }
    };
    var req = http.request(options,function(res){
 
        res.setEncoding('utf8');
        var data = [];
        res.on('data', function (response) {
            data.push(response);
        });
        res.on('end', function() {
            var body = JSON.parse(data.join(''));
            console.log('\x1b[33m登录成功！\x1b[0m')
            console.log(body)
            if(body.msg === 'OK') {
                loginState = true
                loop();
            }
        })
    });
     
    req.write(post_data);
    req.end();
}



/**
 * 获得指定日期医生列表
 * @param {1上午，2下午} dutyCode 
 */
function syncGetDoctorList(dutyCode,departmentId) {
    console.log(dutyCode==1?'上午'+'  '+  departmentId+'科室':'下午'+'  '+  departmentId+'科室')
    var post_data = {
        'hospitalId':config.hospitalId,
        'departmentId':departmentId,
        'dutyCode': dutyCode,//1 上午 2下午
        'dutyDate': config.dutyDate,//日期
        'isAjax':true
    };
    
    var options = {
        method:'POST',
        data:post_data,
        headers: {
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',
            'Accept':'application/json, text/javascript, */*; q=0.01',
            'Accept-Language':'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With':'XMLHttpRequest',
            'Cookie':cookie,
            'Content-Length': post_data.length
        }
    };


    var result = request('http://www.bjguahao.gov.cn/dpt/partduty.htm',options);

    if(result.status === 200) {
        var body = JSON.parse(result.data.toString('utf8'));
        if(body.code !== 200) {
            console.log(body)
        }
        
        body.data.forEach(element => {
            console.log('check doctor:'+element.doctorTitleName+" "+element.doctorName+' '+element.remainAvailableNumber)

            if(config.doctorTitle.includes(element.doctorTitleName) && element.remainAvailableNumber >0) {
                if(!doctorMap.get(element.dutySourceId)) {
                    syncGetDoctorPage(element,departmentId)
                    syncSendSMS(element,departmentId)
                }
            }

        });
    }


}

function syncGetDoctorPage(data,departmentId) {
//curl 'http://www.bjguahao.gov.cn/order/confirm/142-200039484-201154710-57871426.htm'  
//'Cache-Control: max-age=0' -H '373E3ECE2FDd6ca44a23988fa=1540769011' --compressed
    var options = {
        method: 'GET',
        headers: {
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': 1,
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',//
            'Accept':'application/json, text/javascript, */*; q=0.01',//
            'Referer': 'http://www.bjguahao.gov.cn/dpt/appoint/'+config.hospitalId+'-'+departmentId+'.htm',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' ,
            'Cookie': cookie,
            'Content-Length': 0
        }
    }
    var result = request('http://www.bjguahao.gov.cn/order/confirm/'+config.hospitalId+'-'+departmentId+'-'+data.doctorId+'-'+data.dutySourceId+'.htm',options)
}


function syncSendSMS(data,departmentId) {

    // -H 'Origin: http: -H 'Connection: keep-alive' -H 'Content-Length: 0' --compressed
    var options = {
        method:'POST',
        timeout: 10000,
        headers:{
            'Origin': 'http://www.bjguahao.gov.cn',
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',//
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept':'application/json, text/javascript, */*; q=0.01',//
            'Referer':'http://www.bjguahao.gov.cn/order/confirm/'+config.hospitalId+'-'+departmentId+'-'+data.doctorId+'-'+data.dutySourceId+'.htm',
            'X-Requested-With':'XMLHttpRequest',
            'Connection': 'keep-alive',
            'Cookie':cookie,
            'Content-Length': 0
        }   
    }
    
    var result = request('http://www.bjguahao.gov.cn/v/sendorder.htm',options)
    console.log(result.data.toString('utf8'))
    doctorMap.set(data.dutySourceId,true)
    // process.exec("open "+'http://www.bjguahao.gov.cn/order/confirm/'+config.hospitalId+'-'+departmentId+'-'+data.doctorId+'-'+data.dutySourceId+'.htm')
    smsState=false
    var body = JSON.parse(result.data.toString('utf8'));
    var smsCode= readlineSync.question('\x1b[32m请输入接收到的短信验证码:\x1b[0m');
    registration(data,departmentId,smsCode)
}



/**
 * 挂号方法
 * @param {医生数据} data 
 */
function registration(data,departmentId,smsCode) {

    console.log('start:'+data.doctorTitleName+data.doctorName + ' sms :'+smsCode)
 
 
    var post_data = {
        'dutySourceId':data.dutySourceId,//医生本次编号
        'hospitalId':config.hospitalId,//142 三院
        'doctorId':data.doctorId,
        'departmentId':departmentId,//科室
        'childrenBirthday': '',
        'hospitalCardId' : config.hospitalCardId,
        'medicareCardId': config.medicareCardId,
        'reimbursementType' : 1,
        'smsVerifyCode' : smsCode,
        'patientId' : config.patientId,
        'isAjax':true
    };

    
    var options = {
        method:'POST',
        data: post_data,
        headers: {
            'Origin': 'http://www.bjguahao.gov.cn' ,
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:62.0) Gecko/20100101 Firefox/62.0',//
            'Accept':'application/json, text/javascript, */*; q=0.01',//
            'Accept-Language':'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',//
            'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept-Encoding': 'gzip, deflate' ,
            'X-Requested-With':'XMLHttpRequest',
            'Cookie':cookie,
            'Referer':'http://www.bjguahao.gov.cn/order/confirm/'+config.hospitalId+'-'+departmentId+'-'+data.doctorId+'-'+data.dutySourceId+'.htm',
            'Connection':'keep-alive'

        }
    };
         
    var result = request('http://www.bjguahao.gov.cn/order/confirmV1.htm',options)

    console.log(result)

    console.log(result.data.toString('utf8'))

  

 
}

