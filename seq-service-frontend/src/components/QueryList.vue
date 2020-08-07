<template>
  <div  class="query-list">
    <Table :columns="queryWorkers" :data="workersData">
      <template slot-scope="{ row }" slot="IP">{{row.IP}}</template>
      <template slot-scope="{ row }" slot="availableNumber">{{row.availableNumber}}</template>
    </Table>
    <Table :columns="queryCols" :data="queriesData">
      <template slot-scope="{ row }" slot="queryId">
        <router-link
          :to="{name: 'query-detail', query: { queryId: row.queryId}}"
          :data="{queryId: row.queryId}"
        >{{row.queryId}}</router-link>
      </template>
      <template slot-scope="{ row }" slot="desc">
        <!--Table :columns="taskDescCols" :data="row.taskDescList">
        </Table-->
        <TaskDesc :taskDesc="row.taskDesc"></TaskDesc>
      </template>
    </Table>

  </div>
</template>


<script>
import axios from "axios";
import TaskDesc from "./TaskDesc.vue";
export default {
  components: {
    TaskDesc
  },
  name: "HelloWorld",
  props: {
    msg: String
  },
  methods: {
    rowClassName(row, index) {
      return this.getColorClass(row.status);
    },
    getColorClass(status) {
      // debugger
      if (status === "SUCCESS") {
        return "success";
      } else if (status === "ERROR") {
        return "error";
      } else if (status === "RUNNING") {
        return "running";
      }
      return "other";
    }
  },
  mounted() {
    axios
      .request({
        url: "/api/all-queries"
      })
      .then(res => {
        console.log(res);
        //console.log(123123123);
        let list = res.data.status.reverse();
        list.forEach(x => {
          //debugger
          x.taskDescList = [];
          x.cellClassName = {
            status: this.getColorClass(x.status)
          };
        });
        console.log(list)
        this.queriesData = list;
      });

      axios
      .request({
        url: "/api/workers"
      })
      .then(res => {
        console.log(res);
        let list = res.data.freeWorker
        console.log(list);
        this.workersData = list;
      });
  },

  data() {
    return {
      queryCols: [
        {
          title: "Query ID",
          slot: "queryId"
        },
        {
          title: "Status",
          key: "status"
        },
        {
          title: "Descrition",
          slot: "desc"
        }
      ],
      queriesData: [],
      queryWorkers: [
        {
          title: "freeWorkerIP",
          slot: "IP"
        },
        {
          title: "available_num",
          slot: "availableNumber"
        }
      ],
      workersData:[]
    };

  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

<style>
.ivu-table td.running {
  background-color: yellow;
}

.error {
  background-color: red;
}
.success {
  background-color: green;
}
.prop {
  font-weight: bold;
}
</style>
