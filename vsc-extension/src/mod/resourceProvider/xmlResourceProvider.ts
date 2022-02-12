import { Mod } from "../mod";
import { XMLResource } from "./resource";
import { ResourceProvider } from "./resourceProvider";

export class XMLResourceProvider implements ResourceProvider {
  getResource(mod: Mod, uri: string): Promise<XMLResource[]> {
    throw new Error("Method not implemented.")
  }
  getResources(mod: Mod): Promise<XMLResource[]> {
    throw new Error("Method not implemented.")
  }
}