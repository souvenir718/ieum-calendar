# 성능/상태 관련 주의점

- **편집 가능 여부 캐시**: 월 이동은 라우트 전환이라 `CalendarClient`가 매번 재마운트된다. 매번 `/api/edit-session`을 부르지 않도록 `sessionStorage`에 60초 TTL로 캐시한다(`calendarUtils.js`의 `readEditableCache`/`writeEditableCache`). **편집 상태(`editable`)를 바꾸는 새 경로를 추가하면 반드시 `writeEditableCache`로 캐시도 갱신**해야 stale이 생기지 않는다. 현재는 `handleEditableChange`가 이 계약을 지킨다.
- **모바일 스와이프 월 이동**: `main.layout`의 `onTouchStart`/`onTouchEnd`. 가로 우세(`|dx|>|dy|*0.8`) + 최소 이동(60px)일 때만 이동하고, 멀티터치·모달 열림 중에는 무시한다. `preventDefault`를 쓰지 않아 세로 스크롤과 공존한다. 롱프레스(PIN)는 pointer 이벤트라 서로 간섭하지 않는다.
- **파생 계산 메모이제이션**: `days`/`weeks`/`earlyLeave`/`buildEventVisibility`/`buildEventSpans` 결과는 `useMemo`로 캐시된다. 입력(`localAssignments`/`localEventList`/`holidays` 등)이 바뀔 때만 재계산되므로, 새 파생값을 추가할 때도 같은 패턴을 따른다.
