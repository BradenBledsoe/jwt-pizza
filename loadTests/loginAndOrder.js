import { sleep, check, group, fail } from "k6";
import http from "k6/http";
import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js";

export const options = {
    cloud: {
        distribution: {
            "amazon:us:ashburn": {
                loadZone: "amazon:us:ashburn",
                percent: 100,
            },
        },
        apm: [],
    },
    thresholds: {},
    scenarios: {
        Imported_HAR: {
            executor: "ramping-vus",
            gracefulStop: "30s",
            stages: [
                { target: 5, duration: "30s" },
                { target: 15, duration: "1m" },
                { target: 10, duration: "30s" },
                { target: 0, duration: "30s" },
            ],
            gracefulRampDown: "30s",
            exec: "imported_HAR",
        },
    },
};

export function imported_HAR() {
    let response;

    const vars = {};

    group("Login and order - https://pizza.braden-bledsoe.click/", function () {
        // Login
        response = http.put(
            "https://pizza-service.braden-bledsoe.click/api/auth",
            '{"email":"a@jwt.com","password":"admin"}',
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );
        if (
            !check(response, {
                "status equals 200": (response) =>
                    response.status.toString() === "200",
            })
        ) {
            console.log(response.body);
            fail("Login was *not* 200");
        }

        vars.authToken = response.json().token;

        sleep(22);

        // Get Menu
        response = http.get(
            "https://pizza-service.braden-bledsoe.click/api/order/menu",
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: `Bearer ${vars.authToken}`,
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );

        // Get Franchises
        response = http.get(
            "https://pizza-service.braden-bledsoe.click/api/franchise?page=0&limit=20&name=*",
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: `Bearer ${vars.authToken}`,
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );
        sleep(8.7);

        // Get User
        response = http.get(
            "https://pizza-service.braden-bledsoe.click/api/user/me",
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: `Bearer ${vars.authToken}`,
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );
        sleep(3.7);

        // Make Order
        response = http.post(
            "https://pizza-service.braden-bledsoe.click/api/order",
            '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"1","franchiseId":1}',
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: `Bearer ${vars.authToken}`,
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );
        sleep(1.8);

        console.log("The response from ordering pizza: " + response.body);
        vars.webToken = response.json().jwt;

        // Verify Order
        response = http.post(
            "https://pizza-factory.cs329.click/api/order/verify",
            JSON.stringify({ jwt: vars.webToken }),
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: `Bearer ${vars.authToken}`,
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    origin: "https://pizza.braden-bledsoe.click",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"Windows"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                    "sec-fetch-storage-access": "active",
                },
            }
        );
    });
}
