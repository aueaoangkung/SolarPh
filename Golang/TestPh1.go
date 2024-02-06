package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func main() {
	// Define the request body
	psIDs := []string{"1208601", "1242062"} // สร้าง slice ของ ps_id
	totalPSKeyCount := 0                    // สร้างตัวแปรสำหรับจำนวน ps_key ทั้งหมด

	for _, psID := range psIDs {
		// สร้าง request body ที่ใช้ ps_id ตามค่าใน psID
		requestBody := map[string]interface{}{
			"appkey":  "43314D73678D47C1C785C8EE43BA46E6",
			"ps_id":   psID,
			"curPage": 1,
			"size":    1000,
			"token":   "377107_df909d2127a5441e9700e93912423aa5",
		}

		// Convert the request body to JSON
		jsonBody, err := json.Marshal(requestBody)
		if err != nil {
			fmt.Println("Error encoding request body:", err)
			return
		}

		// Create an HTTP request
		apiURL := "https://gateway.isolarcloud.com.hk/openapi/getDeviceList"
		req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
		if err != nil {
			fmt.Println("Error creating request:", err)
			return
		}

		// Add custom headers
		req.Header.Add("x-access-key", "dqfp8d2mvcrjt35mk5k5zib6ngkjksni")
		req.Header.Add("sys_code", "901")
		req.Header.Set("Content-Type", "application/json;charset=UTF-8")

		// Send the request
		client := &http.Client{}
		response, err := client.Do(req)
		if err != nil {
			fmt.Println("Error sending POST request:", err)
			return
		}
		defer response.Body.Close()

		// Read the response body
		responseData, err := ioutil.ReadAll(response.Body)
		if err != nil {
			fmt.Println("Error reading response body:", err)
			return
		}

		// Parse the JSON response
		var jsonResponse map[string]interface{}
		err = json.Unmarshal(responseData, &jsonResponse)
		if err != nil {
			fmt.Println("Error parsing JSON response:", err)
			return
		}

		// Extract "ps_key" values with "device_type" equal to 1 from the response
		if resultData, ok := jsonResponse["result_data"].(map[string]interface{}); ok {
			if pageList, ok := resultData["pageList"].([]interface{}); ok {
				psKeyCount := 0 // ใช้ในการนับจำนวน "ps_key" สำหรับแต่ละ ps_id
				for _, page := range pageList {
					if pageMap, ok := page.(map[string]interface{}); ok {
						if deviceType, ok := pageMap["device_type"].(float64); ok && deviceType == 1 {
							if psKey, ok := pageMap["ps_key"].(string); ok {
								fmt.Printf("ps_id: %s, ps_key: %s\n", psID, psKey)
								psKeyCount++
								totalPSKeyCount++
								// เรียกใช้งานฟังก์ชันสำหรับดึงข้อมูลเรียลไทม์
								getDeviceRealTimeData(psKey)
							}
						}
					}
				}
				fmt.Printf("จำนวน ps_key สำหรับ ps_id %s: %d\n", psID, psKeyCount)
			}
		}
	}

	fmt.Printf("จำนวน ps_key ทั้งหมด: %d\n", totalPSKeyCount)
}

func getDeviceRealTimeData(psKey string) {
	// Define the request body for getDeviceRealTimeData
	requestBody := map[string]interface{}{
		"appkey":        "43314D73678D47C1C785C8EE43BA46E6",
		"point_id_list": []string{"24"},
		"ps_key_list":   []string{psKey},
		"token":         "377107_df909d2127a5441e9700e93912423aa5",
		"device_type":   1,
	}

	// Convert the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Println("Error encoding request body for getDeviceRealTimeData:", err)
		return
	}

	// Create an HTTP request for getDeviceRealTimeData
	apiURL := "https://gateway.isolarcloud.com.hk/openapi/getDeviceRealTimeData"
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Println("Error creating request for getDeviceRealTimeData:", err)
		return
	}

	// Add custom headers
	req.Header.Add("x-access-key", "dqfp8d2mvcrjt35mk5k5zib6ngkjksni")
	req.Header.Add("sys_code", "901")
	req.Header.Set("Content-Type", "application/json;charset=UTF-8")

	// Send the request for getDeviceRealTimeData
	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending POST request for getDeviceRealTimeData:", err)
		return
	}
	defer response.Body.Close()

	// Read the response body for getDeviceRealTimeData
	responseData, err := ioutil.ReadAll(response.Body)
	if err != nil {
		fmt.Println("Error reading response body for getDeviceRealTimeData:", err)
		return
	}

	// Parse the JSON response for getDeviceRealTimeData
	var jsonResponse map[string]interface{}
	err = json.Unmarshal(responseData, &jsonResponse)
	if err != nil {
		fmt.Println("Error parsing JSON response for getDeviceRealTimeData:", err)
		return
	}

	// Extract the data you need from the response for getDeviceRealTimeData
	if resultData, ok := jsonResponse["result_data"].(map[string]interface{}); ok {
		devicePointList, ok := resultData["device_point_list"].([]interface{})
		if ok {
			for _, devicePoint := range devicePointList {
				devicePointMap, ok := devicePoint.(map[string]interface{})
				if ok {
					devicePointDetails := devicePointMap["device_point"].(map[string]interface{})
					p24 := devicePointDetails["p24"].(string)
					deviceSN := devicePointDetails["device_sn"].(string)
					deviceTime := devicePointDetails["device_time"].(string)

					fmt.Printf("p24: %s\n", p24)
					fmt.Printf("Device SN: %s\n", deviceSN)
					fmt.Printf("Device Time: %s\n", deviceTime)
				}
			}
		}
	}
}
