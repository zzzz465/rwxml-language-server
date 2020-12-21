<style scoped>
  .root {
    padding-top: 50px;
    width: 720px;
    margin-left: auto;
    margin-right: auto;
    color: var(--vscode-editor-background);
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    padding-bottom: 50px;
  }
  .debug {
    /* DEBUG-ONLY */
    background-color: RGB(80, 80, 80);
  }
  .entries {
    width: 80%;
    display: flex;
    align-items: center;
    flex-direction: column;
  }
  .entry {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    align-items: left;
    flex-direction: column;
  }
  .paths {
    margin-left: 20px;
    margin-right: 10px;
    margin-top: 10px;
  }
  .AssemblyReferences {
    flex-direction: column;
    align-items: unset;
  }
  .path {
    display: flex;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    margin-left: 10px;
  }
  h3 {
    margin-top: 0px;
  }
  .folder-add {
    margin-right: 10px; /* .paths 와 margin right을 맞춰주기 위함 */
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }
  .title {
    color: white;
  }
  .input {
    width: 100%;
    margin-left: 0px;
    margin-right: 20px;
    color: var(--vscode-input-foreground);
    background-color: var(--vscode-input-background);
    border: var(--vscode-input-border);
  }
  .apply {
    width: 80%;
    display: flex;
    justify-content: flex-end;
  }
</style>

<template lang="pug">
  .root(:class={ debug: process.env.NODE_ENV !== 'production' })
    .entries
      .entry.About
        h3.title About folder
        .path
          input.input(v-model="data.About" readonly)
          button(type="button" @click="openFileDialog('About', false, true, false)") browse
      .entry.Assemblies
        h3.title Assemblies folder
        .path 
          input.input(v-model="data.Assemblies" readonly)
          button(type="button" @click="openFileDialog('Assemblies', false, true, false)") browse
      .entry.Defs
        h3.title Defs folder
        .path
          input.input(v-model="data.Defs" readonly)
          button(type="button" @click="openFileDialog('Defs', false, true, false)") browse
      .entry.Textures
        h3.title Textures folder
        .path
          input.input(v-model="data.Textures" readonly)
          button(type="button" @click="openFileDialog('Textures', false, true, false)") browse
      .entry.Sounds
        h3.title Sounds folder
        .path
          input.input(v-model="data.Sounds" readonly)
          button(type="button" @click="openFileDialog('Sounds', false, true, false)") browse
      .entry.Patches
        h3.title Patches folder
        .path
          input.input(v-model="data.Patches" readonly)
          button(type="button" @click="openFileDialog('Patches', false, true, false)") browse
      .entry.DefReferences
        Folders(
          :paths="data.DefReferences" title="Def References"
          :version="version" @update="(data) => emitUpdate('DefReferences', data)")
      .entry.AssemblyReferences
        Folders(
          :paths="data.AssemblyReferences" title="Assembly References"
          :version="version" @update="(data) => emitUpdate('AssemblyReferences', data)")
</template>

<script lang="ts">
import Vue, { PropType } from "vue"
import Folders from './folders.vue'
import { Data } from './IConfig'

export default Vue.extend({
  components: {
    Folders
  },
  props: {
    version: { type: String, required: true },
    data: { type: Object as PropType<Data>, required: true }
  },
  mounted() {
    this.$window.addEventListener('message', (event: any) => {
      switch(event.data.type) {
        case 'openDialogRespond':
          this.openDialogRespond(event.data)
          break
      }
    })
  },
  methods: {
    openFileDialog(entry: string, file: boolean, folder: boolean, selectMany: boolean): void {
      const options: OpenDialogOptions = {
        defaultUri: this.$data['entry'] || undefined,
        canSelectFiles: file,
        canSelectFolders: folder,
        canSelectMany: selectMany
      }
      this.$vscode.postMessage({ type: 'openDialog', requestId: this.version, entry, options })
    },
    openDialogRespond (event: any): void {
      if (event.requestId === this.version) {
        const path = event.paths.length > 0 ? event.paths[0] : ''
        console.log(event)
        this.emitUpdate(event.entry, path)
      }
    },
    emitUpdate (key: string, data: any): void {
      const newData: any = { ...this.data } // because allocating in child is not allowed.
      newData[key] = data
      this.$emit('update', newData)
    }
  }
});
</script>