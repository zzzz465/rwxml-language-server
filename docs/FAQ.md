
# FAQ

## What is `metadata_rwxml.xml` ?

`metadata_rwxml.xml` is a optional file placed under `About/` directory.  
it's used to get additional data that this extension cannot get from `About.xml`.  
this file is optional. add this file if you using `MayRequire="<packageId>"` attribute.

The full example of `metadata_rwxml.xml` is below.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Metadata>
    <default> <!-- default option if no item is found for a version in "versions" -->
        <modDependency>
            <optional> <!-- <optional> mark any optional mod dependencies to be loaded. eg: MayRequire="Ludeon.RimWorld.Royalty" -->
                <li>
                    <packageId>erdelf.HumanoidAlienRaces</packageId>
                </li>
                <li>
                    <packageId>Ludeon.RimWorld.Royalty</packageId>
                </li>
                <li>
                    <packageId>Ludeon.RimWorld.Ideology</packageId>
                </li>
                <li>
                    <packageId>Smuffle.HarvestOrgansPostMortem</packageId>
                </li>
            </optional>
        </modDependency>
    </default>
    <versions> <!-- option for a specific version. v1.0, v1.1, v1.2, v1.3, ... and so on. -->
        <v1.3>
            <modDependency>
                <optional>
                    <li>
                        <packageId>other.version.specific.package.names</packageId>
                    </li>
                </optional>
            </modDependency>
        </v1.3>
    </versions>
</Metadata>
```

place the `metadata_rwxml.xml` next to your `about.xml` in your mod project.

## Optional Dependencies are not found

if you're using attribute `MayRequire="<packageId>"`, you have to make add that mod to a metadata file.  
see the detailed description [metadata_rwxml.xml guide](#what-is-metadata_rwxml.xml)  
