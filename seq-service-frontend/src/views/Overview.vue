<template>
  <div>
    <router-link to="submit-task">提交任务</router-link>
    <QueryList></QueryList>
  </div>
</template>

<script>
import QueryList from '../components/QueryList.vue'

export default {
  components: {
    QueryList
  }
}
</script>

<style>

</style>
