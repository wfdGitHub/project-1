/**
 * 云通信基础能力业务短信发送、查询详情以及消费消息示例，供参考。
 * Created on 2017-07-31
 */

const SMSClient = require('@alicloud/sms-sdk')


// ACCESS_KEY_ID/ACCESS_KEY_SECRET 根据实际申请的账号信息进行替换
const accessKeyId = 'LTAI3fa66E4b1lDb'
const secretAccessKey = 'VJGPJLNScbhvFbEJV228NeDYPGb7y2'

console.log("111111")
//初始化sms_client
let smsClient = new SMSClient({accessKeyId, secretAccessKey})

console.log("1111112222222")
//发送短信
smsClient.sendSMS({
    PhoneNumbers: '18850527356',
    SignName: '云通信产品',
    TemplateCode: 'SMS_97880040',
    TemplateParam: '{"code":"12345","product":"云通信"}'
}).then(function (res) {
    let {Code}=res

    console.log("111111333333")
    if (Code === 'OK') {
        //处理返回参数
        console.log(res)
    }
}, function (err) {
    console.log(err)
})