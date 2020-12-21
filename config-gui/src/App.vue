<template lang="pug">
div
  ConfigPanel
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
import Vue from "vue";
import "vuex";
import "vue-router";
import ConfigPanel from "./components/ConfigPanel.vue";

export default Vue.extend({
  name: "App",
  components: {
    ConfigPanel,
  },
  mounted() {
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
