# CLAUDE.md

이음어린이집의 월별 **당직표 + 일정** 캘린더 웹앱. 원내 구성원이 브라우저로 당직/일정을 확인하고, PIN을 아는 사람만 편집한다. PWA + 인쇄(PDF) 지원.

## 항상 로드되는 규칙 (크로스커팅)

@.claude/rules/stack.md
@.claude/rules/architecture.md
@.claude/rules/conventions.md
@.claude/rules/performance.md

## 필요할 때 참조하는 도메인 지식

작업 대상에 해당하는 파일만 열어서 읽을 것 — 자동 로드되지 않음.

- 당직 슬롯, 조기퇴근 파생, 배정 제약 규칙 → `.claude/context/duty-rules.md`
- 일정 카테고리(EVENT_TYPES) 추가/변경 절차 → `.claude/context/event-categories.md`
- 데이터 모델(테이블 스키마, RLS, 마이그레이션) → `.claude/context/data-model.md`
