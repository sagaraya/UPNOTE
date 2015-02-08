// app.vue
<style lang="less">
.red {
  color: #f00;
}
</style>

<template>
<h1 class="red">{{msg}}</h1>
</template>

<script lang="coffee">
module.exports =
  data: ->
    msg: 'Hello world!ho'
</script>
