<style scoped>
  .root-folders {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: unset;
    flex-direction: column;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .title {
    color: white;
  }
  .paths {
    margin-top: 10px;
  }
  .folder-add {
    
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  .path {
    overflow-y: hidden;
    overflow-x: auto;
    background-color: var(--vscode-textBlockQuote-background);
    color: var(--vscode-foreground);
    border: var(--vscode-textBlockQuote-border);
  }
  .folder-remove {
    margin-left: 14px;
  }
</style>

<template lang="pug">
  .root-folders
    .header
      h3.title {{ title }}
      button.folder-add(type="button" @click="$emit('addFolder')") ADD
    .paths
      div.row(v-for="(path, i) in paths")
        .path {{ path }}
        button.folder-remove(icon="el-icon-folder-remove" @click="remove(i)") X
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
export default Vue.extend({
  model: {
    prop: 'paths',
    event: 'change'
  },
  props: {
    paths: {
      type: Array as PropType<string[]>,
      required: true
    },
    title: {
      type: String
    }
  },

  methods: {
    remove(i: number): void {
      this.$emit('change', this.paths.filter((_, index) => index != i))
    }
  }
})
</script>
