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
      div(v-for="(item, key) in config.folders")
        .folder-header
          Config(@update="(data) => updateFolders(key, data)" :version="key" :data="config.folders[key]")
    .update
      button(@click="save") Save
</template>

<script lang="ts">
import { alert, config, saveConfig } from '@interop/message'
import Vue from 'vue'
import Config from './Config.vue'

function isValidConfig(obj: any): boolean {
  if (typeof obj === 'object') {
    if (obj['folders'])
      return true
  }

  return false
}

export default Vue.extend({
  components: {
    Config
  },
  data() {
    return {
      config: {
        folders: {} as Record<string, any>
      },
      handler: undefined as EventListener | undefined
    }
  },
  beforeMount() {
    const handler: EventListener = ({ data }) => {
      if (data.type === 'config') {
        if (isValidConfig(data.data))
          this.config = data.data
      }
    }
    this.$addEventHandler(handler)
    this.handler = handler

    this.$vscode.postMessage({
      type: 'config', data: null, requestId: ''
    } as config)
  },
  beforeDestroy() {
    this.$removeEventHandler(this.handler)
  },
  methods: {
    addFolder(): void {
      if (this.config.folders['new-version']) { // if temp folder is already exist
        this.$vscode.postMessage({
          type: 'alert',
          text: 'duplication'
        } as alert)
      } else {
        this.updateFolders('new-version', {
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
    updateFolders(key: string, data: any): void {
      // because dynamically added objects are not reactive.
      this.$set(this.config.folders, key, data)
    },
    save() {
      this.$vscode.postMessage({
        type: 'saveConfig',
        data: this.config
      } as saveConfig)
    }
  }

})
</script>