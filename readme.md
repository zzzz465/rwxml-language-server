# rwxml language server
Language Server implementation for rimworld xml modding  
![preview](./Images/gif1.gif)

## but why?

As the limitation of xml modding, most modders have similar problems.  
Searching defs, open decompiler and read what field the class have,  
use time figuring out what this node does, continuously re-open the game just to find typo...  
these things make modding difficult, ** which can be avoided. **

## Installation
install via vscode marketspace

## Getting started

you have to put `rwconfigrc.json` in the root directory of your mod.  

config file schema
```json
{
	"folders": {
		"1.1": { // 1.1 mod
			"About": "path/to/def", // absoulte or relative path
			"Defs": "C:/path/to/mod/def", // note that you should replace "\\" to "/"
			"DefReferences": [ // refernece to core, or other dependency mods.
				"absolute/path/to/def", "realtive/path/to/def"
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

# features

- [ ] XML Node tag suggestion
- [ ] Inheritance Attribute suggestion
- [ ] Texture preview
- [ ] Texture path suggestion
- [ ] Rename defName / Name in all files
- [ ] find parent / childrens
- [ ] AlienRace / Garam support

# Validation

- [ ] Def reference validation
- [ ] primitive value validation
- [ ] invalid (typo) / duplicate node validation
- [ ] whitespace error validation
- [ ] Texture path validation
# Documentation

we're looking for peoples to contribute documentation!
any pull request are welcome.

# Contribution
any pull request are welcome!  
// TODO - complete readme.md