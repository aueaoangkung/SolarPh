let knex = require('knex')({
    client: 'mssql',
    connection: {
        server : '10.28.99.42',
        user : 'aueaoangkun_s',
        password : 'FinnFinn6785',
        database : 'NPS_SOLAR',
    }
});


const axios = require('axios');
require('dotenv').config()
const baseUrl = 'http://api.mibholding.com/wsltms/api/ZoomCrReport/ReportTailRegisterWmsOut?DateStart=2024-01-01&BranchId=503'

async function getDeviceData(){
    try {
        const response = await axios.get(baseUrl , data, config)
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

cron.schedule('/10 * * * * *', () => {
    writeDB();
})

async function writeDB() {
    try {
        const response = await getDeviceData()
        const obj = response.data
        
        for (let i = 0; i < obj.length; i++) {
            const obj2 = obj[i];

            const branch_id = obj2.branch_id;
            const truck_id = obj2.truck_id;
            const pro_name = obj2.pro_name;
            const source_name = obj2.source_name;
            const dest_name = obj2.dest_name;
            const date_booking = obj2.date_booking;
            const activity_start = obj2.activity_start;
            const weight_no = obj2.weight_no;
            const receive_weightnet = obj2.receive_weightnet;

            const sql = `No.${i + 1}\t${branch_id}\t${truck_id}\t${pro_name}\t${source_name}\t${dest_name}\t${date_booking}\t${activity_start}\t${weight_no}\t${receive_weightnet}`;
            console.log(sql);

            await knex('Product_Type').insert({
                branch_id: branch_id,
                truck_id: truck_id,
                pro_name: pro_name,
                source_name: source_name,
                dest_name: dest_name,
                date_booking: date_booking,
                activity_start: activity_start,
                weight_no: weight_no,
                receive_weightnet: receive_weightnet
            });
        }
        let date = new Date();
        console.log("------------ "+date.toLocaleString()+" -----------------");
        console.log(`---------------   Wait 30 min     ------------------`)

    }
    catch (e) {
        console.log('Error', e.message)
    }
}