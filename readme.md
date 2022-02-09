# RWXML Language Server

provides various IDE functionalities, as VSCode Extension

## fetures

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

## Install

[VSCode Marketplace (Click)](https://marketplace.visualstudio.com/items?itemName=madeline.rwxml-lang-serv)

## default resource path

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

unfortunately, using a different path is not possible (not implemented yet).
you have to copy the required resources to those paths.
