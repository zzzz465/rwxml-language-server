## Components

- ProjectManager
  - Project
    - DefManager
    - modManager
    - rangeConverter
    - resourceManager
    - textDocumentManager
    - ...etc

## Project의 Reload

### 조건
- Dependency 추가 / 삭제
- DLL 추가 / 삭제

### 주의할 점
- 즉시 trigger 되면 안됨, async 하게 이벤트가 발생함

### Reload 시 해야 하는 작업
1. Dependency Request
2. DefManager Reload
3. Re-parse documents

현재 dependencyModsChange 가 있고, typeInfoChanged 이벤트가 있는데
둘다 한가지 작업만 수행하도록 통일시키자.

1. 두 이벤트가 발생했을 경우, 일단 request 보냄
2. dependency 가 도착할 경우, reload 수행
