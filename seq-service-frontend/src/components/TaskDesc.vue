<template>
  <div>
    <!-- Hello {{taskDesc}} -->
    <Table :columns="taskDescCols" :data="taskDescList">
    </Table>
  </div>
</template>

<script>
export default {
  props: {
    taskDesc: Object
  },
  methods: {
    toList: function (taskDesc) {
      if(taskDesc == undefined) {
        return []
      }
      let cols = ['input','output','seqJs','constantArg','filter']
      let taskDescList = []
      cols.forEach(col => {
        taskDescList.push({
          key: col,
          val: taskDesc[col]
        })
      })
      return taskDescList
    }
  },
  data () {
    // debugger
    return {
      taskDescCols: [
        {
              title: 'Prop',
              key: 'key',
              align: 'right',
              className: 'prop'
        },
        {
              title: 'Value',
              key: 'val'
        }
      ],
      taskDescList: this.toList(this.taskDesc)
    }
  },
  watch : {
    taskDesc: function() {
      this.taskDescList = this.toList(this.taskDesc)
    }
  }
}
</script>

<style>

</style>
