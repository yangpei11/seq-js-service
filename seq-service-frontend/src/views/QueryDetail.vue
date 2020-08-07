<template>
  <div>
    <h2>Query {{queryStatus.queryId}}</h2>
    Status: {{queryStatus.status}}
    <Progress :percent="queryStatus.rate*100"  />
    <TaskDesc :taskDesc="queryStatus.taskDesc"></TaskDesc>
    <Table :columns="taskCols" :data="queryStatus.taskStatus">

      <template slot-scope="{ row }" slot="startTime">
        {{formatTime(row.status.startTime)}}
      </template>
      <template slot-scope="{ row }" slot="runTime">
        {{formatTime(row.status.runTime)}}
      </template>
      <template slot-scope="{ row }" slot="finishTime">
        {{formatTime(row.status.finishTime)}}
      </template>
      <template slot-scope="{ row }" slot="failTime">
        {{formatTime(row.status.failTime)}}
      </template>
      <template slot-scope="{ row }" slot="status">
        {{getStatus(row.status)}}
      </template>

    </Table>
  </div>
</template>

<script>
import axios from 'axios'
import TaskDesc from '../components/TaskDesc.vue'
export default {
  props: {
    queryId: String
  },
  components: {
    TaskDesc
  },
  methods: {
    formatTime(timestamp){
     // debugger
     if(timestamp == undefined){
     return ""
     }
      var date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
       var Y = date.getFullYear() + '-';
       var  M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
       var  D = date.getDate() + ' ';
       var  h = date.getHours() + ':';
       var  m = date.getMinutes() + ':';
       var  s = date.getSeconds();
       return Y+M+D+h+m+s;
    },

    getStatus(status){
      if(status.failTime != undefined){
        return "失败"
      }
      else if(status.finishTime != undefined){
        return "已完成"
      }
      else if(status.runTime != undefined){
        return "运行中"
      }
      else{
        return "等待中"
      }
    }
  },

  data () {
    return {
      queryStatus: {},
      taskCols: [
        {
          title: 'TASK EXEC ID',
          key: 'id'
        }, {
          title: '提交时间',
          slot: 'startTime'
        }, {
          title: '开始运行时间',
          slot: 'runTime'
        }, {
          title: '结束时间',
          slot: 'finishTime'
        }, {
          title: '运行失败时间',
          slot: 'failTime'
        }, {
          title: '运行的机器IP',
          key: 'ip'
        }, {
           title: '状态',
           slot: 'status'
        }, {
           title: '输入文件名',
           key: 'inputFile'
        }, {
           title: '输出文件名',
           key: 'outputFile'
        }]
    }
  },
  mounted () {
    axios.request({
      method: 'GET',
      url: '/api/queryStatus',
      params: {
        queryId: this.queryId
      }
    }).then( res => {
      console.log(res)
      let status = res.data
      this.queryStatus = status
    })
  }
}
</script>

<style>

</style>
