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
      Config(v-model="config.folders['new-version']")
      //- div(v-for="(item, key) in config.folders")
        //- .folder-header
          //- Config(v-model="config.folders[key]")
        
    .save-section
      button.save(@click="save") Save
</template>

<script lang="ts">
import Vue from 'vue'
// @ts-ignore
import Config from './Config.vue'
import { } from '../vscode'
import { Data } from './IConfig'

export default Vue.extend({
  components: {
    Config
  },
  data() {
    return {
      config: {
        folders: {} as Record<string, Data> // version - config
      }
    }
  },
  beforeMount() {
    this.config.folders['new-version'] = {
        About: undefined,
        DefReferences: [],
        AssemblyReferences: [],
        Assemblies: undefined,
        Defs: undefined,
        Textures: undefined,
        Sounds: undefined,
        Patches: undefined
      }
  }, 
  mounted() {
    this.$window.addEventListener('message', (event: any) => {
      switch (event.data.type) {
        case 'getConfigRespond':
          this.handleConfigRespond(event.data)
          break
      }
    })
    this.$vscode.postMessage({ type: 'getConfig' })
  },
  methods: {
    handleConfigRespond(data: any): void {
      console.log('(handleConfigRespond)received data')
      console.log(data) 
      if (!data.config.folders)
        data.config.folders = {}
    },
    addFolder(): void {
      if (this.config.folders['new-version']) {
        this.$vscode.postMessage({
          type: 'alert',
          text: 'duplication'
        })
        return
      }

      this.config.folders['new-version'] = {
        About: undefined,
        DefReferences: [],
        AssemblyReferences: [],
        Assemblies: undefined,
        Defs: undefined,
        Textures: undefined,
        Sounds: undefined,
        Patches: undefined
      }

      this.$forceUpdate()
    },
    save(): void {
      this.$vscode.postMessage({
        type: 'save',
        config: this.config
      })
    }
  }

})
</script>