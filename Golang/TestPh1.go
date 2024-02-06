package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    _ "github.com/denisenkom/go-mssqldb"
    "github.com/robfig/cron/v3"
)

type DeviceDataRequest struct {
    Appkey       string   `json:"appkey"`
    PointIDList  []string `json:"point_id_list"`
    PsKeyList    string   `json:"ps_key_list"`
    DeviceType   int      `json:"device_type"`
    Token        string   `json:"token"`
}

type DeviceDataResponse struct {
    // Define your response structure here based on the API response
}

var (
    db  *sql.DB
    ctx context.Context
)

func initDB() {
    var err error
    // Update with your SQL Server connection details
    connString := "server=your_server;user id=your_user;password=your_password;database=NPS_SOLAR"
    db, err = sql.Open("sqlserver", connString)
    if err != nil {
        log.Fatal("Error creating connection pool: ", err.Error())
    }
    ctx = context.Background()
    err = db.PingContext(ctx)
    if err != nil {
        log.Fatal(err.Error())
    }
}

func getDeviceData(pointID, psKey string, deviceType int) (*DeviceDataResponse, error) {
    client := &http.Client{Timeout: 10 * time.Second}
    requestData := DeviceDataRequest{
        Appkey:      "your_app_key",
        PointIDList: []string{pointID},
        PsKeyList:   psKey,
        DeviceType:  deviceType,
        Token:       "your_token",
    }
    requestBody, err := json.Marshal(requestData)
    if err != nil {
        return nil, err
    }

    request, err := http.NewRequest("POST", "https://gateway.isolarcloud.com.hk/openapi/getDeviceRealTimeData", bytes.NewBuffer(requestBody))
    if err != nil {
        return nil, err
    }

    request.Header.Add("x-access-key", "your_access_key")
    request.Header.Add("sys_code", "901")
    request.Header.Add("Content-Type", "application/json;charset=UTF-8")

    response, err := client.Do(request)
    if err != nil {
        return nil, err
    }
    defer response.Body.Close()

    var responseData DeviceDataResponse
    err = json.NewDecoder(response.Body).Decode(&responseData)
    if err != nil {
        return nil, err
    }

    return &responseData, nil
}

func writeDB() {
    // Implement your database write logic here similar to the JavaScript version
    // You may need to adjust it based on the actual response structure and your database schema
}

func main() {
    initDB()

    c := cron.New()
    _, err := c.AddFunc("30 1,6,11,16,21,26,31,36,41,46,51,56 6-19 * * *", func() {
        writeDB()
    })
    if err != nil {
        log.Fatal(err)
    }
    c.Start()

    // Keep the application running
    select {}
}
