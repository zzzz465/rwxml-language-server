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
      button.folder-add(type="button" @click="openFileDialog") ADD
    .paths
      div.row(v-for="(path, i) in paths")
        .path {{ path }}
        button.folder-remove(icon="el-icon-folder-remove" @click="remove(i)") X
</template>

<script lang="ts">
import { OpenDialogOptions } from 'vscode'
import Vue, { PropType } from 'vue'
import { } from '../vscode'
import _ from 'lodash'

export default Vue.extend({
  props: {
    paths: {
      type: Array as PropType<string[]>,
      required: true
    },
    title: { type: String, required: true },
    version: { type: String, required: true }
  },
  data() {
    return { requestId: '' }
  },
  mounted() {
    this.requestId = `${this.version}/${this.title}`
    this.$window.addEventListener('message', (event: any) => {
      switch(event.data.type) {
        case 'openDialogRespond':
          this.openDialogRespond(event.data)
          break
      }
    })
  },
  methods: {
    openFileDialog(): void {
      const options: OpenDialogOptions = {
        defaultUri: undefined,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: true
      }
      this.$vscode.postMessage({ type: 'openDialog', requestId: this.requestId, options })

      // this.openDialogRespond({
        // requestId: this.requestId,
      // })
    },
    openDialogRespond (message: any): void { // paths: Array<string>
      if (message.requestId === this.requestId) {
        const newData = _.union(message.paths, this.paths)
        this.$emit('update', newData)

        // debug
        console.log(`add ${message.paths.length} paths to ${this.title}`)
      }
    },
    remove(i: number): void {
      this.$emit('update', this.paths.filter((_, index) => index != i))
    }
  }
})
</script>
