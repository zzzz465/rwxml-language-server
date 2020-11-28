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
          input.input(v-model="data.About")
          button(type="button" @click="openFileDialog('About', false, true, false)") browse
      .entry.Assemblies
        h3.title Assemblies folder
        .path 
          input.input(v-model="data.Assemblies")
          button(type="button" @click="openFileDialog('Assemblies', false, true, false)") browse
      .entry.Defs
        h3.title Defs folder
        .path
          input.input(v-model="data.Defs")
          button(type="button" @click="openFileDialog('Defs', false, true, false)") browse
      .entry.Textures
        h3.title Textures folder
        .path
          input.input(v-model="data.Textures")
          button(type="button" @click="openFileDialog('Textures', false, true, false)") browse
      .entry.Sounds
        h3.title Sounds folder
        .path
          input.input(v-model="data.Sounds")
          button(type="button" @click="openFileDialog('Sounds', false, true, false)") browse
      .entry.Patches
        h3.title Patches folder
        .path
          input.input(v-model="data.Patches")
          button(type="button" @click="openFileDialog('Patches', false, true, false)") browse
      .entry.DefReferences
        Folders(
          v-model="data.DefReferences" title="Def References"
          @addFolder="openFileDialog('DefReferences', false, true, true)")
      .entry.AssemblyReferences
        Folders(
          v-model="data.AssemblyReferences" title="Assembly References"
          @addFolder="openFileDialog('AssemblyReferences', false, true, true)")
</template>

<script lang="ts">

import { OpenDialogOptions } from "vscode"
import Vue, { PropType } from "vue"
import Router from "vue-router"
import 'vuex'
import { } from '../vscode'
// @ts-ignore
import Folders from './folders.vue'
// @ts-ignore
import { Data } from './IConfig'

export default Vue.extend({
  model: {
    prop: 'data',
    event: 'change'
  },
  components: {
    Folders
  },
  props: {
    data: {
      type: Object as PropType<Data>,
      required: true
    }
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
      this.$vscode.postMessage({ type: 'openDialog', entry, options })
      this.openDialogRespond({
        entry: 'DefReferences',
        paths: [
          'asdf',
          'asdf2'
        ]
      })
    },

    openDialogRespond (event: any): void {
      const newData: any = { ...this.data }
      if (event.entry === 'DefReferences' || event.entry === 'AssemblyReferences')
        newData[event.entry] = event.paths
      else
        newData[event.entry] = event.paths.length > 0 ? event.paths[0] : ''
      console.log(newData)
      this.$emit('change', newData)
    }
  }
});
</script>