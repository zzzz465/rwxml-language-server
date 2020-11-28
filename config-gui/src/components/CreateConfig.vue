<style scoped>
  .root {
    display: flex;
    align-items: center;
    flex-direction: column;
  }
  .entry {
    display: flex;
  }
</style>

<template lang="pug">
  .root
    .entry.About
      .title About folder
      .path {{ About }}
      .browse
        button(type="button" @click="openFileDialog('About', false, true, false)") ...
    .entry.Assemblies
      .title Assemblies folder
      .path {{ Assemblies }}
      .browse
        button(type="button" @click="openFileDialog('Assemblies', false, true, false)") ...
    .entry.Defs
      .title Defs folder
      .path {{ Defs }}
      .browse
        button(type="button" @click="openFileDialog('Defs', false, true, false)") ...
    .entry.Textures
      .title Textures folder
      .path {{ Textures }}
      .browse
        button(type="button" @click="openFileDialog('Textures', false, true, false)") ...
    .entry.Sounds
      .title Sounds folder
      .path {{ Sounds }}
      .browse
        button(type="button" @click="openFileDialog('Sounds', false, true, false)") ...
    .entry.Patches
      .title Patches folder
      .path {{ Patches }}
      .browse
        button(type="button" @click="openFileDialog('Patches', false, true, false)") ...
    .entry.DefReferences
      .title Def References
      .path {{ DefReferences }}
      .browse
        button(type="button" @click="openFileDialog('DefReferences', false, true, true)") ...
    .entry.AssemblyReferences
      .title Assembly References
      .path {{ AssemblyReferences }}
      .browse
        button(type="button" @click="openFileDialog('AssemblyReferences', false, true, true)") ...
</template>

<script lang="ts">
// array 일 경우는, 추가 삭제를 할수있도록 해주자
// 기본은 추가고, 삭제 버튼을 추가

import { OpenDialogOptions } from "vscode"
import Vue from "vue"
import Router from "vue-router"
import {  } from '../vscode'

export default Vue.extend({
  data() {
    return {
      About: undefined as string | undefined,
      Assemblies: undefined as string | undefined,
      Defs: undefined as string | undefined,
      Textures: undefined as string | undefined,
      Sounds: undefined as string | undefined,
      Patches: undefined as string | undefined,
      DefReferences: [] as string[],
      AssemblyReferences: [] as string[]
    }
  },
  mounted() {
    const data = this.$store.state.data
    Object.assign(this.$data, data)

    this.$window.addEventListener('message', (event: any) => {
      switch(event.data.type) {
        case 'openDialogRespond':
          this.openDialogRespond(event.data)
          break
      }
    })

    if (process.env.NODE_ENV !== 'production') {
      this.About = 'C:/Asdf/ASDF/ASDF'
      this.AssemblyReferences = [
        'C:/Asdf/ASDF/ASDF',
        'C:/Asdf/ASDF/ASDF',
        'C:/Asdf/ASDF/ASDF',
        'C:/Asdf/ASDF/ASDF',
        'C:/Asdf/ASDF/ASDF',
        'C:/Asdf/ASDF/ASDF'
      ]
    }
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
    },

    openDialogRespond (event: any): void {
      if (event.paths)
        this.$data[event.entry] = event.paths
    }
  }
});
</script>