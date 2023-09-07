let knex = require('knex')({
    client: 'mssql',
    connection: {
        server : '10.28.99.42',
        user : 'aueaoangkun_s',
        password : '0822914530aA',
        database : 'NPS_SOLAR',
    }
});

const axios = require('axios');
require('dotenv').config()
const baseUrl = 'https://intl.fusionsolar.huawei.com/thirdData/'


async function hwLogin() {
    const data = {
        userName: process.env.USER_NAME,
        systemCode: process.env.SYSTEM_CODE
    }
    try {
        const response = await axios.post(baseUrl + 'login', data)
        const xsrf = response.headers['xsrf-token']
        if (xsrf) return xsrf
        else throw ({ message: 'Log In Failed' })
    }
    catch (e) {
        throw (e.message)
    }
}

async function getDeviceData(DeviceCode,DevIdType){
    try {
        const token = await hwLogin();
        const config = {
            headers: {
                'xsrf-token': token
            }
        };
        const data = {
            devIds : DeviceCode , devTypeId : DevIdType
        }
        const response = await axios.post(baseUrl + 'getDevRealKpi', data, config)
        return response.data

    }
    catch (e) {
        throw e
    }
}

const cron = require("node-cron")
function create_datetime(seconds, minute, hour, day, month, day_of_week){
    return seconds + " " + minute + " " + hour + " " + day + " " + month + " " + day_of_week
}console.log("Start!!")

cron.schedule('5 */30 6-19 * * *', () => {
    writeDB();
})

async function writeDB() {
    try {
        const response = await getDeviceData('1000000033980716,1000000033980715,1000000033980714,1000000033980713,1000000033980712,1000000033980711,1000000033980710,1000000033980709,1000000033980724,1000000033980723,1000000033980722,1000000033980721,1000000033980720,1000000033980719,1000000033980718,1000000033980717,1000000033980728,1000000033980727,1000000033980726,1000000033980725,1000000033980862,1000000033980861,1000000033980860,1000000033980859,1000000033980858,1000000033980857,1000000033980856,1000000033980855,1000000033980870,1000000033980869,1000000033980868,1000000033980867,1000000033980866,1000000033980865,1000000033980864,1000000033980863,1000000033980871,1000000033980854,1000000033980853,1000000033980682,1000000033980681,1000000033980680,1000000033980679,1000000033980678,1000000033980677,1000000033980676,1000000033980675,1000000033980688,1000000033980687,1000000033980686,1000000033980685,1000000033980684,1000000033980683,1000000033980674,1000000033980673,1000000033980672,1000000033980671,1000000033980670,1000000033980669', '1')
        const obj = response

        for (i = 0; i < response.data.length ; i++) {
            const obj2 = response.data[i]
            const time = obj.params['currentTime']

            const dataItemMap = obj2.dataItemMap
            const devID = obj2.devId
            const ActivePower = dataItemMap['active_power']

            const milliseconds = parseInt(time, 10)
            const dateTime = new Date(milliseconds)
            const minute = dateTime.getMinutes()
            const minuteStr = minute.toString()
            const sql = `PH4 No.${i+ 1}\t${dateTime.toLocaleString()}\t${devID}\t${ActivePower}\t\t${time}`
            
            console.log(sql)
            await knex('Ph_Dv').insert({
                PowerHouse : 'PowerHouse4',
                DateTime : dateTime,
                CodeTime : minuteStr,
                DeviceId: devID,
                ActivePower: ActivePower,
                CodeCurrentTime: time
            })
        }
        let date = new Date();
        console.log("------------ "+date.toLocaleString()+" -----------------");
        console.log(`---------------   Wait 30 min     ------------------`)

    }
    catch (e) {
        console.log('Error', e.message)
    }
}