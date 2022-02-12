import { Mod } from "..";
import { Resource } from "./resource";

export interface ResourceProvider<T extends Resource> {
  getResource(mod: Mod, uri: string): Promise<T[]>
  getResources(mod: Mod): Promise<T[]>
}