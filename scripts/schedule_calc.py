#!/usr/bin/env python3
"""면접 복기일 기준 D+1, D+3, D+7과 선택적 최종 연습일을 계산한다.

사용법:
    python scripts/schedule_calc.py [복기일] [다음실전일]
    - 복기일: YYYY-MM-DD 또는 '오늘' (기본: 오늘)
    - 다음실전일: YYYY-MM-DD 또는 '없음' (기본: 없음 → 최종선 없음)
"""

import sys
from datetime import date, timedelta


def parse_date(value: str) -> date:
    value = value.strip()
    if value == "오늘":
        return date.today()
    return date.fromisoformat(value)


def main() -> None:
    args = sys.argv[1:]
    recall_date = parse_date(args[0]) if args else date.today()
    next_event = None
    if len(args) > 1 and args[1] != "없음":
        next_event = parse_date(args[1])

    print(f"D+1 추가 회상: {(recall_date + timedelta(days=1)).isoformat()}")
    print(f"D+3 카드 연습: {(recall_date + timedelta(days=3)).isoformat()}")
    print(f"D+7 카드 연습: {(recall_date + timedelta(days=7)).isoformat()}")

    if next_event is not None:
        final_practice = max(recall_date, next_event - timedelta(days=2))
        print(f"최종 연습: {final_practice.isoformat()}")


if __name__ == "__main__":
    main()
