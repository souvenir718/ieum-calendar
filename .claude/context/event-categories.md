# 일정 카테고리

`lib/events.js`의 이벤트 타입/아이콘/스타일 상수를 건드릴 때 참조.

- `EVENT_TYPES = ["행사","연차","오전반차","오후반차","생일","중요","기타"]` — DB `event_type` enum과 반드시 일치.
- 새 카테고리 추가 시: enum 마이그레이션(`ALTER TYPE ... ADD VALUE`) + `EVENT_TYPES`/`TYPE_SLUG`/`EVENT_TYPE_ICON` 3곳 + `globals.css` 색상 클래스를 함께 갱신.
