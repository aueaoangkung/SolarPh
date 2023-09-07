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
const baseUrl = 'https://gateway.isolarcloud.com.hk/openapi/'

async function getDeviceData(point_id,ps_key,device_type){
    try {
        const config = {
            headers: {

                'x-access-key': 'dqfp8d2mvcrjt35mk5k5zib6ngkjksni',
                'sys_code' : '901',
                'Content-Type' : 'application/json;charset=UTF-8'
            }
        };
        const data = {
            appkey : '43314D73678D47C1C785C8EE43BA46E6',
            point_id_list : [point_id] , 
            ps_key_list : ps_key ,
            device_type : device_type,
            token : '377107_add13484811144459205ddc7f9450535'
        }
        const response = await axios.post(baseUrl + 'getDeviceRealTimeData', data, config)
        return response

    }
    catch (e) {
        throw e
    }
}

const cron = require("node-cron")
function create_datetime(seconds, minute, hour, day, month, day_of_week){
    return seconds + " " + minute + " " + hour + " " + day + " " + month + " " + day_of_week
}console.log("Start!!")

cron.schedule('30 */30 6-19 * * *', () => {
    writeDB();
})

async function writeDB() {
    try {
        const response = await getDeviceData('24',["1208601_1_12_4","1208601_1_13_4","1208601_1_14_4","1208601_1_10_4","1208601_1_8_2","1208601_1_9_2","1208601_1_13_2","1208601_1_14_2","1208601_1_16_2","1208601_1_10_2","1208601_1_11_2","1208601_1_12_2","1208601_1_7_2","1208601_1_6_2","1208601_1_5_2","1208601_1_4_2","1208601_1_2_2","1208601_1_1_2","1208601_1_15_2","1208601_1_3_2","1208601_1_9_1","1208601_1_3_1","1208601_1_14_1","1208601_1_16_1","1208601_1_16_3","1208601_1_12_1","1208601_1_15_3","1208601_1_4_1","1208601_1_14_3","1208601_1_10_1","1208601_1_13_3","1208601_1_2_1","1208601_1_12_3","1208601_1_6_1","1208601_1_5_1","1208601_1_11_3","1208601_1_8_1","1208601_1_10_3","1208601_1_8_3","1208601_1_13_1","1208601_1_7_3","1208601_1_11_1","1208601_1_6_3","1208601_1_15_1","1208601_1_5_3","1208601_1_4_3","1208601_1_3_3","1208601_1_2_3","1208601_1_1_3"],1)
        const obj = response.data
        const obj1 = obj.result_data.device_point_list
        
        for (let i = 0; i < obj1.length ; i++) {
            const obj2 = obj1[i]
            
            const ActivePower = obj2.device_point['p24']
            const devID= obj2.device_point['device_sn']
            const dateTime = obj2.device_point['device_time']

            let Condecimal = parseFloat(ActivePower) / 1000;
            if (isNaN(Condecimal) || typeof Condecimal !== 'number' || !Number.isFinite(Condecimal)) {

                Condecimal = null;
            }

            const year = dateTime.slice(0, 4);
            const month = dateTime.slice(4, 6);
            const day = dateTime.slice(6, 8);
            const hours = dateTime.slice(8, 10);
            const minutes = dateTime.slice(10, 12);
            const seconds = dateTime.slice(12, 14);

            const date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`)
            const sql = `PH2 No.${i+ 1}\t${date.toLocaleString()}\t${devID}\t${Condecimal}\t\t${dateTime}`
            
            console.log(sql)

            
            
            await knex('Ph_Dv').insert({
                PowerHouse : 'PowerHouse2',
                DateTime : date,
                CodeTime : minutes,
                DeviceId: devID,
                ActivePower: Condecimal,
                CodeCurrentTime: dateTime
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