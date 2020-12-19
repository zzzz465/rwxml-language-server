<style scoped>
  .root-ConfigPanel {
    width: 720px;
    margin-left: auto;
    margin-right: auto;
  }
  .folder-section {

  }
  .header {
    display: flex;
    justify-content: space-between;
  }
  .save-section {
    display: flex;
    justify-content: flex-end;
  }
  .save {
    margin-left: auto;
  }
</style>

<template lang="pug">
  .root-ConfigPanel
    h3 RWXML configuration
    .folder-section
      .header
        h4 folders
        button(@click="addFolder") add folder
      div(v-for="(item, key) in folders")
        .folder-header
          Config(@update="(data) => onUpdate(key, data)" :version="key" :data="folders[key]")
    .update
      button(@click="save") Save
</template>

<script lang="ts">
import Vue from 'vue'
// @ts-ignore
import Config from './Config.vue'
import { } from '../vscode'
// @ts-ignore
import { Data } from './IConfig'
import Vuex from 'vuex'

export default Vue.extend({
  components: {
    Config
  },
  watch: {
    '$store.state.data': function (): void {
      this.folders = this.$store.state.data.folders || {}
    }
  },
  data() {
    return {
      folders: {} as Record<string, any>
    }
  },
  methods: {
    addFolder(): void {
      if (this.folders['new-version']) { // if temp folder is already exist
        this.$vscode.postMessage({
          type: 'alert',
          text: 'duplication'
        })
      } else {
        this.onUpdate('new-version', {
          About: "",
          DefReferences: [],
          AssemblyReferences: [],
          Assemblies: "",
          Defs: "",
          Textures: "",
          Sounds: "",
          Patches: ""
        })
      }
    },
    onUpdate(key: string, data: any): void {
      const newObj = { ...this.folders }
      newObj[key] = data
      this.folders = newObj
      this.$store.commit('updateFolder', newObj)
    },
    save() {
      this.$vscode.postMessage({
        type: 'save',
        config: this.$store.state.data
      })
    }
  }

})
</script>