<style scoped>

</style>

<template lang="pug">
  .root
    .categories
      .category(v-for="item in categories")
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      categories: []
    }
  }
})
</script>