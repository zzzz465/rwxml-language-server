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
import Vue from "vue";
import "vuex";
import "vue-router";
import ConfigPanel from "./components/ConfigPanel.vue";
import { route } from '@interop/message'

export default Vue.extend({
  name: "App",
  components: {
    ConfigPanel,
  },
  data() {
    const handler: EventListener = ({ data }) => {
      if (data.type === 'route') {
        this.$router.push(data.path)
      }
    }
    this.$addEventHandler(handler)
    return { handler }
  },
  beforeDestroy() {
    this.$removeEventHandler(this.handler)
  },
  mounted() {
    this.$vscode.postMessage({
      type: 'route', path: '', requestId: ''
    } as route)
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
