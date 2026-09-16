#!/usr/bin/env python3
"""schedule_calc.py — 복기 예정일(D+1/D+3/D+7)과 최종 연습일 계산.

사용법:
    python scripts/schedule_calc.py [복기일] [다음실전일]
    - 복기일: YYYY-MM-DD 또는 '오늘' (기본: 오늘)
    - 다음실전일: YYYY-MM-DD 또는 '없음' (기본: 없음 → 최종선 없음)
"""

import sys
from datetime import date, timedelta


def parse_date(s: str) -> date:
    s = s.strip()
    if s == "오늘":
        return date.today()
    return date.fromisoformat(s)


def main():
    argv = sys.argv[1:]
    복습일 = parse_date(argv[0]) if argv else date.today()
    실전일 = parse_date(argv[1]) if len(argv) > 1 and argv[1].strip() != "없음" else None

    d1 = 복습일 + timedelta(days=1)
    d3 = 복습일 + timedelta(days=3)
    d7 = 복습일 + timedelta(days=7)

    print(f"D+1 추가 회상: {d1.isoformat()}")
    print(f"D+3: {d3.isoformat()}")
    print(f"D+7 인출 카드 연습: {d7.isoformat()}")

    if 실전일:
        최종 = 실전일 - timedelta(days=2)
        if 최종 < 복습일:
            최종 = 복습일
        print(f"최종 = 실전 2일 전({최종.isoformat()}, 복기일보다 앞이면 복기일)")


if __name__ == "__main__":
    main()
