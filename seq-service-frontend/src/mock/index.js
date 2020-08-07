import Mock from 'mockjs'

var getAllQueries = function ({ url, type, body }) {
  return {
    "status": [
        {
            "queryId": "ac735f10-ef13-11e9-9bba-730ccbc49ed2",
            "status": "RUNNING",
            "taskDesc": {
                "input": "/tmp/analysis/tmp_for_yangpei/4gz",
                "output": "output",
                "seqJs": "http://hd020:18080/jsCode?id=match_seqs_v3_js",
                "constantArg": "http://hd020:18080/snippet/slow3",
                "filter": "row.first_day >= '2018-12-01' && row.first_day <= '2018-12-04'"
            },
            "taskStatus": [
                {
                    "id": "ac735f11-ef13-11e9-9bba-730ccbc49ed2",
                    "status": {
                        "startTime": 1571120338817,
                        "runTime": 1571120338817,
                        "finishTime": 1571120517133
                    },
                    "ip": "10.168.17.55"
                },
                {
                    "id": "ac735f12-ef13-11e9-9bba-730ccbc49ed2",
                    "status": {
                        "startTime": 1571120338817,
                        "runTime": 1571120338903
                    },
                    "ip": "10.168.17.55"
                },
                {
                    "id": "ac735f13-ef13-11e9-9bba-730ccbc49ed2",
                    "status": {
                        "startTime": 1571120338817,
                        "runTime": 1571120338987,
                        "finishTime": 1571120497128
                    },
                    "ip": "10.168.17.55"
                },
                {
                    "id": "ac735f14-ef13-11e9-9bba-730ccbc49ed2",
                    "status": {
                        "startTime": 1571120338817,
                        "runTime": 1571120339001,
                        "finishTime": 1571120395131
                    },
                    "ip": "10.168.17.55"
                }
            ]
        }
    ]
}
}

var getQueryStatus = function ({ url, type, body }) {
  return {
    "queryId": "886956a0-ef14-11e9-9bba-730ccbc49ed2",
    "status": "SUCCEEDED",
    "message": "",
    "taskDesc": {
        "input": "/tmp/analysis/tmp_for_yangpei/4gz",
        "output": "output",
        "seqJs": "http://hd020:18080/jsCode?id=match_seqs_v3_js",
        "constantArg": "http://hd020:18080/snippet/slow3",
        "filter": "row.first_day >= '2018-12-01' && row.first_day <= '2018-12-04'"
    },
    "taskStatus": [
        {
            "id": "886956a1-ef14-11e9-9bba-730ccbc49ed2",
            "status": {
                "startTime": 1571120707850,
                "runTime": 1571120707850,
                "finishTime": 1571120872081
            },
            "ip": "10.168.17.55"
        },
        {
            "id": "886956a2-ef14-11e9-9bba-730ccbc49ed2",
            "status": {
                "startTime": 1571120707850,
                "runTime": 1571120707869,
                "finishTime": 1571120846943
            },
            "ip": "10.168.17.55"
        },
        {
            "id": "886956a3-ef14-11e9-9bba-730ccbc49ed2",
            "status": {
                "startTime": 1571120707850,
                "runTime": 1571120707887,
                "finishTime": 1571120820287
            },
            "ip": "10.168.17.55"
        },
        {
            "id": "886956a4-ef14-11e9-9bba-730ccbc49ed2",
            "status": {
                "startTime": 1571120707850,
                "runTime": 1571120707913,
                "failTime":1571120764759
            },
            "ip": "10.168.17.55"
        }
    ]
}
}

// 如果是集成测试，可以将mock设置为false，并修改vue.config.js中BACKEND_SERVER的配置为后端服务的地址
let mock = false
if (mock) {
  Mock.mock(/\/api\/all-queries/, 'get', getAllQueries)
  Mock.mock(/\/api\/queryStatus/, 'get', getQueryStatus)
}
