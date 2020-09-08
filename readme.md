# rwxml language server
Language Server implementation for rimworld xml modding  
![preview](./Images/gif1.gif)

## Installation
install via vscode marketspace

## Getting started

you have to put `rwconfigrc.json` in the root directory of your mod.  
note that only one config file is allowed in the entire project file.

### Config file schema
```json5
{
	"folders": {
		"1.1": { // 1.1 mod
			"About": "path/to/def", // absoulte or relative path
			"Defs": "C:/path/to/mod/def", // note that you should replace "\\" to "/"
			"DefReferences": [ // refernece to core, or other dependency mods.
				"absolute/path/to/def", 
				"realtive/path/to/def"
      ],
			"AssemblyReferences": [ // referencing dll files to extract typeInfos.
				"absoulte/path/to/Rimworld/Assembly-CSharp.dll", // use absolute path
				"relative/path/to/your/assemblies/my-assembly.dll", // use relative path
				"path/to/folder/loadall" // take all dlls from given path
			]
		},
		"1.2" : { // 1.2 mod
			// ...
		}
	}
}
```

you can use absolute or relative path.  
rwconfigrc.json will be an anchor to resolve relative path.

# TO-DO features
- [x] XML Node tag suggestion
- [x] dynamic type extraction
- [x] Inheritance Attribute suggestion
- [x] AlienRace / Garam support
- [x] text decoration
- [ ] codelens functionality
- [ ] Texture preview
- [ ] Texture path suggestion
- [ ] find parent / childrens
- [ ] Rename defName / Name in all files
- [ ] patch operation snippets

# Validation

- [x] Def reference validation
- [x] invalid (typo) / duplicate node validation
- [ ] primitive value validation
- [ ] whitespace error validation
- [ ] Texture path validation
... and more!  

# Documentation

TODO

## but why? - motivations, etc...

As the limitation of xml modding, most modders have similar problems.  
Searching defs, open decompiler and read what field the class have,  
use time figuring out what this node does, continuously re-open the game just to find typo...  
these things make modding difficult, **which can be avoided.**


# Development
### Prerequisites
1. node.js
2. dotnet Core

### Setup
```
git clone https://github.com/zzzz465/rwxml-language-server
npm install
```