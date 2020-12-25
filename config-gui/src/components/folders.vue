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
import Vue, { PropType } from 'vue'
import _ from 'lodash'
import { openDialog, OpenDialogOptions, openDialogRespond } from '@interop/message'

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
    return { requestId: '', handler: undefined as EventListener | undefined }
  },
  mounted() {
    this.requestId = `${this.version}/${this.title}`
    const handler: EventListener = ({ data }) => {
      if (data.type === 'openDialogRespond') {
        this.openDialogRespond(data)
      }
    }

    this.$addEventHandler(handler)
    this.handler = handler
  },
  beforeDestroy() {
    this.$removeEventHandler(this.handler)
  },
  methods: {
    openFileDialog(): void {
      this.$vscode.postMessage({
        type: 'openDialog',
        entry: '',
        options: {
          defaultUri: undefined,
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: true
        },
        requestId: this.requestId
      } as openDialog)
    },
    openDialogRespond (message: openDialogRespond): void { // paths: Array<string>
      if (message.requestId === this.requestId) {
        const newData = _.union(message.uris, this.paths)
        this.$emit('update', newData)

        // debug
        console.log(`add ${message.uris.length} paths to ${this.title}`)
      }
    },
    remove(i: number): void {
      this.$emit('update', this.paths.filter((_, index) => index != i))
    }
  }
})
</script>
