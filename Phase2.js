require('dotenv').config();
const knex = require('knex')({
  client: 'mssql',
  connection: {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  }
});

const axios = require('axios');
const https = require('https');
const cron = require("node-cron");
const baseUrl = 'https://intl.fusionsolar.huawei.com/thirdData/';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

let lastFetchDate = null;
let cachedGroupData = null;

cron.schedule('30 */15 5-19 * * *', async () => {
  const currentDate = new Date().toDateString();
  try {
    const token = await hwLogin();

    if (!cachedGroupData || lastFetchDate !== currentDate) {
      cachedGroupData = await getDeviceList(token);
      lastFetchDate = currentDate;
      console.log("Device list updated");
    }

    await getDeviceData(token, cachedGroupData);
    console.log("Device data fetched successfully.");
  } catch (error) {
    console.error("An error occurred during the cron job execution:", error);
  }
});

async function hwLogin() {
  try {
    const data = { userName: "NPSSOLAR", systemCode: "admin1234" };
    const response = await axios.post(`${baseUrl}login`, data, { httpsAgent });
    const xsrf = response.headers['xsrf-token'];
    console.log("token : ", xsrf);
    if (!xsrf) throw new Error('Log In Failed');
    return xsrf;
  } catch (error) {
    console.error('Login Error:', error.message);
    throw error;
  }
}

async function getDeviceList(token) {
  try {
    const response = await axios.post(`${baseUrl}getDevList`, { "stationCodes": "NE=33987445,NE=33980537" }, { headers: { 'xsrf-token': token }, httpsAgent });

    const data = response.data.data;
    const group1 = data.filter(device => device.devTypeId === 1 && device.stationCode === "NE=33987445")
                       .map(device => ({ id: device.id.toString(), name: device.devName }));
    const group2 = data.filter(device => device.devTypeId === 1 && device.stationCode === "NE=33980537")
                       .map(device => ({ id: device.id.toString(), name: device.devName }));
    return { group1, group2 };
    
  } catch (error) {
    if (error.response) {
      console.error(`Error fetching device list: ${error.response.status} - ${error.response.data}`);
    } else {
      console.error('Error fetching device list:', error.message);
    }
    return { group1: [], group2: [] };
  }
}

const moment = require('moment'); 

async function getDeviceData(token, cachedData) {
  const { group1, group2 } = cachedData;

  if (!group1 || !group2) {
    console.error("Cached data is invalid: ", cachedData);
    return;
  }

  try {
    const group1Ids = group1.map(device => device.id).join(",");
    const group2Ids = group2.map(device => device.id).join(",");

    const responseGroup1 = await axios.post(`${baseUrl}getDevRealKpi`, {
      "devIds": group1Ids,
      "devTypeId": "1"
    }, {
      headers: {
        'xsrf-token': token
      },
      httpsAgent: httpsAgent
    });
    
    const responseGroup2 = await axios.post(`${baseUrl}getDevRealKpi`, {
      "devIds": group2Ids,
      "devTypeId": "1"
    }, {
      headers: {
        'xsrf-token': token
      },
      httpsAgent: httpsAgent
    });

    const PowerHouse3Group1 = responseGroup1.data;
    const PowerHouse4Group2 = responseGroup2.data;

    let dateTime = moment.utc();
    
    // ปรับนาทีให้เป็นช่วงเวลา cron ที่ผ่านมาที่สุด (00, 15, 30, 45)
    let minutes = dateTime.minute();
    let adjustedMinutes = Math.floor(minutes / 15) * 15; // ปรับลงเป็นช่วงเวลาที่ใกล้เคียงที่สุดในอดีต
    
    dateTime.minute(adjustedMinutes);
    dateTime.second(0);
    dateTime.millisecond(0);
    
    // ตั้งค่า dateTime และ CodeTime สำหรับการ insert
    dateTime = dateTime.format('YYYY-MM-DD HH:mm:ss');
    const codeTime = dateTime.slice(14, 16); //  
    
    await Promise.all(PowerHouse3Group1.data.map(item => {
      const deviceInfo = cachedData.group1.find(device => device.id === item.devId.toString());
      const inverterName = deviceInfo ? deviceInfo.name : 'Unknown';
    
      return knex('Ph_Dv').insert({
        PowerHouse: 'PowerHouse3', 
        DateTime: dateTime,
        CodeTime: codeTime,
        DeviceId: item.devId,
        InverterNo: inverterName,
        ActivePower: item.dataItemMap.active_power,
        CodeCurrentTime: PowerHouse3Group1.params.currentTime,
        Status: item.dataItemMap.run_state
      })  
      .then(() => console.log(`PowerHouse3 devId: ${item.devId}, active_power: ${item.dataItemMap.active_power}, DateTime: ${dateTime}  สำเร็จ`))
      .catch(err => console.error(`PowerHouse3 devId: ${item.devId}, active_power: ${item.dataItemMap.active_power}, DateTime: ${dateTime} ล้มเหลว`, err));
    }));

    await Promise.all(PowerHouse4Group2.data.map(item => {
      const deviceInfo = cachedData.group2.find(device => device.id === item.devId.toString());
      const inverterName = deviceInfo ? deviceInfo.name : 'Unknown';
    
      return knex('Ph_Dv').insert({
        PowerHouse: 'PowerHouse4', 
        DateTime: dateTime,
        CodeTime: codeTime,
        DeviceId: item.devId,
        InverterNo: inverterName,
        ActivePower: item.dataItemMap.active_power,
        CodeCurrentTime: PowerHouse4Group2.params.currentTime,
        Status: item.dataItemMap.run_state
      })
      .then(() => console.log(`PowerHouse4 devId: ${item.devId}, active_power: ${item.dataItemMap.active_power}, DateTime: ${dateTime}  สำเร็จ`))
      .catch(err => console.error(`PowerHouse4 devId: ${item.devId}, active_power: ${item.dataItemMap.active_power}, DateTime: ${dateTime} ล้มเหลว`, err));
    }));

    console.log('Data inserted successfully');

  } catch (error) {
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    let errorMessage = 'Unknown error occurred.';
    if (error.response) {
      // หากมี response จาก API สามารถปรับเปลี่ยนข้อความข้อผิดพลาดให้ตรงกับสิ่งที่ API ส่งกลับมา
      errorMessage = `Error: ${error.response.status} - ${error.response.data}`;
    } else {
      // หากไม่มี response จาก API ใช้ message จาก error object
      errorMessage = `Error: ${error.message}`;
    }
    console.error(`Time: ${currentTime}\n${errorMessage}`);
  }
}