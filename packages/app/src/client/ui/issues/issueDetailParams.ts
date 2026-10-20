/*
 * 상세 dialog가 모든 화면의 주소에서 쓰는 query 이름입니다. graphAddress도 그래프 주소를 만들 때 이 이름으로 상세 query를 지웁니다.
 * IssueDetailRoute가 graphAddress를 import하므로, 두 파일이 함께 쓰는 이 이름은 IssueDetailRoute가 아니라 이 파일에 둡니다.
 */

/** 상세 dialog로 연 이슈 id를 담는 query 이름입니다. 주소를 공유하거나 새로고침해도 같은 이슈가 열립니다. */
export const ISSUE_PARAM = "issue";
/** 상세 dialog 옆 패널에 연 이슈 id를 담는 query 이름입니다. */
export const SIDE_PARAM = "side";
/**
 * 상세 dialog를 열면서 스크롤해 보일 영역을 담는 query 이름입니다.
 * 상세 안에서 옆 패널을 열거나 다른 이슈로 옮기거나 dialog를 닫으면 지우므로, 이 주소로 연 상세에서만 그 영역으로 스크롤합니다.
 */
export const SECTION_PARAM = "section";

/** 상세 dialog를 닫거나 그래프 주소를 만들 때 함께 지우는 query 이름입니다. */
export const ISSUE_DETAIL_PARAMS = [ISSUE_PARAM, SIDE_PARAM, SECTION_PARAM] as const;
