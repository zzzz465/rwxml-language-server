# RWXML Language Server

provides various IDE functionalities, as VSCode Extension

## Install (if you're using vscode first time?)

[Check how-to](docs/how-to.md)

## FAQ

[Check FAQ](docs/FAQ.md)

## features

- [x] Custom syntax highlighting
- [x] Basic completion snippets.
- [x] Real time code analysis.
- [x] Code Completion.
- [x] `Go to definition`, `Go to Reference` support.
- [x] Find all symbol references.
- [x] find parent / childrenss
- [x] Symbol rename command.
- [x] Inheritance Attribute suggestion
- [x] AlienRace support
- [x] incremental update & validation
- [ ] Texture preview
- [ ] Texture path suggestion
- [ ] patch operation snippets
- [x] Cache DLL extracted data

## Commands

### `RWXML: Clear DLL Cache`

deletes all DLL extracted cache.

### `RWXML: Open Cache Directory`

opens your cache directory.

## Install

[VSCode Marketplace (Click)](https://marketplace.visualstudio.com/items?itemName=madeline.rwxml-lang-serv)

## Configuration

configures RWXML Language Server.

```jsonc
{
  "rwxml.paths.rimWorld": "C:\\...\\common\\RimWorld", // RimWorld/ Directory path.

  // overrides default path / assumed path from rimWorld
  "rwxml.paths.rimWorldData": "C:\\...\\RimWorld\\Data",
  "rwxml.paths.rimWorldManaged": "C:\\...\\RimWorld\\RimWorldWin64_Data\\Managed",
  "rwxml.paths.localMods": "C:\\...\\RimWorld\\Mods",
  "rwxml.paths.workshopMods": "C:\\...\\workshop\\contents\\294100",
  "rwxml.paths.externalMods": [
    "<other-mods-directory-1>",
    "<other-mods-directory-2>",
    // and so on...
  ],

  
  "rwxml.logs.level": "info", // set log level, "info", "warn", "error", "debug", "silly"

  "rwxml.codeHighlighting.enabled": true, // manages code highlighting. fine-grained control is not implemented yet
  
  "rwxml.diagnostics.enabled": true, // manages code diagnostics.
}
```

### Default Paths

this extension requires `RimWorld DLL`, `RimWorld Core` to operate.
it scans Workshop/Local Mod Directory to support external mods.

the path for these resources are below:

RimWorld DLL

- windows: `C:\Program files (x86)\Steam\steamapps\common\rimworld\RimWorldWin64_Data\Managed`
- darwin(macos): `Library/Application Support/Steam/steamapps/common/RimWorld/RimWorldMac.app/Contents/Resources/Data/Managed`

RimWorld Core

- windows: `C:\\Program Files (x86)\\Steam\\steamapps\\common\\RimWorld\\Data`
- darwin(macos): `Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app/Data`

Local Mod Directory

- windows: `C:\\Program Files (x86)\\Steam\\steamapps\\common\\RimWorld\\Mods`
- darwin(macos): `Library/Application Support/Steam/Steamapps/common/RimWorld/RimWorldMac.app/Mods`

Workshop Directory

- windows: `C:\\Program Files (x86)\\Steam\\steamapps\\workshop\\content\\294100`
- darwin(macos): `Library/Application Support/Steam/Steamapps/workshop/content/294100`

## Setup devlopment environment

1. clone repository locally

```bash
#!/bin/bash
git clone https://github.com/zzzz465/rwxml-language-server
```

2. install project

```bash
#!/bin/bash
# cwd: repository root
pnpm install
```

3. build project

```bash
#!/bin/bash
# cwd: repository root
pnpm run watch # this will build project and watch project changes
```

4. open `/vsc-extension` with VSCode, and launch `Launch Client`
