import { Def, Injectable } from '@rwxml/analyzer'
import { AsEnumerable } from 'linq-es2015'
import * as tsyringe from 'tsyringe'
import { DefaultDictionary } from 'typescript-collections'
import * as ls from 'vscode-languageserver'
import { Project } from '../../project'
import { ProjectManager } from '../../projectManager'
import { Provider } from '../provider'
import { DiagnosticsContributor } from './contributor'

/*
무엇이 필요할지 생각해보자.

- project 초기화(생성) 시 이벤트 등록하기 + 전체 검증하기 (debounce 필요)
- 변경점 많을 경우, diagnostics 대기한다음 첨부터 다시하기? (필요한가? 나중에?)
- 일단 defChanged 되면 그거 기반으로... 이것저것 해야하나?
- 그냥 파일 단위로 validation 을 하면 안되나? -> 문제 생길 수도 있지않나?
*/

/**
 * DiagnosticsProvider provides code diganostics.
 */
@tsyringe.injectable()
export class DiagnosticsProvider implements Provider {
  private connection?: ls.Connection = undefined

  constructor(
    private readonly projectManager: ProjectManager,
    @tsyringe.injectAll(DiagnosticsContributor.token) private readonly contributors: DiagnosticsContributor[]
  ) {}

  init(connection: ls.Connection): void {
    this.connection = connection
  }

  subscribeProject(project: Project): void {
    project.event.on('defChanged', (nodes) => this.onDefChanged(project, nodes))
  }

  private onDefChanged(project: Project, nodes: (Def | Injectable)[]): void {
    if (!this.connection) {
      throw new Error('this.connection is undefined. check DiagnosticsProvider is initialized with init()')
    }

    const grouped = AsEnumerable(nodes)
      .GroupBy((node) => node.document.uri)
      .Select((group) => ({
        key: group.key,
        values: [...group.values()],
      }))
      .ToArray()

    const diagnosticsMap: DefaultDictionary<string, ls.Diagnostic[]> = new DefaultDictionary(() => [])

    for (const { key, values } of grouped) {
      for (const contributor of this.contributors) {
        const { uri, diagnostics } = contributor.getDiagnostics(project, key, values)
        diagnosticsMap.getValue(uri).push(...diagnostics)
      }
    }

    diagnosticsMap.forEach((k, v) => {
      this.connection?.sendDiagnostics({
        uri: k,
        diagnostics: v,
      })
    })
  }
}
