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

cron.schedule('4 */30 6-19 * * *', () => {
    writeDB();
})

async function writeDB() {
    try {
        const response = await getDeviceData('1000000033980918,1000000033980917,1000000033980916,1000000033980915,1000000033980914,1000000033980913,1000000033980912,1000000033980911,1000000033980919,1000000033980902,1000000033981392,1000000033980910,1000000033980909,1000000033980908,1000000033980907,1000000033980906,1000000033980905,1000000033980904,1000000033980903,1000000033980556,1000000033980539,1000000033980547,1000000033980546,1000000033980545,1000000033980544,1000000033980543,1000000033980542,1000000033980570,1000000033980541,1000000033980540,1000000033980555,1000000033980554,1000000033980553,1000000033980552,1000000033980551,1000000033980550,1000000033980549,1000000033980548,1000000033980925,1000000033980924,1000000033980923,1000000034063745,1000000033980922,1000000033980921,1000000033980933,1000000033980932,1000000033980931,1000000033980930,1000000033980929,1000000033980928,1000000033980927,1000000033980926,1000000033980939,1000000033980938,1000000033980937,1000000033980936,1000000033980935,1000000033980934', '1')
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
            const sql = `PH3 No.${i+ 1}\t${dateTime.toLocaleString()}\t${devID}\t${ActivePower}\t\t${time}`
            
            console.log(sql)
            await knex('Ph_Dv').insert({
                PowerHouse : 'PowerHouse3',
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