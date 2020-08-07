<template>
  <div>
    <h1>新增</h1>
    input<input v-model="input"/><br/><br/>
    output<input v-model="output"/><br/><br/>
    seqJs<input v-model="seqJs"/><br/><br/>
    constantArg<input v-model="constantArg"/><br/><br/>
    filter<input v-model="filter"/><br/><br/>
    <!-- 换用iview 控件 -->
    <!-- <input type="button" value="提交" @click="submit"/> -->
    <Button @click="submit">提交</Button>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data () {
    return {
      input: '',
      output: '',
      seqJs:'',
      constantArg:'',
      filter:''
    }
  },
  methods: {
    submit () {
      // 演示调试手段
      // debugger // eslint-disable-line
      // let o = {a:{b:1, c:2}, d:'hello'}
      // console.log(o)
      axios.request({
        method: 'POST',
        url: '/api/run-seqjs',
        headers: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          input: this.input,
          output:this.output,
          seqJs: this.seqJs,
          constantArg: this.constantArg,
          filter:this.filter
        })
      }).then((res) => {
        // 200
        // 换用iview组件
        // alert('新增成功!')
        this.$Modal.success({
          title: '消息',
          content: '任务提交成功!',
          onOk: () => {
            this.input = ''
            this.output = ''
            this.seqJs = ''
            this.constantArg = ''
            this.filter = ''
          }
        })
      }).catch((err) => {
        // 换用iview组件
        // alert('失败：' + err)
        this.$Modal.error({
          title: '消息',
          content: '失败：' + err,
          onOk: () => {
            this.input = ''
            this.output = ''
            this.seqJs = ''
            this.constantArg = ''
            this.filter = ''
          }
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
