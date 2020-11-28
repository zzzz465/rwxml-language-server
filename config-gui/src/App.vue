<template lang="pug">
  div
    router-view
</template>

<style>
  button {
    color: var(--vscode-button-foreground);
    background-color: var(--vscode-button-background);
    border: var(--vscode-button-border);
  }
  button:hover {
    background-color: var(--vscode-button-hoverBackground);
  }
</style>

<script lang="ts">
import Vue from "vue"
import 'vuex'
import 'vue-router'

export default Vue.extend({
  name: "App",
  computed: {
    route(): string {
      return this.$store.state.path
    }
  },
  watch: {
    route(val) {
      console.log(`router watched!! val: ${val}`)
      this.$router.push(val)
    }
  },
  mounted() {
    this.$router.push(this.$store.state.path)
  }
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
